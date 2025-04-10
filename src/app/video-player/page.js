'use client';
import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import Comments from '../components/Comments';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Componente principal dentro do Suspense
function VideoPlayerPageContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);
  const [videoVersions, setVideoVersions] = useState([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [videoData, setVideoData] = useState(null);

  // Obter IDs da URL
  const projectId = searchParams.get('projectId');
  const folderId = searchParams.get('folderId');
  const videoId = searchParams.get('videoId');

  // Carregar comentários iniciais
  useEffect(() => {
    const loadComments = async () => {
      if (!projectId || !folderId || !videoId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`);
        if (response.ok) {
          const data = await response.json();
          setComments(data);
        }
      } catch (error) {
        console.error('Erro ao carregar comentários:', error);
      }
    };

    loadComments();
  }, [projectId, folderId, videoId]);

  // Carregar dados do vídeo e versões
  useEffect(() => {
    const loadVideoData = async () => {
      if (!projectId || !folderId || !videoId) return;

      try {
        // Buscar dados do vídeo
        const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}`);
        if (response.ok) {
          const videoData = await response.json();
          setVideoData(videoData);
          setCurrentVideoUrl(videoData.file_path);
        } else {
          toast.error('Erro ao carregar vídeo');
        }

        // Buscar versões do vídeo
        const versionsResponse = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/versions`);
        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          setVideoVersions(versionsData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do vídeo:', error);
        toast.error('Erro ao carregar dados do vídeo');
      }
    };

    loadVideoData();
  }, [projectId, folderId, videoId]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleSeekToTime = useCallback((time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const handleDrawingSave = (imageData) => {
    setTempDrawing(imageData);
  };

  const handleVersionCreated = (newVersion) => {
    // Atualizar a lista de versões
    setVideoVersions(prev => [newVersion, ...prev]);
    toast.success('Nova versão adicionada com sucesso!');
  };

  const handleNewComment = async (comment) => {
    console.log('handleNewComment called with:', comment);
    console.log('ProjectId:', projectId);
    console.log('FolderId:', folderId);
    console.log('VideoId:', videoId);
    
    if (!projectId || !folderId || !videoId) {
      console.error('Missing required IDs for comment submission!');
      toast.error('Erro: IDs necessários não encontrados');
      return;
    }

    try {
      console.log('Preparing to send fetch request to:', `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`);
      
      // Mapear campos para corresponder ao que o backend espera
      const requestBody = {
        text: comment.text || '',
        user_name: user?.name || comment.author || 'Usuário',
        user_email: user?.email || comment.email || 'default@email.com',
        video_time: comment.videoTime,
        parentId: comment.parentId || null,
        project_id: projectId,
        folder_id: folderId,
        video_id: videoId,
        drawing_data: comment.drawing ? JSON.stringify(comment.drawing) : null
      };
      
      console.log('Request body:', requestBody);
      
      // Tentar fazer a requisição com um timeout para garantir que não fique preso
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server response error:', errorText);
          throw new Error(`Falha ao salvar comentário: ${response.status} ${errorText}`);
        }

        const savedComment = await response.json();
        console.log('Saved comment from server:', savedComment);
        
        // Atualizar a interface com o novo comentário
        const formattedComment = {
          ...savedComment,
          id: savedComment.id,
          author: savedComment.user_name,
          email: savedComment.user_email,
          timestamp: savedComment.created_at,
          videoTime: parseFloat(savedComment.video_time) || 0,
          likes: parseInt(savedComment.likes) || 0,
          likedBy: savedComment.liked_by ? JSON.parse(savedComment.liked_by) : [],
          replies: [],
          resolved: Boolean(savedComment.resolved),
          drawing: savedComment.drawing_data ? JSON.parse(savedComment.drawing_data) : null
        };

        console.log('Formatted comment:', formattedComment);
        setComments(prevComments => [formattedComment, ...prevComments]);
        setTempDrawing(null);
        toast.success('Comentário enviado com sucesso!');
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          console.error('Fetch request timed out');
          toast.error('Tempo limite excedido ao enviar comentário. Verifique sua conexão.');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Erro ao salvar comentário:', error);
      toast.error('Erro ao salvar comentário: ' + error.message);
    }
  };

  const handleVersionChange = (version) => {
    console.log('Trocando para versão:', version);
    // Atualiza a URL do vídeo que está sendo reproduzido
    setCurrentVideoUrl(version.file_path);
  };

  if (!projectId || !folderId || !videoId) {
    return <div className="text-white p-4">IDs necessários não fornecidos na URL</div>;
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <VideoPlayer 
          ref={videoRef}
          videoUrl={currentVideoUrl}
          onLogin={handleLogin} 
          onTimeUpdate={handleTimeUpdate}
          comments={comments}
          onDrawingSave={handleDrawingSave}
          fullWidth
          projectId={projectId}
          folderId={folderId}
          videoId={videoId}
          onVersionCreated={handleVersionCreated}
          versions={videoVersions}
          onVersionChange={handleVersionChange}
        />
        <div className="mt-4 bg-[#1F1F1F] rounded-lg overflow-hidden">
          <Comments 
            user={user} 
            currentTime={currentTime}
            onTimeClick={handleSeekToTime}
            onNewComment={handleNewComment}
            comments={comments}
            setComments={setComments}
            tempDrawing={tempDrawing}
            onClearDrawing={() => setTempDrawing(null)}
            videoId={videoId}
            projectId={projectId}
            folderId={folderId}
            onCommentSubmit={handleNewComment}
          />
        </div>
      </div>
    </main>
  );
}

// Componente principal com Suspense
export default function VideoPlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>}>
      <VideoPlayerPageContent />
    </Suspense>
  );
} 