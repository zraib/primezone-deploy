import fs from 'fs';
import path from 'path';
import { S3Service } from './aws-s3';

/**
 * Utility class for migrating existing local files to S3
 */
export class S3Migration {
  /**
   * Migrate all files from a local project directory to S3
   */
  static async migrateProjectToS3(projectId: string): Promise<{
    success: boolean;
    migratedFiles: string[];
    errors: string[];
  }> {
    const migratedFiles: string[] = [];
    const errors: string[] = [];

    try {
      const publicDir = path.join(process.cwd(), 'public');
      const projectDir = path.join(publicDir, projectId);

      if (!fs.existsSync(projectDir)) {
        return {
          success: false,
          migratedFiles: [],
          errors: [`Project directory not found: ${projectDir}`]
        };
      }

      // Migrate images
      const imagesDir = path.join(projectDir, 'images');
      if (fs.existsSync(imagesDir)) {
        const imageFiles = fs.readdirSync(imagesDir);
        for (const fileName of imageFiles) {
          try {
            const filePath = path.join(imagesDir, fileName);
            const buffer = fs.readFileSync(filePath);
            const stats = fs.statSync(filePath);
            
            // Determine MIME type based on extension
            const ext = path.extname(fileName).toLowerCase();
            const mimeTypes: { [key: string]: string } = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp'
            };
            const mimeType = mimeTypes[ext] || 'image/jpeg';

            await S3Service.uploadFile(buffer, fileName, mimeType, projectId, 'images');
            migratedFiles.push(`images/${fileName}`);
          } catch (error) {
            errors.push(`Failed to migrate image ${fileName}: ${error}`);
          }
        }
      }

      // Migrate CSV files
      const dataDir = path.join(projectDir, 'data');
      if (fs.existsSync(dataDir)) {
        const csvFile = path.join(dataDir, 'pano-poses.csv');
        if (fs.existsSync(csvFile)) {
          try {
            const buffer = fs.readFileSync(csvFile);
            await S3Service.uploadFile(buffer, 'pano-poses.csv', 'text/csv', projectId, 'csv');
            migratedFiles.push('data/pano-poses.csv');
          } catch (error) {
            errors.push(`Failed to migrate CSV file: ${error}`);
          }
        }

        // Migrate POI files
        const poiDir = path.join(dataDir, 'poi');
        if (fs.existsSync(poiDir)) {
          await this.migrateDirectoryRecursively(poiDir, projectId, 'poi', migratedFiles, errors);
        }
      }

      return {
        success: errors.length === 0,
        migratedFiles,
        errors
      };

    } catch (error) {
      return {
        success: false,
        migratedFiles,
        errors: [`Migration failed: ${error}`]
      };
    }
  }

  /**
   * Recursively migrate files from a directory
   */
  private static async migrateDirectoryRecursively(
    dirPath: string,
    projectId: string,
    fileType: 'images' | 'csv' | 'poi',
    migratedFiles: string[],
    errors: string[]
  ): Promise<void> {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        await this.migrateDirectoryRecursively(itemPath, projectId, fileType, migratedFiles, errors);
      } else {
        try {
          const buffer = fs.readFileSync(itemPath);
          
          // Determine MIME type
          const ext = path.extname(item).toLowerCase();
          const mimeTypes: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.json': 'application/json',
            '.txt': 'text/plain'
          };
          const mimeType = mimeTypes[ext] || 'application/octet-stream';

          await S3Service.uploadFile(buffer, item, mimeType, projectId, fileType);
          migratedFiles.push(`${fileType}/${item}`);
        } catch (error) {
          errors.push(`Failed to migrate ${item}: ${error}`);
        }
      }
    }
  }

  /**
   * Get all local projects that can be migrated
   */
  static getLocalProjects(): string[] {
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      return [];
    }

    const items = fs.readdirSync(publicDir);
    const projects: string[] = [];

    for (const item of items) {
      const itemPath = path.join(publicDir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && item !== 'assets') {
        // Check if it looks like a project directory
        const imagesDir = path.join(itemPath, 'images');
        const dataDir = path.join(itemPath, 'data');
        
        if (fs.existsSync(imagesDir) || fs.existsSync(dataDir)) {
          projects.push(item);
        }
      }
    }

    return projects;
  }

  /**
   * Clean up local files after successful migration
   */
  static async cleanupLocalFiles(projectId: string): Promise<void> {
    const publicDir = path.join(process.cwd(), 'public');
    const projectDir = path.join(publicDir, projectId);

    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  }
}

export default S3Migration;