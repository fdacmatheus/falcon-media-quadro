import { NextResponse } from 'next/server';
import { DbService } from '@/services';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { join } from 'path';
import fs from 'fs';

export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const videoId = paramsData.videoId;
    
    const versions = await DbService.getVideoVersions(videoId);
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Error fetching video versions' },
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

    console.log('Creating new video version:', { projectId, folderId, videoId });

    // Check if receiving formData or JSON
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return NextResponse.json({ 
          error: 'File not found',
          details: 'No file was sent in FormData'
        }, { status: 400 });
      }

      // Basic validations
      if (!file.name || !file.size || !file.type) {
        return NextResponse.json({ 
          error: 'Invalid file',
          details: 'File must have name, size and type'
        }, { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        return NextResponse.json({ 
          error: 'Invalid file type',
          details: 'File must be a video'
        }, { status: 400 });
      }

      try {
        // Definir o caminho raiz do projeto
        const rootDir = process.cwd();
        console.log('Diretório raiz (versões):', rootDir);
        
        // Criar diretório para versões do projeto
        const versionDir = path.join(rootDir, 'public', 'uploads', projectId, folderId, videoId, 'versions');
        await mkdir(versionDir, { recursive: true });
        console.log('Diretório de versões criado:', versionDir);
        
        // Generate unique filename
        const fileName = `${randomUUID()}-${file.name}`;
        
        // Caminho completo para o arquivo na pasta de versões
        const versionPath = path.join(versionDir, fileName);
        console.log('Caminho do arquivo de versão:', versionPath);

        // Save the file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Salvar o arquivo na pasta de versões
        console.log('Tentando salvar versão em:', versionPath);
        try {
          await writeFile(versionPath, buffer);
          console.log('Versão salva com sucesso em:', versionPath);
        } catch (writeError) {
          console.error('Erro ao salvar versão:', writeError);
          // Tentar método síncrono como fallback
          fs.writeFileSync(versionPath, buffer);
          console.log('Versão salva com sucesso (método síncrono) em:', versionPath);
        }
        
        // Também vamos verificar se o diretório /uploads/videos existe e criar uma cópia lá
        try {
          const videosDir = path.join(rootDir, 'public', 'uploads', 'videos');
          await mkdir(videosDir, { recursive: true });
          const videosPath = path.join(videosDir, fileName);
          fs.copyFileSync(versionPath, videosPath);
          console.log('Cópia da versão também salva em:', videosPath);
        } catch (copyError) {
          console.error('Erro ao criar cópia em /uploads/videos:', copyError);
          // Continuar mesmo se a cópia falhar
        }
        
        // Get original video to use as source_video_id
        const originalVideo = await DbService.getVideo(videoId);
        if (!originalVideo) {
          return NextResponse.json({
            error: 'Original video not found',
          }, { status: 404 });
        }

        // Calculate video duration (complex on server side, can leave as null)
        const duration = 0; // Will be updated by client after loading

        // Construir o caminho para ser armazenado no banco de dados
        // que corresponda à estrutura original do projeto
        const dbFilePath = `/uploads/${projectId}/${folderId}/${videoId}/versions/${fileName}`;
        console.log('Caminho da versão para o banco de dados:', dbFilePath);

        // Insert the version in the database
        const result = await DbService.createVideoVersion(
          projectId,
          folderId,
          videoId,
          originalVideo.id,
          dbFilePath, // caminho para o banco de dados com a estrutura de pastas
          file.size,
          file.type,
          duration
        );

        console.log('Video version created successfully:', result);

        return NextResponse.json(result, { status: 201 });
        
      } catch (error) {
        console.error('Error saving video version:', error);
        return NextResponse.json({
          error: 'Error saving video version',
          details: error.message
        }, { status: 500 });
      }
    } else if (contentType.includes('application/json')) {
      // Processing for when content is JSON (dragging one video onto another)
      const data = await request.json();
      const { sourceVideoId } = data;
      
      if (!sourceVideoId) {
        return NextResponse.json({
          error: 'Source video ID not provided',
        }, { status: 400 });
      }
      
      // Get original video and source video
      const targetVideo = await DbService.getVideo(videoId);
      const sourceVideo = await DbService.getVideo(sourceVideoId);
      
      if (!targetVideo || !sourceVideo) {
        return NextResponse.json({
          error: 'Video not found',
        }, { status: 404 });
      }
      
      // Create version based on source video
      const result = await DbService.createVideoVersion(
        projectId,
        folderId,
        videoId,
        sourceVideoId,
        sourceVideo.file_path,
        sourceVideo.file_size,
        sourceVideo.file_type,
        sourceVideo.duration
      );
      
      // Mark the source video as hidden
      await DbService.hideVideo(sourceVideoId);
      
      console.log('Video version created successfully (from existing video):', result);
      
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json({
        error: 'Invalid content type',
        details: 'Content must be multipart/form-data or application/json'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing version creation:', error);
    return NextResponse.json({
      error: 'Error processing video version creation',
      details: error.message
    }, { status: 500 });
  }
} 