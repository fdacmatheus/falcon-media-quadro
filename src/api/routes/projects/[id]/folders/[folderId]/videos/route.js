import { NextResponse } from 'next/server';
import { DbService } from '@/services';
import { writeFile, mkdir, copyFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { join } from 'path';
import fs from 'fs';

export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;

    console.log('Fetching videos:', { projectId, folderId });

    const videos = await DbService.getVideos(projectId, folderId);
    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Error fetching videos' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;

    console.log('Iniciando upload de vídeo:', { projectId, folderId });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ 
        error: 'Arquivo não encontrado',
        details: 'Nenhum arquivo foi enviado no FormData'
      }, { status: 400 });
    }

    // Validações básicas
    if (!file.name || !file.size || !file.type) {
      return NextResponse.json({ 
        error: 'Arquivo inválido',
        details: 'O arquivo deve ter nome, tamanho e tipo'
      }, { status: 400 });
    }

    // Validar tipo do arquivo
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ 
        error: 'Tipo de arquivo inválido',
        details: 'O arquivo deve ser um vídeo'
      }, { status: 400 });
    }

    try {
      // Gerar nome único para o arquivo
      const fileName = `${randomUUID()}-${file.name}`;
      
      // Definir o caminho raiz do projeto
      const rootDir = process.cwd();
      console.log('Diretório raiz:', rootDir);
      
      // Criar diretório para o projeto e pasta
      const projectFolderDir = path.join(rootDir, 'public', 'uploads', projectId, folderId);
      await mkdir(projectFolderDir, { recursive: true });
      console.log('Diretório do projeto criado:', projectFolderDir);
      
      // Criar diretório public/uploads/videos
      const videosDir = path.join(rootDir, 'public', 'uploads', 'videos');
      await mkdir(videosDir, { recursive: true });
      console.log('Diretório de vídeos criado:', videosDir);
      
      // Caminho completo para o arquivo na pasta public/uploads/videos
      const videosPath = path.join(videosDir, fileName);
      console.log('Caminho do arquivo em videos:', videosPath);
      
      // Caminho completo para o arquivo na pasta do projeto
      const projectPath = path.join(projectFolderDir, fileName);
      console.log('Caminho do arquivo no projeto:', projectPath);

      // Salvar o arquivo
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Salvar o arquivo SOMENTE em public/uploads/videos
      console.log('Tentando salvar arquivo em:', videosPath);
      try {
        await writeFile(videosPath, buffer);
        console.log('Arquivo salvo com sucesso em:', videosPath);
      } catch (writeError) {
        console.error('Erro ao salvar arquivo:', writeError);
        // Tentar método síncrono como fallback
        fs.writeFileSync(videosPath, buffer);
        console.log('Arquivo salvo com sucesso (método síncrono) em:', videosPath);
      }

      // Construir o caminho para ser armazenado no banco de dados
      const dbFilePath = `/uploads/videos/${fileName}`;
      console.log('Caminho para o banco de dados:', dbFilePath);

      // Inserir no banco de dados
      const result = await DbService.createVideo(
        projectId,
        folderId,
        file.name,
        dbFilePath, // caminho para o banco de dados com /uploads/videos/
        file.size,
        file.type,
        null // duration será atualizada posteriormente
      );

      console.log('Vídeo inserido com sucesso:', result);

      return NextResponse.json(result, { status: 201 });

    } catch (error) {
      console.error('Erro ao salvar arquivo:', error);
      return NextResponse.json({
        error: 'Erro ao salvar arquivo',
        details: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro no processamento do upload:', error);
    return NextResponse.json({
      error: 'Erro ao processar upload do vídeo',
      details: error.message
    }, { status: 500 });
  }
} 