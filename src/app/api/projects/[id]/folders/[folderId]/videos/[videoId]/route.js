import { NextResponse } from 'next/server';
import { VideoService } from '../../../../../../../services/videoService';
import { DbService } from '../../../../../../../services';
import { unlink } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const videoId = paramsData.videoId;
    const video = await DbService.getVideo(videoId);
    
    if (!video) {
      return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(video);
  } catch (error) {
    console.error('Erro ao buscar vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar vídeo' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId; 
    const videoId = paramsData.videoId;
    
    // Obter informações do vídeo para deletar o arquivo
    const video = await DbService.getVideo(videoId);
    
    if (!video) {
      return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });
    }
    
    // Verificar se o arquivo existe e remover
    if (video.file_path) {
      const filePath = path.join(process.cwd(), 'public', video.file_path.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Também remover versões
    const versions = await DbService.getVideoVersions(videoId);
    for (const version of versions) {
      if (version.file_path) {
        const versionPath = path.join(process.cwd(), 'public', version.file_path.replace(/^\//, ''));
        if (fs.existsSync(versionPath)) {
          fs.unlinkSync(versionPath);
        }
      }
    }
    
    // Deletar do banco de dados
    await DbService.deleteVideo(videoId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar vídeo' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const paramsData = await params;
    const videoId = paramsData.videoId;
    const data = await request.json();
    
    // Atualizar dados do vídeo
    const updatedVideo = await DbService.updateVideo(
      videoId,
      data.name,
      data.duration,
      data.thumbnail_path
    );
    
    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error('Erro ao atualizar vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar vídeo' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const paramsData = await params;
    const videoId = paramsData.videoId;
    const data = await request.json();
    
    if (data.video_status) {
      // Atualizar status do vídeo
      const updatedVideo = await DbService.updateVideoStatus(
        videoId,
        data.video_status
      );
      
      return NextResponse.json(updatedVideo);
    }
    
    return NextResponse.json(
      { error: 'Operação não suportada' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro ao atualizar status do vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status do vídeo' },
      { status: 500 }
    );
  }
} 