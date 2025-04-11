import { NextResponse } from 'next/server';
import { DbService } from '@/services';

export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    
    console.log('GET /comments - Parâmetros:', { projectId, folderId, videoId });

    // Validate parameters
    if (!projectId || !folderId || !videoId) {
      console.error('Parâmetros inválidos:', { projectId, folderId, videoId });
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: 'Todos os parâmetros são obrigatórios' },
        { status: 400 }
      );
    }

    const comments = await DbService.getComments(projectId, folderId, videoId);
    console.log('GET /comments - Total de comentários:', comments.length);
    
    // Processar comentários para garantir que todos os campos necessários estejam presentes
    const processedComments = comments.map(comment => {
      // Garantir que o videoTime seja processado corretamente
      let videoTime = 0;
      try {
        videoTime = parseFloat(comment.video_time || 0);
        if (isNaN(videoTime) || !isFinite(videoTime)) {
          console.warn('Tempo inválido para comentário:', comment.id);
          videoTime = 0;
        }
      } catch (e) {
        console.error('Erro ao processar tempo de vídeo:', e);
        videoTime = 0;
      }
      
      // Processar drawing_data e garantir que seja um objeto válido
      let drawing = null;
      if (comment.drawing_data) {
        try {
          // Tentar fazer parse do JSON
          drawing = JSON.parse(comment.drawing_data);
          console.log('Drawing data parseado com sucesso para comentário:', comment.id);
          
          // Verificar e corrigir o timestamp no desenho
          if (drawing.timestamp !== undefined) {
            const drawingTime = parseFloat(drawing.timestamp);
            if (isNaN(drawingTime) || !isFinite(drawingTime)) {
              console.warn('Timestamp inválido no desenho, usando tempo do vídeo');
              drawing.timestamp = videoTime;
            }
          } else {
            // Se não tiver timestamp, adicionar
            drawing.timestamp = videoTime;
          }
          
          // Reconverter para string
          comment.drawing_data = JSON.stringify(drawing);
          
        } catch (e) {
          console.error('Erro ao processar drawing_data:', e);
          // Converter para formato padrão se não for um JSON válido
          drawing = {
            imageData: comment.drawing_data,
            timestamp: videoTime
          };
          comment.drawing_data = JSON.stringify(drawing);
        }
      }
      
      // Criar campos adicionais para compatibilidade
      return {
        ...comment,
        videoTime: videoTime,
        drawing: drawing,
        // Garantir que outros campos existam
        author: comment.user_name || 'Anônimo',
        email: comment.user_email || 'anonymous@example.com',
        timestamp: comment.created_at,
        likes: parseInt(comment.likes) || 0,
        likedBy: comment.liked_by ? JSON.parse(comment.liked_by) : [],
        replies: [],
        resolved: Boolean(comment.resolved)
      };
    });
    
    return NextResponse.json(processedComments);
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
    
    console.log('POST /comments - Parâmetros:', { projectId, folderId, videoId });
    
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
      drawing_data: data.drawing_data ? 'Presente (comprimento: ' + data.drawing_data.length + ')' : 'Ausente'
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
    
    // Criar o comentário no banco de dados
    const savedComment = await DbService.createComment(
      projectId,
      folderId,
      videoId,
      data.parentId || null,
      data.user_name || 'Anonymous',
      data.user_email || 'anonymous@example.com',
      data.text || '',
      videoTime,
      processedDrawingData
    );
    
    console.log('POST /comments - Comentário salvo com sucesso:', {
      id: savedComment.id,
      hasDrawing: !!savedComment.drawing_data,
      videoTime: savedComment.video_time
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