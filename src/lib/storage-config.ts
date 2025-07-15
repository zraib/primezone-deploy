/**
 * Storage configuration utility
 * Helps switch between local file storage and S3 storage
 */

export interface StorageConfig {
  mode: 'local' | 's3';
  s3Config?: {
    bucket: string;
    region: string;
    customDomain?: string;
  };
  localConfig?: {
    publicPath: string;
    uploadPath: string;
  };
}

export class StorageConfigManager {
  private static config: StorageConfig;

  /**
   * Initialize storage configuration
   */
  static initialize(): StorageConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const hasS3Config = !!(process.env.AWS_S3_BUCKET_NAME && process.env.AWS_REGION);
    
    // Use S3 in production if configured, otherwise use local storage
    const mode: 'local' | 's3' = (isProduction && hasS3Config) ? 's3' : 'local';
    
    this.config = {
      mode,
      s3Config: hasS3Config ? {
        bucket: process.env.AWS_S3_BUCKET_NAME!,
        region: process.env.AWS_REGION!,
        customDomain: process.env.NEXT_PUBLIC_S3_CUSTOM_DOMAIN,
      } : undefined,
      localConfig: {
        publicPath: '/api/files',
        uploadPath: 'public'
      }
    };

    return this.config;
  }

  /**
   * Get current storage configuration
   */
  static getConfig(): StorageConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  /**
   * Check if using S3 storage
   */
  static isS3Mode(): boolean {
    return this.getConfig().mode === 's3';
  }

  /**
   * Check if using local storage
   */
  static isLocalMode(): boolean {
    return this.getConfig().mode === 'local';
  }

  /**
   * Get the appropriate upload API endpoint
   */
  static getUploadEndpoint(type: 'project' | 'poi'): string {
    const config = this.getConfig();
    
    if (config.mode === 's3') {
      return type === 'project' 
        ? '/api/projects/[projectId]/upload-s3'
        : '/api/poi/upload-s3';
    } else {
      return type === 'project'
        ? '/api/projects/[projectId]/upload'
        : '/api/poi/upload';
    }
  }

  /**
   * Get the appropriate file serving endpoint
   */
  static getFileEndpoint(): string {
    const config = this.getConfig();
    
    if (config.mode === 's3') {
      return '/api/files/s3';
    } else {
      return '/api/files';
    }
  }

  /**
   * Generate file URL based on storage mode
   */
  static generateFileUrl(projectId: string, fileType: string, fileName: string): string {
    const config = this.getConfig();
    
    if (config.mode === 's3' && config.s3Config) {
      if (config.s3Config.customDomain) {
        return `https://${config.s3Config.customDomain}/projects/${projectId}/${fileType}/${fileName}`;
      } else {
        return `https://${config.s3Config.bucket}.s3.${config.s3Config.region}.amazonaws.com/projects/${projectId}/${fileType}/${fileName}`;
      }
    } else {
      return `/api/files/${projectId}/${fileType}/${fileName}`;
    }
  }

  /**
   * Generate S3 key for file
   */
  static generateS3Key(projectId: string, fileType: string, fileName: string): string {
    return `projects/${projectId}/${fileType}/${fileName}`;
  }

  /**
   * Get storage mode display name
   */
  static getStorageModeDisplay(): string {
    const config = this.getConfig();
    return config.mode === 's3' ? 'Amazon S3' : 'Local Storage';
  }

  /**
   * Get storage configuration for client-side
   */
  static getClientConfig(): {
    mode: 'local' | 's3';
    endpoints: {
      projectUpload: string;
      poiUpload: string;
      fileServing: string;
    };
    s3Config?: {
      bucket: string;
      region: string;
      customDomain?: string;
    };
  } {
    const config = this.getConfig();
    
    return {
      mode: config.mode,
      endpoints: {
        projectUpload: this.getUploadEndpoint('project'),
        poiUpload: this.getUploadEndpoint('poi'),
        fileServing: this.getFileEndpoint()
      },
      s3Config: config.s3Config
    };
  }

  /**
   * Validate S3 configuration
   */
  static validateS3Config(): {
    valid: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    
    if (!process.env.AWS_S3_BUCKET_NAME) missing.push('AWS_S3_BUCKET_NAME');
    if (!process.env.AWS_REGION) missing.push('AWS_REGION');
    if (!process.env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
    if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Force storage mode (for testing)
   */
  static forceMode(mode: 'local' | 's3'): void {
    if (this.config) {
      this.config.mode = mode;
    }
  }
}

export default StorageConfigManager;