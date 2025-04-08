import { NextResponse } from 'next/server';
import { DbService } from '@/services/dbService';

// GET /api/projects/[id]/folders/[folderId]/videos/[videoId]/status
export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    console.log('Buscando status do vídeo:', { projectId, folderId, videoId });

    const video = await DbService.getVideo(videoId);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o arquivo existe fisicamente
    const fileExists = await DbService.checkVideoFileExists(video.file_path);
    
    const status = {
      id: video.id,
      name: video.name,
      duration: video.duration || 0,
      processing: !fileExists, // Se o arquivo não existe, ainda está processando
      video_status: video.video_status || 'no_status',
      file_path: video.file_path,
      created_at: video.created_at,
      updated_at: video.updated_at
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Erro ao buscar status do vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status do vídeo' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/folders/[folderId]/videos/[videoId]/status
export async function PUT(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    const { status } = await request.json();

    console.log('Atualizando status do vídeo:', { projectId, folderId, videoId, status });

    const updatedVideo = await DbService.updateVideoStatus(videoId, status);
    
    if (!updatedVideo) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error('Erro ao atualizar status do vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status do vídeo' },
      { status: 500 }
    );
  }
} 