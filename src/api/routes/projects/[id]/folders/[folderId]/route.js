import { NextResponse } from 'next/server';
import { ProjectService } from '@/services/projectService';
import { DbService } from '@/services';

// GET /api/projects/[id]/folders/[folderId]
export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    console.log('Buscando pasta:', { projectId, folderId });

    const folder = await DbService.getFolder(folderId);
    
    if (!folder) {
      return NextResponse.json(
        { error: 'Pasta não encontrada' },
        { status: 404 }
      );
    }

    if (folder.project_id !== projectId) {
      return NextResponse.json(
        { error: 'Pasta não pertence a este projeto' },
        { status: 403 }
      );
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Erro ao buscar pasta:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pasta' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/folders/[folderId]
export async function PUT(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const data = await request.json();
    console.log('Atualizando pasta:', folderId, data);
    const folder = await ProjectService.updateFolder(folderId, data);
    if (!folder) {
      return NextResponse.json(
        { error: 'Pasta não encontrada' },
        { status: 404 }
      );
    }
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Erro ao atualizar pasta:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar pasta' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/folders/[folderId]
export async function DELETE(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    console.log('Deletando pasta:', folderId);
    const success = await ProjectService.deleteFolder(folderId);
    if (!success) {
      return NextResponse.json(
        { error: 'Pasta não encontrada' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar pasta:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar pasta' },
      { status: 500 }
    );
  }
} 