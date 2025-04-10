import { NextResponse } from 'next/server';
import { DbService } from '../../../../../services/dbService';

export async function GET(request, { params }) {
  try {
    const videoId = params.videoId;
    console.log('GET /api/videos/[videoId]/info - Buscando informações do vídeo:', videoId);
    
    if (!videoId) {
      return NextResponse.json({ error: 'ID do vídeo não fornecido' }, { status: 400 });
    }
    
    // Obter dados básicos do vídeo
    const video = await DbService.getVideo(videoId);
    
    if (!video) {
      return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });
    }
    
    // Retornar as informações do vídeo, incluindo project_id e folder_id
    return NextResponse.json({
      id: video.id,
      name: video.name,
      project_id: video.project_id,
      folder_id: video.folder_id,
      file_path: video.file_path,
      duration: video.duration,
      created_at: video.created_at,
      updated_at: video.updated_at
    });
  } catch (error) {
    console.error('Erro ao buscar informações do vídeo:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar informações do vídeo' },
      { status: 500 }
    );
  }
} 