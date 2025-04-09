import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../config/database';

export class DbService {
  // Projetos
  static async createProject(name, description) {
    const id = uuidv4();
    await query(
      'INSERT INTO projects (id, name, description) VALUES (?, ?, ?)',
      [id, name, description]
    );
    const result = await query('SELECT * FROM projects WHERE id = ?', [id]);
    return result.rows[0];
  }

  static async getProjects() {
    const result = await query('SELECT * FROM projects ORDER BY created_at DESC');
    return result.rows;
  }

  static async getProject(id) {
    try {
      console.log('DbService - Buscando projeto:', id);
      const result = await query('SELECT * FROM projects WHERE id = ?', [id]);
      console.log('DbService - Resultado:', result);
      return result.rows[0] || null;
    } catch (error) {
      console.error('DbService - Erro ao buscar projeto:', error);
      throw error;
    }
  }

  static async updateProject(id, name, description) {
    await query(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    return await this.getProject(id);
  }

  static async deleteProject(id) {
    try {
      console.log('DbService - Iniciando deleção do projeto:', id);
      
      // Primeiro deleta os comentários
      await query('DELETE FROM comments WHERE project_id = ?', [id]);
      
      // Depois deleta os vídeos
      await query('DELETE FROM videos WHERE project_id = ?', [id]);
      
      // Depois deleta as pastas
      await query('DELETE FROM folders WHERE project_id = ?', [id]);
      
      // Por fim deleta o projeto
      const result = await query('DELETE FROM projects WHERE id = ?', [id]);
      
      console.log('DbService - Resultado da deleção:', result);
      return true;
    } catch (error) {
      console.error('DbService - Erro ao deletar projeto:', error);
      throw error;
    }
  }

  // Pastas
  static async createFolder(projectId, name, parentId = null) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await query(
        'INSERT INTO folders (id, project_id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, projectId, name, parentId, now, now]
      );

      const result = await query('SELECT * FROM folders WHERE id = ?', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('DbService - Erro ao criar pasta:', error);
      throw error;
    }
  }

  static async getFolders(projectId) {
    try {
      console.log('DbService - Buscando pastas do projeto:', projectId);
      const result = await query(
        'SELECT * FROM folders WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      console.log('DbService - Pastas encontradas:', result.rows);
      return result.rows;
    } catch (error) {
      console.error('DbService - Erro ao buscar pastas:', error);
      throw error;
    }
  }

  static async getFolder(id) {
    try {
      const result = await query(
        'SELECT * FROM folders WHERE id = ?',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('DbService - Erro ao buscar pasta:', error);
      throw error;
    }
  }

  static async updateFolder(id, name) {
    await query(
      'UPDATE folders SET name = ? WHERE id = ?',
      [name, id]
    );
    return await this.getFolder(id);
  }

  static async deleteFolder(id) {
    await query('DELETE FROM folders WHERE id = ?', [id]);
  }

  // Vídeos
  static async createVideo(projectId, folderId, name, filePath, fileSize, fileType, duration) {
    try {
      const id = uuidv4();
      
      await query(
        'INSERT INTO videos (id, project_id, folder_id, name, file_path, file_size, file_type, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, folderId, name, filePath, fileSize, fileType, duration]
      );

      // Buscar o vídeo recém inserido
      const result = await query('SELECT * FROM videos WHERE id = ?', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar vídeo:', error);
      throw error;
    }
  }

  static async getVideos(projectId, folderId) {
    try {
      // Get all videos in the folder, excluding hidden ones
      const videosResult = await query(
        `SELECT * FROM videos 
         WHERE project_id = ? AND folder_id = ? 
         AND (is_hidden IS NULL OR is_hidden = 0)
         ORDER BY created_at DESC`,
        [projectId, folderId]
      );
      
      // Get all versions for all videos in this folder in a single query
      const versionsResult = await query(
        `SELECT * FROM video_versions 
         WHERE project_id = ? AND folder_id = ? 
         ORDER BY created_at DESC`,
        [projectId, folderId]
      );
      
      // Map versions to their respective videos
      const videos = videosResult.rows.map(video => {
        const videoVersions = versionsResult.rows.filter(
          version => version.video_id === video.id
        );
        
        return {
          ...video,
          versions: videoVersions,
          hasVersions: videoVersions.length > 0
        };
      });
      
      return videos;
    } catch (error) {
      console.error('Error getting videos with versions:', error);
      throw error;
    }
  }

  static async getVideo(id) {
    const result = await query('SELECT * FROM videos WHERE id = ?', [id]);
    return result.rows[0];
  }

  static async updateVideo(id, name, duration, thumbnailPath) {
    await query(
      'UPDATE videos SET name = ?, duration = ?, thumbnail_path = ? WHERE id = ?',
      [name, duration, thumbnailPath, id]
    );
    return await this.getVideo(id);
  }

  static async deleteVideo(id) {
    try {
      console.log('DbService - Iniciando deleção do vídeo:', id);
      
      // Primeiro deleta os comentários relacionados
      await query('DELETE FROM comments WHERE video_id = ?', [id]);
      
      // Depois deleta o vídeo
      const result = await query('DELETE FROM videos WHERE id = ?', [id]);
      
      console.log('DbService - Resultado da deleção:', result);
      return true;
    } catch (error) {
      console.error('DbService - Erro ao deletar vídeo:', error);
      throw error;
    }
  }

  static async updateVideoStatus(id, status) {
    try {
      await query(
        'UPDATE videos SET video_status = ? WHERE id = ?',
        [status, id]
      );
      return await this.getVideo(id);
    } catch (error) {
      console.error('Erro ao atualizar status do vídeo:', error);
      throw error;
    }
  }

  static async hideVideo(id) {
    try {
      console.log('Hiding video with ID:', id);
      
      // Add a hidden flag to the video
      await query(
        'UPDATE videos SET is_hidden = 1 WHERE id = ?',
        [id]
      );
      
      return true;
    } catch (error) {
      console.error('Error hiding video:', error);
      throw error;
    }
  }

  static async createVideoVersion(projectId, folderId, videoId, sourceVideoId, filePath, fileSize, fileType, duration) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      console.log('DbService - Criando versão de vídeo:', {
        id,
        projectId,
        folderId,
        videoId,
        sourceVideoId,
        filePath,
        fileSize,
        fileType,
        duration
      });
      
      const sql = `INSERT INTO video_versions (
        id, project_id, folder_id, video_id, source_video_id,
        file_path, file_size, file_type, duration,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        id,
        projectId,
        folderId,
        videoId,
        sourceVideoId,
        filePath,
        fileSize,
        fileType,
        duration || 0,
        now,
        now
      ];
      
      console.log('DbService - SQL:', sql);
      console.log('DbService - Parâmetros:', params);
      
      await query(sql, params);

      console.log('DbService - Versão inserida, buscando resultados...');
      const result = await query('SELECT * FROM video_versions WHERE id = ?', [id]);
      console.log('DbService - Resultado da busca:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar versão do vídeo:', error);
      throw error;
    }
  }

  static async getVideoVersions(videoId) {
    try {
      const result = await query(
        'SELECT * FROM video_versions WHERE video_id = ? ORDER BY created_at DESC',
        [videoId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar versões do vídeo:', error);
      throw error;
    }
  }

  // Comentários
  static async createComment(projectId, folderId, videoId, parentId, userName, userEmail, text, videoTime, drawingData) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      // Se for uma resposta (reply), buscar o comentário pai para validação
      if (parentId) {
        const parentComment = await this.getComment(parentId);
        if (!parentComment) {
          throw new Error('Comentário pai não encontrado');
        }
        // Usar os IDs do comentário pai para garantir consistência
        projectId = parentComment.project_id;
        folderId = parentComment.folder_id;
        videoId = parentComment.video_id;
      }

      // Processar os dados de desenho, que podem estar no formato novo (com timestamp)
      // ou antigo (apenas a string de dados da imagem)
      let processedDrawingData = drawingData;
      
      // Se tivermos dados de desenho e for uma string, verificar se é um JSON válido
      if (typeof drawingData === 'string') {
        try {
          // Tenta fazer parse para ver se já é um JSON
          const parsed = JSON.parse(drawingData);
          processedDrawingData = drawingData; // Já é um JSON string, manter como está
        } catch (e) {
          // Se não for um JSON válido, é provavelmente o formato antigo (apenas imagem)
          // Criar um objeto com formato novo
          processedDrawingData = JSON.stringify({
            imageData: drawingData,
            timestamp: videoTime
          });
        }
      } else if (drawingData && typeof drawingData === 'object') {
        // Se já for um objeto, converter para JSON string
        processedDrawingData = JSON.stringify(drawingData);
      }

      await query(
        `INSERT INTO comments (
          id, project_id, folder_id, video_id, parent_id,
          user_name, user_email, text, video_time, drawing_data,
          likes, liked_by, resolved, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          projectId,
          folderId,
          videoId,
          parentId,
          userName,
          userEmail,
          text,
          videoTime,
          processedDrawingData,
          0, // likes
          '[]', // liked_by
          0, // resolved
          now,
          now
        ]
      );

      const result = await query('SELECT * FROM comments WHERE id = ?', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      throw error;
    }
  }

  static async getComments(projectId, folderId, videoId) {
    try {
      // Buscar todos os comentários do vídeo
      const result = await query(
        'SELECT * FROM comments WHERE project_id = ? AND folder_id = ? AND video_id = ? ORDER BY created_at ASC',
        [projectId, folderId, videoId]
      );

      // Organizar comentários em uma estrutura hierárquica
      const comments = result.rows;
      const commentMap = new Map();
      const rootComments = [];

      // Primeiro, mapear todos os comentários por ID
      comments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });

      // Depois, organizar a hierarquia
      comments.forEach(comment => {
        if (comment.parent_id) {
          const parentComment = commentMap.get(comment.parent_id);
          if (parentComment) {
            parentComment.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      return rootComments;
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      throw error;
    }
  }

  static async getComment(id) {
    const result = await query('SELECT * FROM comments WHERE id = ?', [id]);
    return result.rows[0];
  }

  static async updateComment(commentId, text, drawingData = null) {
    try {
      const result = await query(
        `UPDATE comments 
         SET text = $1, 
             drawing_data = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 
         RETURNING *`,
        [text, drawingData, commentId]
      );

      if (result.rowCount === 0) {
        return null;
      }

      const comment = result.rows[0];
      return {
        ...comment,
        drawing_data: comment.drawing_data ? JSON.parse(comment.drawing_data) : null
      };
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
      throw error;
    }
  }

  static async deleteComment(commentId) {
    try {
      // Primeiro, deletar todas as respostas do comentário
      await query(
        'DELETE FROM comments WHERE parent_id = $1',
        [commentId]
      );

      // Depois, deletar o comentário principal
      const result = await query(
        'DELETE FROM comments WHERE id = $1 RETURNING *',
        [commentId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      throw error;
    }
  }

  static async toggleCommentLike(id, userEmail) {
    const comment = await this.getComment(id);
    if (!comment) return null;

    const likedBy = comment.liked_by ? JSON.parse(comment.liked_by) : [];
    const likes = comment.likes || 0;

    if (likedBy.includes(userEmail)) {
      // Remove like
      const newLikedBy = likedBy.filter(email => email !== userEmail);
      await query(
        'UPDATE comments SET likes = ?, liked_by = ? WHERE id = ?',
        [likes - 1, JSON.stringify(newLikedBy), id]
      );
    } else {
      // Add like
      likedBy.push(userEmail);
      await query(
        'UPDATE comments SET likes = ?, liked_by = ? WHERE id = ?',
        [likes + 1, JSON.stringify(likedBy), id]
      );
    }

    return await this.getComment(id);
  }
} 