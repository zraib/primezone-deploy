import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { S3Service } from '@/lib/aws-s3';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    externalResolver: true,
  },
};

const cleanupTempFiles = async (tempFiles: (File | File[])[]) => {
  for (const fileOrArray of tempFiles) {
    const files = Array.isArray(fileOrArray) ? fileOrArray : [fileOrArray];
    for (const file of files) {
      if (file && file.filepath && fs.existsSync(file.filepath)) {
        try {
          await fs.promises.unlink(file.filepath);
          console.log(`Cleaned up temp file: ${file.filepath}`);
        } catch (error) {
          console.warn(`Failed to cleanup temp file ${file.filepath}:`, error);
        }
      }
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  let tempFilesToCleanup: (File | File[])[] = [];

  try {
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const form = new IncomingForm({
      maxFields: 1000,
      allowEmptyFiles: false,
      minFileSize: 1,
      uploadDir: tmpDir,
      keepExtensions: true,
      multiples: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB per file
      maxTotalFileSize: 500 * 1024 * 1024, // 500MB total
      maxFieldsSize: 20 * 1024 * 1024, // 20MB for fields
    });
    
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const deleteAll = fields.deleteAll && fields.deleteAll[0] === 'true';
    const allowOverwrite = fields.overwrite && fields.overwrite[0] === 'true';

    // If deleteAll is requested, delete all project files from S3
    if (deleteAll) {
      await S3Service.deleteProjectFiles(projectId);
    }

    const uploadedFiles: any = {
      images: [],
      csv: null,
      poi: null
    };

    // Handle CSV file
    const csvFile = Array.isArray(files.csv) ? files.csv[0] : files.csv;
    const existingCsv = fields.existing_csv ? fields.existing_csv[0] : null;

    if (csvFile) {
      tempFilesToCleanup.push(csvFile);
      const buffer = fs.readFileSync(csvFile.filepath);
      const result = await S3Service.uploadFile(
        buffer,
        csvFile.originalFilename || 'pano-poses.csv',
        csvFile.mimetype || 'text/csv',
        projectId,
        'csv'
      );
      uploadedFiles.csv = {
        key: result.key,
        url: result.url,
        originalName: csvFile.originalFilename
      };
    } else if (!existingCsv) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    // Handle image files
    const imageFiles = Array.isArray(files.images) ? files.images : (files.images ? [files.images] : []);
    const existingImages = fields.existing_images ? (Array.isArray(fields.existing_images) ? fields.existing_images : [fields.existing_images]) : [];

    if (imageFiles.length === 0 && existingImages.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }

    if (imageFiles.length > 0) {
      tempFilesToCleanup.push(files.images);
    }

    // Check for duplicate file names only if overwrite is not allowed
    if (!allowOverwrite && imageFiles.length > 0) {
      const existingProjectFiles = await S3Service.listProjectFiles(projectId, 'images');
      const existingFileNames = existingProjectFiles.map(file => {
        const fileName = file.Key?.split('/').pop();
        return fileName;
      });
      
      const duplicateFiles: string[] = [];
      
      for (const imageFile of imageFiles) {
        if (imageFile && imageFile.originalFilename) {
          if (existingFileNames.includes(imageFile.originalFilename)) {
            duplicateFiles.push(imageFile.originalFilename);
          }
        }
      }

      if (duplicateFiles.length > 0) {
        await cleanupTempFiles(tempFilesToCleanup);
        return res.status(409).json({ 
          error: 'Duplicate file names detected',
          duplicates: duplicateFiles,
          message: `The following files already exist: ${duplicateFiles.join(', ')}. Please rename them or choose different files.`
        });
      }
    }

    // Upload image files to S3
    for (const imageFile of imageFiles) {
      if (imageFile && imageFile.originalFilename) {
        const buffer = fs.readFileSync(imageFile.filepath);
        const result = await S3Service.uploadFile(
          buffer,
          imageFile.originalFilename,
          imageFile.mimetype || 'image/jpeg',
          projectId,
          'images'
        );
        uploadedFiles.images.push({
          key: result.key,
          url: result.url,
          originalName: imageFile.originalFilename
        });
      }
    }

    // Handle POI file
    const poiFile = Array.isArray(files.poiFile) ? files.poiFile[0] : files.poiFile;
    if (poiFile) {
      tempFilesToCleanup.push(poiFile);
      
      const originalFilename = poiFile.originalFilename || 'poi-data.json';
      
      // Check if it's a ZIP file that needs extraction
      if (originalFilename.toLowerCase().endsWith('.zip')) {
        console.log('Processing ZIP file for POI data');
        const AdmZip = require('adm-zip');
        
        try {
          const zip = new AdmZip(poiFile.filepath);
          const zipEntries = zip.getEntries();
          
          for (const entry of zipEntries) {
            if (!entry.isDirectory) {
              const entryBuffer = entry.getData();
              const entryName = entry.entryName;
              
              // Determine file type based on extension
              let fileType: 'poi' | 'images' = 'poi';
              const ext = path.extname(entryName).toLowerCase();
              if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                fileType = 'images';
              }
              
              const result = await S3Service.uploadFile(
                entryBuffer,
                entryName,
                entry.header.attr || 'application/octet-stream',
                projectId,
                fileType
              );
              
              if (fileType === 'poi') {
                uploadedFiles.poi = {
                  key: result.key,
                  url: result.url,
                  originalName: entryName
                };
              } else {
                uploadedFiles.images.push({
                  key: result.key,
                  url: result.url,
                  originalName: entryName
                });
              }
            }
          }
        } catch (zipError) {
          console.error('ZIP extraction error:', zipError);
          throw new Error(`Failed to extract ZIP file: ${zipError}`);
        }
      } else {
        // Handle single POI file
        const buffer = fs.readFileSync(poiFile.filepath);
        const result = await S3Service.uploadFile(
          buffer,
          originalFilename,
          poiFile.mimetype || 'application/json',
          projectId,
          'poi'
        );
        uploadedFiles.poi = {
          key: result.key,
          url: result.url,
          originalName: originalFilename
        };
      }
    }

    // Clean up temporary files
    await cleanupTempFiles(tempFilesToCleanup);

    // Generate Marzipano configuration (this would need to be adapted for S3 URLs)
    // For now, we'll skip this step and handle it separately
    
    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully to S3',
      projectId,
      uploadedFiles,
      totalImages: uploadedFiles.images.length,
      s3Bucket: process.env.AWS_S3_BUCKET_NAME
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up temporary files on error
    await cleanupTempFiles(tempFilesToCleanup);
    
    res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}