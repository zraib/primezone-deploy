import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
  firstSceneId?: string;
  poiCount: number;
  floorCount: number;
}

const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const getProjectInfo = async (projectId: string): Promise<Project | null> => {
  const projectPath = path.join(process.cwd(), 'public', projectId);
  
  if (!fs.existsSync(projectPath)) {
    return null;
  }
  
  try {
    const stats = await stat(projectPath);
    const configPath = path.join(projectPath, 'config.json');
    const hasConfig = fs.existsSync(configPath);
    
    let sceneCount = 0;
    let firstSceneId: string | undefined;
    let poiCount = 0;
    let floorCount = 0;
    
    if (hasConfig) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        sceneCount = configData.scenes ? configData.scenes.length : 0;
        firstSceneId = configData.scenes && configData.scenes.length > 0 ? configData.scenes[0].id : undefined;
        
        // Calculate floor count from unique floor values
        if (configData.scenes) {
          const floors = new Set(configData.scenes.map((scene: any) => scene.floor).filter((floor: any) => floor !== undefined));
          floorCount = floors.size;
        }
      } catch {
        sceneCount = 0;
        firstSceneId = undefined;
        floorCount = 0;
      }
    }
    
    // Count POIs
    const poiDataPath = path.join(projectPath, 'data', 'poi', 'poi-data.json');
    if (fs.existsSync(poiDataPath)) {
      try {
        const poiData = JSON.parse(fs.readFileSync(poiDataPath, 'utf8'));
        poiCount = Array.isArray(poiData) ? poiData.length : 0;
      } catch {
        poiCount = 0;
      }
    }
    
    return {
      id: projectId,
      name: projectId,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      sceneCount,
      hasConfig,
      firstSceneId,
      poiCount,
      floorCount
    };
  } catch (error) {
    console.error(`Error getting project info for ${projectId}:`, error);
    return null;
  }
};

const deleteProjectRecursively = async (dirPath: string): Promise<void> => {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const items = await readdir(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const itemStat = await stat(itemPath);
    
    if (itemStat.isDirectory()) {
      await deleteProjectRecursively(itemPath);
    } else {
      await unlink(itemPath);
    }
  }
  
  await rmdir(dirPath);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  
  try {
    switch (method) {
      case 'GET':
        // List all projects
        const publicDir = path.join(process.cwd(), 'public');
        ensureDirectoryExists(publicDir);
        
        const items = await readdir(publicDir);
        const projects: Project[] = [];
        
        for (const item of items) {
          const itemPath = path.join(publicDir, item);
          const itemStat = await stat(itemPath);
          
          // Skip files and system directories
          if (!itemStat.isDirectory() || item.startsWith('.') || 
              ['assets', 'images', 'data', 'csv'].includes(item)) {
            continue;
          }
          
          const projectInfo = await getProjectInfo(item);
          if (projectInfo) {
            projects.push(projectInfo);
          }
        }
        
        // Sort by updated date (newest first)
        projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        res.status(200).json({ projects });
        break;
        
      case 'POST':
        // Create a new project
        const { projectName } = req.body;
        
        if (!projectName || typeof projectName !== 'string') {
          return res.status(400).json({ error: 'Project name is required' });
        }
        
        // Sanitize project name
        const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        
        if (!sanitizedName) {
          return res.status(400).json({ error: 'Invalid project name' });
        }
        
        const newProjectPath = path.join(process.cwd(), 'public', sanitizedName);
        
        if (fs.existsSync(newProjectPath)) {
          return res.status(409).json({ error: 'Project already exists' });
        }
        
        // Create project directories
        ensureDirectoryExists(newProjectPath);
        ensureDirectoryExists(path.join(newProjectPath, 'images'));
        ensureDirectoryExists(path.join(newProjectPath, 'data'));
        
        const newProject = await getProjectInfo(sanitizedName);
        
        res.status(201).json({ project: newProject });
        break;
        
      case 'DELETE':
        // Delete a project
        const { projectId } = req.query;
        
        if (!projectId || typeof projectId !== 'string') {
          return res.status(400).json({ error: 'Project ID is required' });
        }
        
        const projectToDelete = path.join(process.cwd(), 'public', projectId);
        
        if (!fs.existsSync(projectToDelete)) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        await deleteProjectRecursively(projectToDelete);
        
        res.status(200).json({ message: 'Project deleted successfully' });
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Projects API error:', {
      message: error.message,
      stack: error.stack,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}