import { NextResponse } from 'next/server';
import { DbService } from '../../../../../../../../../services/dbService';

export async function POST(request, { params }) {
  try {
    const { commentId } = params;
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email do usuário é obrigatório' },
        { status: 400 }
      );
    }
    
    // Usar o método toggleCommentLike do DbService
    const updatedComment = await DbService.toggleCommentLike(commentId, email);
    
    if (!updatedComment) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Erro ao atualizar like do comentário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar like do comentário' },
      { status: 500 }
    );
  }
} 