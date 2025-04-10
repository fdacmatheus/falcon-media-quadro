import { NextResponse } from 'next/server';
import { DbService } from '../../../../services';

// GET /api/projects/[id]/folders
export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    console.log('Buscando pastas do projeto:', projectId);

    const folders = await DbService.getFolders(projectId);
    console.log('Pastas encontradas:', folders);

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Erro ao buscar pastas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pastas' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/folders
export async function POST(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const { name, parentId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Nome da pasta é obrigatório' },
        { status: 400 }
      );
    }

    try {
      const folder = await DbService.createFolder(projectId, name, parentId || null);
      return NextResponse.json(folder);
    } catch (error) {
      if (error.message === 'Já existe uma pasta com este nome') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pasta' },
      { status: 500 }
    );
  }
} 