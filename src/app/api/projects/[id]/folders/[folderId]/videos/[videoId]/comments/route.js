import { NextResponse } from 'next/server';
import { DbService } from '@/services';
import { query } from '@/database/config/database'; // Importação da função query

export async function GET(request, { params }) {
  try {
    const { id: projectId, folderId, videoId } = params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    console.log('GET /comments - Parâmetros:', {
      projectId,
      folderId,
      videoId,
      versionId: versionId || 'não especificado'
    });

    // Validar parâmetros obrigatórios
    if (!projectId || !folderId || !videoId) {
      console.error('Parâmetros inválidos:', { projectId, folderId, videoId });
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: 'Todos os parâmetros são obrigatórios' },
        { status: 400 }
      );
    }

    let sql;
    let queryParams;

    if (versionId) {
      // Se tem versionId, buscar comentários da versão específica E comentários sem versão
      sql = `
        SELECT * FROM comments 
        WHERE project_id = ? 
        AND folder_id = ? 
        AND video_id = ? 
        AND (version_id = ? OR version_id IS NULL)
        ORDER BY created_at DESC
      `;
      queryParams = [projectId, folderId, videoId, versionId];
      console.log('Filtrando comentários da versão específica E sem versão:', versionId);
    } else {
      // Se não tem versionId, buscar todos os comentários
      sql = `
        SELECT * FROM comments 
        WHERE project_id = ? 
        AND folder_id = ? 
        AND video_id = ?
        ORDER BY created_at DESC
      `;
      queryParams = [projectId, folderId, videoId];
      console.log('Buscando todos os comentários do vídeo');
    }

    const result = await query(sql, queryParams);
    
    if (!result || !result.rows) {
      console.error('Resultado inválido da query:', result);
      throw new Error('Erro ao executar query de comentários');
    }

    console.log(`${result.rows.length} comentários encontrados`);
    
    // Log detalhado dos comentários
    result.rows.forEach(comment => {
      console.log(`Comentário ID: ${comment.id}, versão: ${comment.version_id || 'sem versão'}, texto: ${comment.text?.substring(0, 30) || 'sem texto'}`);
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar comentários', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    console.log('POST /comments - Iniciando');
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    
    // Validar parâmetros
    if (!projectId || !folderId || !videoId) {
      console.error('Parâmetros inválidos:', { projectId, folderId, videoId });
      return NextResponse.json({
        error: 'Parâmetros inválidos',
        details: 'Todos os parâmetros são obrigatórios'
      }, { status: 400 });
    }
    
    // Obter dados do corpo da requisição
    const data = await request.json();
    console.log('POST /comments - Dados recebidos:', {
      ...data,
      text: data.text ? data.text.substring(0, 30) + (data.text.length > 30 ? '...' : '') : null,
      drawing_data: data.drawing_data ? 'Presente (comprimento: ' + data.drawing_data.length + ')' : 'Ausente',
      version_id: data.version_id || 'não especificado'
    });
    
    // Validar dados obrigatórios
    if (!data.text && !data.drawing_data) {
      console.error('Dados do comentário inválidos:', data);
      return NextResponse.json({
        error: 'Dados inválidos',
        details: 'O comentário deve ter texto ou um desenho'
      }, { status: 400 });
    }
    
    // Validar e normalizar o tempo do vídeo
    let videoTime = 0;
    try {
      videoTime = parseFloat(data.video_time);
      if (isNaN(videoTime) || !isFinite(videoTime)) {
        console.warn('Tempo de vídeo inválido recebido:', data.video_time);
        videoTime = 0;
      }
    } catch (e) {
      console.error('Erro ao processar tempo de vídeo:', e);
      videoTime = 0;
    }
    
    // Processar dados de desenho para garantir formato consistente
    let processedDrawingData = null;
    if (data.drawing_data) {
      try {
        // Verificar se já é um JSON string válido
        const drawingObj = JSON.parse(data.drawing_data);
        
        // Garantir que o timestamp no objeto de desenho seja válido
        if (drawingObj.timestamp) {
          const drawingTime = parseFloat(drawingObj.timestamp);
          if (isNaN(drawingTime) || !isFinite(drawingTime)) {
            console.warn('Timestamp inválido no objeto de desenho, usando tempo do vídeo');
            drawingObj.timestamp = videoTime;
          }
        } else {
          // Se não tiver timestamp, adicionar usando o tempo do vídeo
          drawingObj.timestamp = videoTime;
        }
        
        // Reconverter para string com valores validados
        processedDrawingData = JSON.stringify(drawingObj);
        console.log('Drawing data validado e normalizado');
        
      } catch (e) {
        // Se não for um JSON válido, converte para o formato padrão
        console.log('Convertendo drawing data para formato padrão com timestamp');
        processedDrawingData = JSON.stringify({
          imageData: data.drawing_data,
          timestamp: videoTime
        });
      }
    }
    
    // Criar o comentário no banco de dados com suporte a version_id
    const savedComment = await DbService.createComment(
      projectId,
      folderId,
      videoId,
      data.parentId || null,
      data.user_name || 'Anonymous',
      data.user_email || 'anonymous@example.com',
      data.text || '',
      data.video_time || 0,
      data.drawing_data,
      data.version_id || null // Passar version_id para o dbService
    );
    
    console.log('POST /comments - Comentário salvo com sucesso:', {
      id: savedComment.id,
      hasDrawing: !!savedComment.drawing_data,
      videoTime: savedComment.video_time,
      version_id: savedComment.version_id || 'não especificado'
    });
    
    return NextResponse.json(savedComment);
  } catch (error) {
    console.error('POST /comments - Erro:', error);
    return NextResponse.json({
      error: 'Erro ao salvar comentário',
      details: error.message
    }, { status: 500 });
  }
} 