import { NextResponse } from 'next/server';
import { DbService } from '../../../../../../../services/dbService';

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
    const data = await request.json();
    
    console.log('POST /comments - Parâmetros:', { projectId, folderId, videoId });
    console.log('POST /comments - Dados recebidos:', data);

    // Validate required data
    if (!projectId || !folderId || !videoId) {
      console.error('Parâmetros inválidos:', { projectId, folderId, videoId });
      return NextResponse.json({
        error: 'Parâmetros inválidos',
        details: 'Todos os parâmetros são obrigatórios'
      }, { status: 400 });
    }

    if (!data.text && !data.drawing) {
      console.error('Dados do comentário inválidos:', data);
      return NextResponse.json({
        error: 'Dados inválidos',
        details: 'O comentário deve ter texto ou um desenho'
      }, { status: 400 });
    }

    // Create the comment
    const savedComment = await DbService.createComment(
      projectId,
      folderId,
      videoId,
      data.parentId || null,
      data.author || 'Anonymous',
      data.email || 'anonymous@example.com',
      data.text || '',
      data.videoTime || 0,
      data.drawing ? JSON.stringify(data.drawing) : null
    );

    console.log('POST /comments - Comentário salvo:', savedComment);
    return NextResponse.json(savedComment);
  } catch (error) {
    console.error('Erro ao salvar comentário:', error);
    return NextResponse.json({
      error: 'Erro ao salvar comentário',
      details: error.message
    }, { status: 500 });
  }
} 