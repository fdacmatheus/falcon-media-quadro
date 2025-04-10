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
    console.log('POST /comments - Dados recebidos:', data);
    
    // Validar dados obrigatórios
    if (!data.text && !data.drawing_data) {
      console.error('Dados do comentário inválidos:', data);
      return NextResponse.json({
        error: 'Dados inválidos',
        details: 'O comentário deve ter texto ou um desenho'
      }, { status: 400 });
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
      data.video_time || 0,
      data.drawing_data
    );
    
    console.log('POST /comments - Comentário salvo com sucesso:', savedComment);
    return NextResponse.json(savedComment);
  } catch (error) {
    console.error('POST /comments - Erro:', error);
    return NextResponse.json({
      error: 'Erro ao salvar comentário',
      details: error.message
    }, { status: 500 });
  }
} 