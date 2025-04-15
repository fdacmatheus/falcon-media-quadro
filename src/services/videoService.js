import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { DbService } from './dbService';

// Diretório para armazenar os vídeos
const VIDEOS_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos');

// Garantir que o diretório existe
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

export class VideoService {
  static async getVideos(projectId, folderId) {
    return await DbService.getVideos(projectId, folderId);
  }

  static async getVideo(projectId, folderId, videoId) {
    return await DbService.getVideo(videoId);
  }

  static async getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        // Set timeout to prevent hanging if metadata doesn't load
        const timeout = setTimeout(() => {
          window.URL.revokeObjectURL(video.src);
          resolve(0); // Default duration if metadata cannot be extracted
          console.warn('Video metadata load timeout');
        }, 5000);
        
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        
        video.onerror = (e) => {
          clearTimeout(timeout);
          window.URL.revokeObjectURL(video.src);
          console.error('Error loading video metadata:', e);
          reject(new Error('Error loading video metadata'));
        };
        
        video.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('Error creating video element:', error);
        resolve(0); // Default duration on error
      }
    });
  }

  static async uploadVideo(projectId, folderId, file) {
    try {
      // Validar o arquivo
      if (!file || !file.type.startsWith('video/')) {
        throw new Error('Arquivo inválido. Apenas vídeos são permitidos.');
      }

      // Validar tamanho do arquivo (máximo 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB em bytes
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Tamanho máximo permitido: 500MB');
      }

      // Gerar nome único para o arquivo
      const fileExtension = path.extname(file.name);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(VIDEOS_DIR, fileName);

      // Salvar o arquivo
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Extrair duração do vídeo
      let duration = null;
      try {
        duration = await this.getVideoDuration(file);
      } catch (error) {
        console.error('Erro ao extrair duração do vídeo:', error);
      }

      // Salvar no banco de dados
      const video = await DbService.createVideo(
        projectId,
        folderId,
        file.name,
        `/uploads/videos/${fileName}`,
        file.size,
        file.type,
        duration
      );

      return video;
    } catch (error) {
      console.error('Erro ao fazer upload do vídeo:', error);
      throw error;
    }
  }

  static async updateVideo(projectId, folderId, videoId, data) {
    return await DbService.updateVideo(
      videoId,
      data.name,
      data.duration,
      data.thumbnailPath
    );
  }

  static async deleteVideo(projectId, folderId, videoId) {
    const video = await DbService.getVideo(videoId);
    if (video) {
      // Deletar o arquivo físico
      const filePath = path.join(VIDEOS_DIR, path.basename(video.file_path));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Deletar do banco de dados
      await DbService.deleteVideo(videoId);
    }
  }

  static async getComments(projectId, folderId, videoId, versionId = null) {
    console.log('VideoService: getComments chamado com:', {
      projectId,
      folderId,
      videoId,
      versionId: versionId || 'não especificado'
    });
    return await DbService.getComments(projectId, folderId, videoId, versionId);
  }

  static async addComment(projectId, folderId, videoId, comment) {
    return await DbService.createComment(
      projectId,
      folderId,
      videoId,
      comment.parentId,
      comment.author,
      comment.email,
      comment.text,
      comment.videoTime,
      comment.drawing
    );
  }

  static async updateComment(projectId, folderId, videoId, commentId, data) {
    return await DbService.updateComment(
      commentId,
      data.text,
      data.drawing,
      data.resolved
    );
  }

  static async deleteComment(projectId, folderId, videoId, commentId) {
    return await DbService.deleteComment(commentId);
  }

  static async toggleCommentLike(projectId, folderId, videoId, commentId, userEmail) {
    return await DbService.toggleCommentLike(commentId, userEmail);
  }
} 