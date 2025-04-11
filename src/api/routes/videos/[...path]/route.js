import { NextResponse } from 'next/server';
import { join } from 'path';
import { createReadStream, stat } from 'fs';
import { promisify } from 'util';

const statAsync = promisify(stat);

export async function GET(request, { params }) {
  try {
    // Pegar o caminho do vídeo dos parâmetros
    const paramsData = await params;
    const filePath = paramsData.path.join('/');
    
    // Construir o caminho completo do arquivo
    const fullPath = join(process.cwd(), 'public', filePath);
    
    // Verificar se o arquivo existe e pegar suas informações
    const stats = await statAsync(fullPath);
    
    // Pegar o range do header (para streaming)
    const range = request.headers.get('range');
    
    if (range) {
      // Streaming para requisições com range
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const stream = createReadStream(fullPath, { start, end });
      
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      
      return new NextResponse(stream, { status: 206, headers });
    } else {
      // Resposta completa para requisições sem range
      const stream = createReadStream(fullPath);
      
      const headers = {
        'Content-Length': stats.size,
        'Content-Type': 'video/mp4',
      };
      
      return new NextResponse(stream, { headers });
    }
  } catch (error) {
    console.error('Erro ao servir vídeo:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar vídeo' },
      { status: 404 }
    );
  }
} 