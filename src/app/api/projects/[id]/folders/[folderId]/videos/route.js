import { NextResponse } from 'next/server';
import { DbService } from '../../../../../../services';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { join } from 'path';

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
      // Criar diretório de uploads se não existir
      const uploadDir = join(process.cwd(), 'public', 'uploads', projectId, folderId);
      await mkdir(uploadDir, { recursive: true });

      // Gerar nome único para o arquivo
      const fileName = `${randomUUID()}-${file.name}`;
      const filePath = path.join('uploads', projectId, folderId, fileName);
      const fullPath = path.join(process.cwd(), 'public', filePath);

      // Salvar o arquivo
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(fullPath, buffer);

      console.log('Arquivo salvo com sucesso:', fullPath);

      // Inserir no banco de dados
      const result = await DbService.createVideo(
        projectId,
        folderId,
        file.name,
        filePath.replace(/\\/g, '/'), // Garantir formato correto do path
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