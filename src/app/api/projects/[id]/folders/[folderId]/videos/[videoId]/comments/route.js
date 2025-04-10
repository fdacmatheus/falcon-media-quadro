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
    return NextResponse.json(comments);
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
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    
    console.log('POST /comments - Raw params:', paramsData);
    console.log('POST /comments - Parâmetros extraídos:', { projectId, folderId, videoId });
    
    let data;
    try {
      data = await request.json();
      console.log('POST /comments - Dados recebidos (JSON):', data);
    } catch (e) {
      console.error('Erro ao parsear o corpo da requisição:', e);
      return NextResponse.json({
        error: 'Erro no formato dos dados',
        details: e.message
      }, { status: 400 });
    }

    // Validate required data
    if (!projectId || !folderId || !videoId) {
      console.error('Parâmetros inválidos:', { projectId, folderId, videoId });
      return NextResponse.json({
        error: 'Parâmetros inválidos',
        details: 'Todos os parâmetros são obrigatórios'
      }, { status: 400 });
    }

    if (!data.text && !data.drawing_data) {
      console.error('Dados do comentário inválidos:', data);
      return NextResponse.json({
        error: 'Dados inválidos',
        details: 'O comentário deve ter texto ou um desenho'
      }, { status: 400 });
    }

    console.log('Chamando DbService.createComment com:', {
      projectId,
      folderId, 
      videoId,
      parentId: data.parentId,
      userName: data.user_name,
      userEmail: data.user_email,
      text: data.text,
      videoTime: data.video_time,
      drawingData: data.drawing_data ? 'present' : null
    });

    // Create the comment
    try {
      const savedComment = await DbService.createComment(
        projectId,
        folderId,
        videoId,
        data.parentId || null,
        data.user_name || 'Anonymous',
        data.user_email || 'anonymous@example.com',
        data.text || '',
        data.video_time || 0,
        data.drawing_data
      );

      console.log('POST /comments - Comentário salvo:', savedComment);
      return NextResponse.json(savedComment);
    } catch (dbError) {
      console.error('Erro do DbService ao criar comentário:', dbError);
      return NextResponse.json({
        error: 'Erro do banco de dados',
        details: dbError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro geral ao salvar comentário:', error);
    return NextResponse.json({
      error: 'Erro ao salvar comentário',
      details: error.message
    }, { status: 500 });
  }
} 