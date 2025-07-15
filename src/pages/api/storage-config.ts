import { NextApiRequest, NextApiResponse } from 'next';
import { StorageConfigManager } from '@/lib/storage-config';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = StorageConfigManager.getClientConfig();
    const s3Validation = StorageConfigManager.validateS3Config();
    
    res.status(200).json({
      success: true,
      config,
      storageMode: StorageConfigManager.getStorageModeDisplay(),
      s3Validation,
      environment: process.env.NODE_ENV,
      endpoints: {
        projectUpload: config.endpoints.projectUpload,
        poiUpload: config.endpoints.poiUpload,
        fileServing: config.endpoints.fileServing,
        migration: '/api/migrate-to-s3'
      }
    });
  } catch (error) {
    console.error('Storage config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}