import { v4 as uuidv4 } from 'uuid';
import { DbService } from './dbService';

// Simulating in-memory database
let projects = [];
let folders = [];

export class ProjectService {
  // Projects
  static async createProject(name, description, userId) {
    try {
      const project = await DbService.createProject(name, description);
      console.log('Projeto criado:', project);
      return project;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  }

  static async getProjects() {
    try {
      const projects = await DbService.getProjects();
      return projects;
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      throw error;
    }
  }

  static async getProject(id) {
    try {
      const project = await DbService.getProject(id);
      return project;
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
      throw error;
    }
  }

  static async updateProject(id, data) {
    const projectIndex = projects.findIndex(p => p.id === id);
    if (projectIndex === -1) return null;

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...data,
      updatedAt: new Date()
    };

    return projects[projectIndex];
  }

  static async deleteFoldersByProjectId(projectId) {
    try {
      const result = await DbService.query(
        'DELETE FROM folders WHERE project_id = ?',
        [projectId]
      );
      return true;
    } catch (error) {
      console.error('Erro ao deletar pastas do projeto:', error);
      return false;
    }
  }

  static async deleteProject(id) {
    try {
      console.log('ProjectService - Iniciando deleção do projeto:', id);
      
      // Deleta o projeto usando o DbService
      await DbService.deleteProject(id);
      
      console.log('ProjectService - Projeto deletado com sucesso');
      return true;
    } catch (error) {
      console.error('ProjectService - Erro ao deletar projeto:', error);
      return false;
    }
  }

  // Folders
  static async createFolder(data) {
    const folder = {
      id: uuidv4(),
      name: data.name,
      projectId: data.projectId,
      parentId: data.parentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    folders.push(folder);
    return folder;
  }

  static async getFolders(projectId) {
    try {
      const folders = await DbService.getFolders(projectId);
      return folders;
    } catch (error) {
      console.error('Erro ao buscar pastas:', error);
      throw error;
    }
  }

  static async getFolder(id) {
    const folder = folders.find(f => f.id === id);
    if (!folder) return null;

    // Load subfolders
    folder.subFolders = folders.filter(f => f.parentId === id);
    return folder;
  }

  static async updateFolder(id, data) {
    const folderIndex = folders.findIndex(f => f.id === id);
    if (folderIndex === -1) return null;

    folders[folderIndex] = {
      ...folders[folderIndex],
      ...data,
      updatedAt: new Date()
    };

    return folders[folderIndex];
  }

  static async deleteFolder(id) {
    const folderIndex = folders.findIndex(f => f.id === id);
    if (folderIndex === -1) return false;

    // Remove folder and all its subfolders
    const deleteFolderAndChildren = (folderId) => {
      folders = folders.filter(f => f.id !== folderId);
      const childFolders = folders.filter(f => f.parentId === folderId);
      childFolders.forEach(f => deleteFolderAndChildren(f.id));
    };

    deleteFolderAndChildren(id);
    return true;
  }
} 