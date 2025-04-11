import { NextResponse } from 'next/server';
import { use } from 'react';
import { ProjectService } from '@/services/projectService';

// GET /api/projects/[id]
export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const id = paramsData.id;
    console.log('Buscando projeto:', id);
    
    const project = await ProjectService.getProject(id);
    
    if (!project) {
      console.log('Projeto não encontrado:', id);
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    console.log('Projeto encontrado:', project);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar projeto' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]
export async function PUT(request, { params }) {
  try {
    const paramsData = await params;
    const id = paramsData.id;
    const data = await request.json();
    console.log('Atualizando projeto:', id, data);
    const project = await ProjectService.updateProject(id, data);
    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar projeto' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request, { params }) {
  try {
    // Aguarda os parâmetros conforme recomendação do Next.js
    const paramsData = await params;
    const id = paramsData.id;
    console.log('Tentando deletar projeto:', id);
    
    try {
      // Primeiro verifica se o projeto existe
      const projectExists = await ProjectService.getProject(id);
      
      if (!projectExists) {
        console.log('Projeto não encontrado:', id);
        return NextResponse.json(
          { error: 'Projeto não encontrado' },
          { status: 404 }
        );
      }

      // Tenta deletar primeiro as pastas do projeto
      await ProjectService.deleteFoldersByProjectId(id);
      
      // Depois deleta o projeto
      const success = await ProjectService.deleteProject(id);
      
      if (!success) {
        console.log('Falha ao deletar projeto:', id);
        return NextResponse.json(
          { error: 'Falha ao deletar projeto' },
          { status: 500 }
        );
      }
      
      console.log('Projeto deletado com sucesso:', id);
      return NextResponse.json({ 
        success: true,
        message: 'Projeto deletado com sucesso'
      });

    } catch (dbError) {
      console.error('Erro no banco de dados:', dbError);
      return NextResponse.json(
        { error: 'Erro ao deletar projeto no banco de dados' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno ao deletar projeto' },
      { status: 500 }
    );
  }
} 