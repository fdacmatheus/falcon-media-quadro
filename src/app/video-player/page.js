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
    const fetchComments = async () => {
      if (!videoId || !projectId || !folderId) return;
      
      console.log('Buscando comentários para vídeo:', videoId);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`
        );
        
        if (!response.ok) {
          throw new Error('Falha ao buscar comentários');
        }
        
        const fetchedComments = await response.json();
        console.log(`Foram carregados ${fetchedComments.length} comentários`);
        
        // Processar os comentários para garantir compatibilidade
        const processedComments = fetchedComments.map(comment => {
          console.log('Processando comentário com ID:', comment.id);
          
          // Verificar se temos dados de desenho e processá-los
          let drawingData = null;
          
          if (comment.drawing_data) {
            try {
              // Tentar fazer parse do JSON
              const drawingObj = JSON.parse(comment.drawing_data);
              console.log('Drawing data parseado com sucesso');
              
              // Armazenar no objeto 'drawing' para compatibilidade
              drawingData = drawingObj;
            } catch (e) {
              console.error('Erro ao processar drawing_data:', e);
              // Talvez seja uma string direta
              if (typeof comment.drawing_data === 'string' && comment.drawing_data.startsWith('data:')) {
                drawingData = {
                  imageData: comment.drawing_data,
                  timestamp: parseFloat(comment.video_time || 0)
                };
              }
            }
          }
          
          // Garantir que temos videoTime como número
          const videoTime = parseFloat(comment.video_time || comment.videoTime || 0);
          
          // Log para debug
          console.log(`Comentário ${comment.id}:`, {
            videoTime,
            hasDrawing: !!drawingData,
            drawingTimestamp: drawingData?.timestamp
          });
          
          return {
            ...comment,
            videoTime,
            drawing: drawingData,
            // Outros campos para garantir compatibilidade
            author: comment.user_name || comment.author || 'Anônimo',
            timestamp: comment.created_at || comment.timestamp,
            likes: parseInt(comment.likes) || 0,
            likedBy: comment.liked_by ? 
              (typeof comment.liked_by === 'string' ? JSON.parse(comment.liked_by) : comment.liked_by) : 
              (comment.likedBy || []),
            replies: comment.replies || [],
            resolved: Boolean(comment.resolved)
          };
        });
        
        console.log('Comentários processados com sucesso');
        setComments(processedComments);
      } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        toast.error('Erro ao carregar comentários');
      }
    };
    
    if (videoId) {
      fetchComments();
    }
  }, [videoId, projectId, folderId]);

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

  useEffect(() => {
    // Log para verificar se o tempDrawing está sendo atualizado
    console.log('videoPlayer page tempDrawing state:', 
      tempDrawing ? `Present (length: ${tempDrawing.length})` : 'Not present');
  }, [tempDrawing]);

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
    console.log('Drawing saved in VideoPlayerPage, data received:', 
      imageData ? `Present (length: ${imageData.length})` : 'Not present');
    
    // Garantir que temos dados válidos
    if (typeof imageData === 'string' && imageData.length > 0) {
      console.log('Setting valid tempDrawing in VideoPlayerPage');
      setTempDrawing(imageData);
    } else {
      console.warn('Invalid drawing data received in VideoPlayerPage');
      // Definir um valor fallback válido
      const fallbackDrawing = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      setTempDrawing(fallbackDrawing);
    }
  };

  const handleVersionCreated = (newVersion) => {
    // Atualizar a lista de versões
    setVideoVersions(prev => [newVersion, ...prev]);
    toast.success('Nova versão adicionada com sucesso!');
  };

  const handleNewComment = async (comment) => {
    console.log('handleNewComment called with:', comment);
    
    // Esta função está sendo chamada pelo componente Comments, mas devemos evitar
    // duplicação. Vamos manter essa função apenas para manter compatibilidade,
    // mas não executar a lógica se não for necessário. O componente Comments
    // agora lida com a submissão diretamente.
    
    // Verificamos o comentário - se já tiver ID, ele já foi salvo pelo componente Comments
    if (comment.id) {
      console.log('Comentário já possui ID, não precisamos salvá-lo novamente:', comment.id);
      return comment;
    }
    
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
        return formattedComment;
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
            onClearDrawing={() => {
              console.log('Clearing temp drawing');
              setTempDrawing(null);
            }}
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