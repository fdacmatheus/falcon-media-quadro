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
  console.log('API: POST /comments - Início da solicitação');
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    
    console.log('API: POST /comments - Parâmetros de URL:', { projectId, folderId, videoId });
    
    let data;
    try {
      data = await request.json();
      console.log('API: POST /comments - Dados do corpo da requisição:', data);
    } catch (parseError) {
      console.error('API: Erro ao analisar JSON do corpo da requisição:', parseError);
      return NextResponse.json({
        error: 'Erro ao analisar corpo da requisição',
        details: parseError.message
      }, { status: 400 });
    }

    // Validate required data
    if (!projectId || !folderId || !videoId) {
      console.error('API: Parâmetros de URL inválidos:', { projectId, folderId, videoId });
      return NextResponse.json({
        error: 'Parâmetros inválidos',
        details: 'Todos os parâmetros são obrigatórios'
      }, { status: 400 });
    }

    if (!data.text && !data.drawing_data) {
      console.error('API: Dados do comentário inválidos:', data);
      return NextResponse.json({
        error: 'Dados inválidos',
        details: 'O comentário deve ter texto ou um desenho'
      }, { status: 400 });
    }

    console.log('API: Tentando criar comentário com DbService');
    
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

      console.log('API: POST /comments - Comentário salvo com sucesso:', savedComment);
      return NextResponse.json(savedComment);
    } catch (dbError) {
      console.error('API: Erro ao salvar comentário no banco de dados:', dbError);
      return NextResponse.json({
        error: 'Erro ao salvar comentário no banco de dados',
        details: dbError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API: Erro geral ao processar solicitação POST /comments:', error);
    return NextResponse.json({
      error: 'Erro ao salvar comentário',
      details: error.message
    }, { status: 500 });
  }
} 