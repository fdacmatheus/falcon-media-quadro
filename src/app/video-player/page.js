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
  const [activeVersion, setActiveVersion] = useState(null);

  // Obter IDs da URL
  const projectId = searchParams.get('projectId');
  const folderId = searchParams.get('folderId');
  const videoId = searchParams.get('videoId');

  // Função para carregar comentários
  const loadComments = async (versionId = null) => {
    if (!videoId || !projectId || !folderId) {
      console.error('Um ou mais parâmetros obrigatórios estão faltando:', { videoId, projectId, folderId });
      return;
    }
    
    console.log('Buscando comentários para:', { videoId, versionId: versionId || 'todos' });
    try {
      let url = `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`;
      
      // Se tiver uma versão específica, adicionar como query parameter
      if (versionId) {
        url += `?versionId=${versionId}`;
      }
      
      console.log('URL da requisição de comentários:', url);
      
      const response = await fetch(url, {
        // Adicionar cabeçalho de cache para evitar resultados em cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar comentários');
      }
      
      const fetchedComments = await response.json();
      console.log(`Foram carregados ${fetchedComments.length} comentários ${versionId ? 'para a versão selecionada' : ''}`);
      
      // Log para debug - mostrar IDs e version_ids
      if (fetchedComments.length > 0) {
        console.log('Amostra de comentários carregados:');
        fetchedComments.slice(0, 3).forEach(c => {
          console.log(`- Comentário ID: ${c.id}, version_id: ${c.version_id || 'NULL'}, texto: ${c.text ? c.text.substring(0, 30) : 'sem texto'}`);
        });
      }

      // Processar e atualizar comentários
      setComments(fetchedComments);
      
      return fetchedComments;
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      toast.error('Erro ao carregar comentários');
      return [];
    }
  };
  
  // Carregar comentários iniciais (todos)
  useEffect(() => {
    if (videoId) {
      loadComments();
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
          
          // Verificar e ajustar URL para caminho absoluto se necessário
          let videoPath = videoData.file_path;
          
          // Remover prefixo '/api/videos/' se presente
          if (videoPath.startsWith('/api/videos/')) {
            videoPath = videoPath.replace('/api/videos/', '/');
            console.log('Removido prefixo incorreto de URL:', videoPath);
          }
          
          // Garantir que a URL começa com '/'
          if (!videoPath.startsWith('http') && !videoPath.startsWith('/')) {
            videoPath = '/' + videoPath;
            console.log('Convertendo URL do vídeo principal para caminho absoluto:', videoPath);
          }
          
          console.log('URL final de vídeo principal:', videoPath);
          setCurrentVideoUrl(videoPath);
        } else {
          toast.error('Erro ao carregar vídeo');
        }

        // Buscar versões do vídeo
        const versionsResponse = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/versions`);
        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          
          // Ajustar caminhos de arquivo para absolutos, se necessário
          const processedVersions = versionsData.map(version => {
            let videoPath = version.file_path;
            
            // Remover prefixo '/api/videos/' se presente
            if (videoPath && videoPath.startsWith('/api/videos/')) {
              videoPath = videoPath.replace('/api/videos/', '/');
              console.log('Removido prefixo incorreto de URL de versão:', videoPath);
            }
            
            // Garantir que a URL começa com '/'
            if (videoPath && !videoPath.startsWith('http') && !videoPath.startsWith('/')) {
              videoPath = '/' + videoPath;
              console.log('Convertendo URL de versão para caminho absoluto:', videoPath);
            }
            
            version.file_path = videoPath;
            return version;
          });
          
          setVideoVersions(processedVersions);
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
    console.log('Drawing saved in video-player page, data length:', imageData ? imageData.length : 0);
    setTempDrawing(imageData);
  };

  const handleVersionCreated = (newVersion) => {
    // Atualizar a lista de versões
    setVideoVersions(prev => [newVersion, ...prev]);
    toast.success('Nova versão adicionada com sucesso!');
  };

  const handleVersionChange = (version) => {
    console.log('Mudando para versão:', version);
    
    // Atualizar a versão ativa
    setActiveVersion(version);
    
    // Garantir que temos um caminho válido para o vídeo
    if (version && version.file_path) {
      let videoPath = version.file_path;
      
      // Remover prefixo '/api/videos/' se presente
      if (videoPath.startsWith('/api/videos/')) {
        videoPath = videoPath.replace('/api/videos/', '/');
        console.log('Removido prefixo incorreto da URL de versão:', videoPath);
      }
      
      // Verificar se a URL já é absoluta, se não, torná-la absoluta
      if (!videoPath.startsWith('http') && !videoPath.startsWith('/')) {
        videoPath = '/' + videoPath;
        console.log('Convertendo para caminho absoluto:', videoPath);
      }
      
      console.log('URL final da versão:', videoPath);
      setCurrentVideoUrl(videoPath);
    } else {
      console.error('Versão selecionada não tem file_path válido:', version);
    }
    
    // Limpar os comentários atuais para evitar que apareçam comentários de outras versões
    setComments([]);
    console.log('Comentários limpos para evitar exibição incorreta durante a transição');
    
    // Carregar comentários específicos para esta versão
    // (apenas comentários da versão específica)
    console.log('Carregando comentários para versão específica:', version.id);
    loadComments(version.id);
    
    // Adiar a atualização para garantir que o DOM seja atualizado
    setTimeout(() => {
      if (videoRef.current) {
        console.log('Atualizando elemento de vídeo com nova URL');
        // Forçar a recarga do vídeo
        videoRef.current.load();
      }
    }, 100);
    
    // Notificar usuário
    toast.success(`Alterado para ${version.file_path.split('/').pop()}`);
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
      
      // Adicionar version_id ao comentário se houver uma versão ativa
      if (activeVersion) {
        requestBody.version_id = activeVersion.id;
        console.log('Adicionando comentário à versão específica:', activeVersion.id);
      }
      
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

  if (!projectId || !folderId || !videoId) {
    return <div className="text-white p-4">IDs necessários não fornecidos na URL</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {currentVideoUrl && (
            <VideoPlayer
              ref={videoRef}
              key={currentVideoUrl}
              videoUrl={currentVideoUrl}
              comments={comments}
              onDrawingSave={handleDrawingSave}
              tempDrawing={tempDrawing}
              projectId={projectId}
              folderId={folderId}
              videoId={videoId}
              onTimeUpdate={setCurrentTime}
              userData={user}
              onVersionChange={handleVersionChange}
              initialTime={0}
              isPlaying={false}
              versions={videoVersions}
              onVersionCreated={handleVersionCreated}
              initialStatus={videoData?.status || 'new'}
              onStatusChange={handleUpdateStatus}
              onBack={handleBackClick}
            />
          )}
        </div>
        
        {/* Componente de Comentários */}
        <div className="w-96 bg-[#121212] overflow-auto border-l border-[#3F3F3F]">
          <Comments 
            user={user} 
            currentTime={currentTime}
            onTimeClick={(time) => {
              if (videoRef.current) {
                videoRef.current.currentTime = time;
              }
            }}
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
            activeVersion={activeVersion}
          />
        </div>
      </div>
    </div>
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