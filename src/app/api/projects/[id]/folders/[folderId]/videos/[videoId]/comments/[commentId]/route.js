import { NextResponse } from 'next/server';
import { DbService } from '../../../../../../../../services/dbService';

export async function DELETE(request, { params }) {
  try {
    const { commentId } = params;
    
    console.log('Tentando deletar comentário:', commentId);

    // Deletar o comentário usando o DbService
    const result = await DbService.deleteComment(commentId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Comentário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar comentário' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { commentId } = params;
    const data = await request.json();
    
    console.log('Tentando editar comentário:', { commentId, data });

    if (!data.text) {
      return NextResponse.json(
        { error: 'Texto do comentário é obrigatório' },
        { status: 400 }
      );
    }

    // Atualizar o comentário usando o DbService
    const updatedComment = await DbService.updateComment(
      commentId,
      data.text,
      data.drawing ? JSON.stringify(data.drawing) : null
    );
    
    if (!updatedComment) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar comentário' },
      { status: 500 }
    );
  }
} 