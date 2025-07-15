import { NextApiRequest, NextApiResponse } from 'next';
import { S3Migration } from '@/lib/s3-migration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, cleanup } = req.body;

    if (!projectId) {
      // Get all local projects that can be migrated
      const localProjects = S3Migration.getLocalProjects();
      return res.status(200).json({
        success: true,
        localProjects,
        message: 'Available projects for migration'
      });
    }

    // Migrate specific project
    console.log(`Starting migration for project: ${projectId}`);
    const result = await S3Migration.migrateProjectToS3(projectId);

    if (result.success && cleanup) {
      // Clean up local files after successful migration
      await S3Migration.cleanupLocalFiles(projectId);
    }

    res.status(200).json({
      success: result.success,
      projectId,
      migratedFiles: result.migratedFiles,
      errors: result.errors,
      totalMigrated: result.migratedFiles.length,
      cleanedUp: result.success && cleanup
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}