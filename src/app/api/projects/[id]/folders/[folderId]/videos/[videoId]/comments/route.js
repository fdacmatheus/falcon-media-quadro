import { NextResponse } from 'next/server';
import { DbService } from '@/services/dbService';

export async function GET(request, { params }) {
  try {
    const paramsData = await params;
    const projectId = paramsData.id;
    const folderId = paramsData.folderId;
    const videoId = paramsData.videoId;
    
    console.log('Fetching comments:', { projectId, folderId, videoId });

    // Validate parameters
    if (!projectId || !folderId || !videoId) {
      console.error('Invalid parameters:', { projectId, folderId, videoId });
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const comments = await DbService.getComments(projectId, folderId, videoId);
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal error while fetching comments' },
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
    const data = await request.json();
    console.log('Data received for new comment:', data);

    // Validate required data
    if (!projectId || !folderId || !videoId || !data.author) {
      return NextResponse.json({
        error: 'Invalid data',
        details: 'All required fields must be provided',
        received: { projectId, folderId, videoId, author: data.author }
      }, { status: 400 });
    }

    // Create the comment
    const savedComment = await DbService.createComment(
      projectId,
      folderId,
      videoId,
      data.parentId || null,
      data.author,
      data.email,
      data.text || '',
      data.videoTime || 0,
      data.drawing ? JSON.stringify(data.drawing) : null
    );

    console.log('Comment saved:', savedComment);
    return NextResponse.json(savedComment);
  } catch (error) {
    console.error('Error saving comment:', error);
    return NextResponse.json({
      error: 'Error saving comment',
      details: error.message
    }, { status: 500 });
  }
} 