// O DbService deve ser um objeto ou classe que contém os métodos
class DbService {
  constructor() {
    // Inicialização do serviço
    console.log('DbService inicializado');
  }

  // Método auxiliar para executar queries
  async executeQuery(query, params = []) {
    // Implementação de exemplo - isso seria substituído pela real implementação 
    // que se conecta ao banco de dados
    console.log('Executando query:', query);
    console.log('Parâmetros:', params);
    
    // Apenas simulação para permitir que o código funcione
    return { insertId: Date.now(), results: [] };
  }

  // Função para obter todos os comentários de um vídeo
  async getComments(projectId, folderId, videoId) {
    console.log('DbService: getComments iniciado com IDs:', { projectId, folderId, videoId });
    
    try {
      const results = await this.executeQuery(
        'SELECT * FROM comments WHERE project_id = ? AND folder_id = ? AND video_id = ? ORDER BY created_at DESC',
        [projectId, folderId, videoId]
      );
      
      console.log(`DbService: ${results.length} comentários encontrados`);
      
      // Transformar resultados para garantir consistência
      const transformedResults = results.map(comment => {
        try {
          // Garantir que o video_time seja um número válido
          let videoTime = 0;
          try {
            videoTime = parseFloat(comment.video_time || 0);
            if (isNaN(videoTime) || !isFinite(videoTime)) {
              console.warn(`DbService: Tempo inválido no comentário ${comment.id}, usando 0`);
              videoTime = 0;
              
              // Corrigir no banco de dados
              this.executeQuery(
                'UPDATE comments SET video_time = ? WHERE id = ?',
                [0, comment.id]
              ).catch(e => console.error('Erro ao atualizar video_time:', e));
            }
          } catch (e) {
            console.error('Erro ao processar video_time:', e);
            videoTime = 0;
          }
          
          // Atualizar o campo no resultado
          comment.video_time = videoTime;
          
          // Tratar também o campo drawing_data
          if (comment.drawing_data) {
            try {
              // Verificar se é JSON válido
              const drawingObj = JSON.parse(comment.drawing_data);
              
              // Validar timestamp no objeto de desenho
              if (drawingObj.timestamp !== undefined) {
                const drawingTime = parseFloat(drawingObj.timestamp);
                if (isNaN(drawingTime) || !isFinite(drawingTime)) {
                  console.warn(`DbService: Timestamp inválido no desenho do comentário ${comment.id}`);
                  drawingObj.timestamp = videoTime;
                  
                  // Atualizar no banco
                  const updatedDrawing = JSON.stringify(drawingObj);
                  comment.drawing_data = updatedDrawing;
                  
                  this.executeQuery(
                    'UPDATE comments SET drawing_data = ? WHERE id = ?',
                    [updatedDrawing, comment.id]
                  ).catch(e => console.error('Erro ao atualizar drawing_data:', e));
                }
              } else {
                // Se não tiver timestamp, adicionar com base no video_time
                drawingObj.timestamp = videoTime;
                
                // Atualizar no banco
                const updatedDrawing = JSON.stringify(drawingObj);
                comment.drawing_data = updatedDrawing;
                
                this.executeQuery(
                  'UPDATE comments SET drawing_data = ? WHERE id = ?',
                  [updatedDrawing, comment.id]
                ).catch(e => console.error('Erro ao atualizar drawing_data:', e));
              }
              
            } catch (e) {
              // Se não for JSON válido, converter para o formato correto
              if (typeof comment.drawing_data === 'string' && comment.drawing_data.startsWith('data:')) {
                console.warn(`DbService: Convertendo drawing_data para o formato correto no comentário ${comment.id}`);
                const newDrawingData = JSON.stringify({
                  imageData: comment.drawing_data,
                  timestamp: videoTime
                });
                
                comment.drawing_data = newDrawingData;
                
                // Atualizar no banco
                this.executeQuery(
                  'UPDATE comments SET drawing_data = ? WHERE id = ?',
                  [newDrawingData, comment.id]
                ).catch(e => console.error('Erro ao atualizar drawing_data:', e));
              }
            }
          }
          
          // Adicionar campos adicionais para facilitar o uso no frontend
          comment.videoTime = videoTime;
          if (comment.drawing_data) {
            try {
              comment.drawing = JSON.parse(comment.drawing_data);
            } catch (e) {
              console.error('Erro ao processar drawing para campo drawing:', e);
            }
          }
          
          return comment;
        } catch (e) {
          console.error('Erro ao processar comentário:', e);
          return comment;
        }
      });
      
      return transformedResults;
    } catch (error) {
      console.error('DbService: Erro ao obter comentários:', error);
      throw new Error(`Erro ao obter comentários: ${error.message}`);
    }
  }

  // Função para criar um novo comentário
  async createComment(projectId, folderId, videoId, parentId, userName, userEmail, text, videoTime, drawingData) {
    console.log('DbService: createComment iniciado com:',
      { projectId, folderId, videoId, parentId, userName });
    
    try {
      // Garantir que o videoTime seja um número válido
      let safeVideoTime = 0;
      try {
        safeVideoTime = parseFloat(videoTime);
        if (isNaN(safeVideoTime) || !isFinite(safeVideoTime)) {
          console.warn('DbService: videoTime inválido, usando 0');
          safeVideoTime = 0;
        }
      } catch (e) {
        console.error('DbService: Erro ao processar videoTime:', e);
        safeVideoTime = 0;
      }
      
      // Processar dados de desenho se existirem
      let safeDrawingData = drawingData;
      if (drawingData) {
        try {
          // Verificar se já é um JSON válido
          const drawingObj = JSON.parse(drawingData);
          
          // Garantir que o timestamp é válido
          if (drawingObj.timestamp !== undefined) {
            const drawingTime = parseFloat(drawingObj.timestamp);
            if (isNaN(drawingTime) || !isFinite(drawingTime)) {
              console.warn('DbService: Timestamp inválido no objeto de desenho');
              drawingObj.timestamp = safeVideoTime;
              safeDrawingData = JSON.stringify(drawingObj);
            }
          } else {
            // Se não tiver timestamp, adicionar
            drawingObj.timestamp = safeVideoTime;
            safeDrawingData = JSON.stringify(drawingObj);
          }
        } catch (e) {
          // Se não for JSON válido, converter para o formato esperado
          console.error('DbService: Erro ao processar drawing_data:', e);
          if (typeof drawingData === 'string' && drawingData.startsWith('data:')) {
            safeDrawingData = JSON.stringify({
              imageData: drawingData,
              timestamp: safeVideoTime
            });
          }
        }
      }
      
      const result = await this.executeQuery(
        `INSERT INTO comments (
          project_id, folder_id, video_id, parent_id, 
          user_name, user_email, text, video_time, 
          drawing_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          projectId, folderId, videoId, parentId,
          userName, userEmail, text, safeVideoTime,
          safeDrawingData
        ]
      );
      
      if (result.insertId) {
        console.log('DbService: Comentário criado com ID:', result.insertId);
        
        // Obter o comentário recém-criado
        const comments = await this.executeQuery(
          'SELECT * FROM comments WHERE id = ?',
          [result.insertId]
        );
        
        if (comments.length > 0) {
          const comment = comments[0];
          
          // Adicionar campos para compatibilidade
          comment.videoTime = parseFloat(comment.video_time);
          
          // Tratar o campo drawing_data
          if (comment.drawing_data) {
            try {
              comment.drawing = JSON.parse(comment.drawing_data);
            } catch (e) {
              console.error('Erro ao processar drawing para novo comentário:', e);
            }
          }
          
          return comment;
        }
      }
      
      throw new Error('Falha ao criar comentário');
    } catch (error) {
      console.error('DbService: Erro ao criar comentário:', error);
      throw new Error(`Erro ao criar comentário: ${error.message}`);
    }
  }
}

// Exportar uma instância única do serviço
export { DbService }; 