import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK
AWS.config.update({
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'panorama-viewer-storage-dev';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export class S3Service {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    projectId: string,
    fileType: 'images' | 'csv' | 'poi' = 'images'
  ): Promise<UploadResult> {
    const fileExtension = originalName.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `projects/${projectId}/${fileType}/${fileName}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read' as const,
      Metadata: {
        originalName: originalName,
        projectId: projectId,
        fileType: fileType,
      },
    };

    try {
      const result = await s3.upload(uploadParams).promise();
      return {
        key: result.Key,
        url: result.Location,
        bucket: result.Bucket,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    try {
      await s3.deleteObject(deleteParams).promise();
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error}`);
    }
  }

  /**
   * List files in a project directory
   */
  static async listProjectFiles(projectId: string, fileType?: string): Promise<AWS.S3.Object[]> {
    const prefix = fileType 
      ? `projects/${projectId}/${fileType}/`
      : `projects/${projectId}/`;

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    try {
      const result = await s3.listObjectsV2(listParams).promise();
      return result.Contents || [];
    } catch (error) {
      console.error('S3 list error:', error);
      throw new Error(`Failed to list files from S3: ${error}`);
    }
  }

  /**
   * Get a signed URL for file access
   */
  static async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expires,
    };

    try {
      return await s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  /**
   * Delete all files in a project directory
   */
  static async deleteProjectFiles(projectId: string): Promise<void> {
    try {
      // List all objects in the project directory
      const objects = await this.listProjectFiles(projectId);
      
      if (objects.length === 0) {
        return;
      }

      // Prepare delete parameters
      const deleteParams = {
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: objects.map(obj => ({ Key: obj.Key! })),
          Quiet: false,
        },
      };

      await s3.deleteObjects(deleteParams).promise();
    } catch (error) {
      console.error('S3 bulk delete error:', error);
      throw new Error(`Failed to delete project files from S3: ${error}`);
    }
  }

  /**
   * Copy file within S3 bucket
   */
  static async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const copyParams = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
      ACL: 'public-read' as const,
    };

    try {
      await s3.copyObject(copyParams).promise();
    } catch (error) {
      console.error('S3 copy error:', error);
      throw new Error(`Failed to copy file in S3: ${error}`);
    }
  }

  /**
   * Check if file exists in S3
   */
  static async fileExists(key: string): Promise<boolean> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    try {
      await s3.headObject(params).promise();
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

export default S3Service;