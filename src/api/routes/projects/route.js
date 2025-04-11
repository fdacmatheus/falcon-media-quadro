import { NextResponse } from 'next/server';
import { ProjectService } from '@/services/projectService';

// GET /api/projects
export async function GET() {
  try {
    console.log('Buscando projetos...');
    const projects = await ProjectService.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar projetos' },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    const project = await ProjectService.createProject(name, description);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return NextResponse.json(
      { error: 'Erro ao criar projeto' },
      { status: 500 }
    );
  }
} 