import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { S3Service } from '@/lib/aws-s3';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'application/pdf',
          'video/mp4',
          'video/webm'
        ].includes(mimetype || '');
      }
    });

    const [fields, files] = await form.parse(req);
    
    const projectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Handle single file upload (backward compatibility)
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filename = Array.isArray(fields.filename) ? fields.filename[0] : fields.filename;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!filename) {
      return res.status(400).json({ error: 'No filename provided' });
    }

    // Check if file already exists in S3
    const existingFiles = await S3Service.listProjectFiles(projectId, 'poi');
    const fileExists = existingFiles.some(existingFile => {
      const existingFileName = existingFile.Key?.split('/').pop();
      return existingFileName === filename;
    });

    if (fileExists) {
      // Remove the temporary file
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(409).json({ error: 'File already exists' });
    }

    // Read file buffer and upload to S3
    const buffer = fs.readFileSync(file.filepath);
    
    try {
      const result = await S3Service.uploadFile(
        buffer,
        filename,
        file.mimetype || 'application/octet-stream',
        projectId,
        'poi'
      );

      // Clean up temporary file
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }

      res.status(200).json({
        success: true,
        filename,
        size: file.size,
        mimetype: file.mimetype,
        s3Key: result.key,
        s3Url: result.url,
        bucket: result.bucket
      });
    } catch (s3Error) {
      // Clean up temporary file on S3 error
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      throw s3Error;
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      if (error.message.includes('filter')) {
        return res.status(415).json({ error: 'Unsupported file type. Please upload images (JPG, PNG, GIF), PDFs, or videos (MP4, WebM).' });
      }
    }
    
    // Check for formidable error codes
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 1003) {
        return res.status(415).json({ 
          error: 'Unsupported file type. Please upload images (JPG, PNG, GIF), PDFs, or videos (MP4, WebM).',
          details: 'The file type was not recognized as a valid media file.'
        });
      }
      if (error.code === 1009) {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}