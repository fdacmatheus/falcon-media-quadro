'use client';
import { useState, useRef, useEffect, forwardRef } from 'react';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';
import VideoAnnotation from './VideoAnnotation';
import VideoDrawingOverlay from './VideoDrawingOverlay';
import ComparisonMode from './ComparisonMode';
import Header from './Header';
import CommentMarker from './CommentMarker';
import { toast } from 'react-hot-toast';
import Comments from './Comments';

const VideoPlayer = forwardRef(({ 
  videoUrl, 
  onVideoEnd, 
  onTimeUpdate, 
  onDurationChange,
  initialTime = 0,
  isPlaying: initialIsPlaying = false,
  userData = {},
  versions = [],
  onLogin,
  comments = [],
  onDrawingSave,
  fullWidth = false,
  projectId,
  folderId,
  videoId,
  onBack,
  onStatusChange,
  initialStatus,
  onVersionCreated,
  onVersionChange
}, ref) => {
  const localVideoRef = useRef(null);
  const videoRef = ref || localVideoRef;
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [localUserData, setLocalUserData] = useState(userData);
  const [commentsCount, setCommentsCount] = useState(comments.length);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempDrawing, setTempDrawing] = useState(null);
  const [visibleDrawing, setVisibleDrawing] = useState(null);
  const [commentDrawings, setCommentDrawings] = useState([]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const containerRef = useRef(null);
  const [commentMarkers, setCommentMarkers] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoVersions, setVideoVersions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [activeVersion, setActiveVersion] = useState(null);
  const [localComments, setLocalComments] = useState(comments);

  useEffect(() => {
    setCommentsCount(comments.length);
    setLocalComments(comments);
  }, [comments]);

  useEffect(() => {
    setCurrentVideoUrl(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localUserData?.name) {
      try {
        const savedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (savedUserData?.name) {
          setLocalUserData(savedUserData);
          setUser(savedUserData);
          onLogin?.(savedUserData);
        }
      } catch (error) {
        console.error('Error recovering user data:', error);
      }
    } else if (localUserData?.name) {
      setUser(localUserData);
    }
  }, [localUserData]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
      if (initialIsPlaying) {
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [initialTime, initialIsPlaying]);

  useEffect(() => {
    const markers = comments.map(comment => {
      // Converter e validar o valor de tempo do comentário
      let videoTime = parseFloat(comment.videoTime || comment.video_time || 0);
      
      // Verificar se é um número válido e finito
      if (isNaN(videoTime) || !isFinite(videoTime)) {
        console.warn(`Tempo inválido detectado para o comentário ${comment.id}:`, 
          comment.videoTime || comment.video_time);
        videoTime = 0; // Usar 0 como fallback para valores inválidos
      }
      
      return {
        id: comment.id,
        time: videoTime,
        author: comment.author || comment.user_name,
        text: comment.text
      };
    });
    setCommentMarkers(markers);
  }, [comments]);

  useEffect(() => {
    const fetchVersions = async () => {
      if (!videoId || !projectId || !folderId) {
        console.log('Faltam IDs necessários para buscar versões:', { projectId, folderId, videoId });
        return;
      }
      
      try {
        console.log('Buscando versões para o vídeo:', videoId);
        const response = await fetch(
          `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/versions`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao buscar versões');
        }
        
        const data = await response.json();
        console.log('Versões carregadas:', data);
        
        // Garantir que todas as versões tenham URLs válidas
        const versionsWithUrls = data.map(version => ({
          ...version,
          file_path: version.file_path.startsWith('/api/') 
            ? version.file_path 
            : `/api/videos/${version.file_path}`
        }));
        
        setVideoVersions(versionsWithUrls);
      } catch (error) {
        console.error('Erro ao buscar versões:', error);
        toast.error('Erro ao carregar versões do vídeo');
      }
    };

    fetchVersions();
  }, [videoId, projectId, folderId]);

  useEffect(() => {
    // Extract drawings from comments
    if (comments && comments.length > 0) {
      console.log('Processando desenhos de comentários, total:', comments.length);
      try {
        const drawings = comments
          .filter(comment => {
            // Log para debug de cada comentário com desenho
            if (comment.drawing || comment.drawing_data) {
              console.log('Comentário com desenho encontrado:', { 
                id: comment.id, 
                hasDrawing: !!comment.drawing,
                hasDrawingData: !!comment.drawing_data,
                videoTime: comment.videoTime || comment.video_time
              });
            }
            return comment.drawing || comment.drawing_data;
          })
          .map(comment => {
            // Handle different formats
            let drawing = null;
            
            // Primeiro tentar usar o campo drawing se existir
            if (comment.drawing) {
              // Se drawing for string, tentar parse
              if (typeof comment.drawing === 'string') {
                try {
                  drawing = JSON.parse(comment.drawing);
                  console.log('Drawing parseado com sucesso de string JSON');
                } catch (e) {
                  // Se falhar, usar como uma string direta
                  drawing = { imageData: comment.drawing };
                  console.log('Drawing como string direta');
                }
              } else {
                // Já é um objeto
                drawing = comment.drawing;
                console.log('Drawing já é um objeto');
              }
            } 
            // Se não tiver drawing, usar drawing_data
            else if (comment.drawing_data) {
              // Se for string, tentar parse
              if (typeof comment.drawing_data === 'string') {
                try {
                  drawing = JSON.parse(comment.drawing_data);
                  console.log('Drawing_data parseado com sucesso');
                } catch (e) {
                  // Se falhar, usar como uma string direta
                  drawing = { imageData: comment.drawing_data };
                  console.log('Drawing como string direta');
                }
              } else if (typeof comment.drawing_data === 'object') {
                drawing = comment.drawing_data;
                console.log('Drawing_data já é um objeto');
              }
            }
            
            if (!drawing) {
              console.log('Nenhum desenho válido encontrado para o comentário:', comment.id);
              return null;
            }
            
            // Garantir que temos imageData para renderizar
            let imageData = drawing.imageData || drawing;
            if (typeof imageData === 'object' && imageData !== null) {
              // Se imageData for um objeto e não uma string, usar o primeiro valor não nulo
              // Isso trata o caso em que temos um objeto aninhado
              imageData = Object.values(imageData).find(v => v !== null && v !== undefined) || '';
              console.log('Extraiu imageData de objeto complexo');
            }
            
            // Garantir que timestamp seja um número válido
            let timestamp = 0;
            try {
              timestamp = parseFloat(drawing.timestamp || comment.videoTime || comment.video_time || 0);
              if (isNaN(timestamp) || !isFinite(timestamp)) {
                console.warn(`Timestamp inválido para o desenho do comentário ${comment.id}, usando 0`);
                timestamp = 0;
              }
            } catch (e) {
              console.error('Erro ao processar timestamp do desenho:', e);
              timestamp = 0;
            }
            
            console.log(`Desenho processado para comentário ${comment.id}:`, { 
              dataLength: typeof imageData === 'string' ? imageData.length : 'não é string',
              timestamp 
            });
            
            if (!imageData || typeof imageData !== 'string' || imageData.length < 10) {
              console.log('Dados de imagem inválidos para o desenho');
              return null;
            }
            
            return {
              id: comment.id,
              imageData: imageData,
              timestamp: timestamp
            };
          })
          .filter(Boolean);
        
        console.log('Extracted drawings from comments:', drawings.length);
        setCommentDrawings(drawings);
      } catch (error) {
        console.error('Erro ao processar desenhos de comentários:', error);
      }
    } else {
      console.log('Nenhum comentário com desenho encontrado');
    }
  }, [comments]);

  // Function to switch between video versions
  const handleVersionChange = (version) => {
    console.log('Switching to version:', version);
    
    if (!version || !version.file_path) {
      console.error('Versão inválida ou sem file_path:', version);
      return;
    }
    
    const wasPlaying = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
    
    // Save current playback position
    const currentPosition = videoRef.current?.currentTime || 0;
    
    // Corrigir URL do vídeo
    let videoPath = version.file_path;
    
    // Remover prefixo '/api/videos/' se estiver presente
    if (videoPath.startsWith('/api/videos/')) {
      videoPath = videoPath.replace('/api/videos/', '/');
      console.log('Removido prefixo incorreto da URL de versão:', videoPath);
    }
    
    // Verificar se a URL já é absoluta, se não, torná-la absoluta
    if (!videoPath.startsWith('http') && !videoPath.startsWith('/')) {
      videoPath = '/' + videoPath;
      console.log('Convertendo para caminho absoluto:', videoPath);
    }
    
    console.log('URL final da versão após processamento:', videoPath);
    setCurrentVideoUrl(videoPath);
    setActiveVersion(version);
    
    // Expor a versão ativa através do videoRef para que o componente pai possa acessá-la
    if (videoRef.current) {
      videoRef.current.activeVersion = version;
    }
    
    // Notify parent about version change
    if (onVersionChange) {
      console.log('Notifying parent component about version change');
      onVersionChange(version);
    }
    
    // Reset loaded state
    setIsLoaded(false);
    
    // When video is loaded, resume from same position with improved timing
    const resumePlayback = () => {
      if (videoRef.current) {
        console.log('Video element loaded, setting currentTime to:', currentPosition);
        videoRef.current.currentTime = currentPosition;
        
        // If it was playing, resume playback
        if (wasPlaying) {
          const playPromise = videoRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                console.log('Playback resumed successfully');
              })
              .catch(error => {
                console.error('Error resuming playback:', error);
                setIsPlaying(false);
              });
          }
        }
      }
    };

    // Use the loadeddata event instead of setTimeout
    const handleVideoLoaded = () => {
      console.log('Video loaded event triggered');
      resumePlayback();
      videoRef.current.removeEventListener('loadeddata', handleVideoLoaded);
    };
    
    if (videoRef.current) {
      console.log('Adding loadeddata event listener');
      videoRef.current.addEventListener('loadeddata', handleVideoLoaded);
      
      // Adicionar um timeout como fallback
      setTimeout(() => {
        if (!isLoaded && videoRef.current) {
          console.log('Timeout fallback: forcing video load');
          videoRef.current.load();
        }
      }, 500);
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current || !isLoaded) return;

    try {
      if (isPlaying) {
        setIsPlaying(false);
        await videoRef.current.pause();
      } else {
        setIsPlaying(true);
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      setIsPlaying(false);
      videoRef.current?.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
    
    // Check if we should show a drawing based on timestamp
    if (commentDrawings.length > 0) {
      try {
        // Define um limiar para considerar estar "no mesmo timestamp"
        // Maior valor para ser mais tolerante (1 segundo)
        const THRESHOLD = 1.0;
        
        // Garantir que estamos comparando com números válidos
        const validDrawings = commentDrawings.filter(drawing => {
          const timestamp = parseFloat(drawing.timestamp);
          return !isNaN(timestamp) && isFinite(timestamp);
        });
        
        // Encontrar desenhos relevantes para o timestamp atual
        const relevantDrawing = validDrawings.find(
          drawing => Math.abs(parseFloat(drawing.timestamp) - time) < THRESHOLD
        );
        
        if (relevantDrawing) {
          if (visibleDrawing !== relevantDrawing.imageData) {
            console.log('Showing drawing at timestamp:', relevantDrawing.timestamp, 'current time:', time);
            setVisibleDrawing(relevantDrawing.imageData);
          }
        } else if (visibleDrawing && !isDrawing) {
          // Esconder o desenho quando estamos fora do intervalo de tempo
          console.log('Hiding drawing - out of timestamp range, current time:', time);
          setVisibleDrawing(null);
        }
      } catch (error) {
        console.error('Erro ao verificar desenhos no timestamp:', error);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const videoRatio = video.videoWidth / video.videoHeight;
    
    setAspectRatio(videoRatio >= 1 ? '16:9' : '9:16');
    
    const duration = video.duration;
    setDuration(duration);
    onDurationChange?.(duration);
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    onVideoEnd?.();
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCompareClick = () => {
    if (!videoVersions.length) {
      toast.error('Não há versões disponíveis para comparação');
      return;
    }

    console.log('Iniciando modo de comparação com:', {
      videoUrl,
      versionsCount: videoVersions.length,
      firstVersionUrl: videoVersions[0]?.file_path
    });

    // Garantir que todas as versões tenham URLs válidas
    const processedVersions = videoVersions.map(version => {
      let processedUrl = version.file_path;
      
      // Remover prefixo /api/videos/ se presente
      if (processedUrl.startsWith('/api/videos/')) {
        processedUrl = processedUrl.replace('/api/videos/', '/');
      }
      
      // Garantir que é um caminho absoluto
      if (!processedUrl.startsWith('http') && !processedUrl.startsWith('/')) {
        processedUrl = '/' + processedUrl;
      }

      return {
        ...version,
        file_path: processedUrl,
        label: `V${version.id.substring(0, 8)}`,
        author: version.author || 'Unknown',
        date: new Date(version.created_at).toLocaleString(),
        duration: version.duration ? formatTime(version.duration) : '00:00'
      };
    });

    // Processar URL do vídeo original
    let originalUrl = videoUrl;
    if (originalUrl.startsWith('/api/videos/')) {
      originalUrl = originalUrl.replace('/api/videos/', '/');
    }
    if (!originalUrl.startsWith('http') && !originalUrl.startsWith('/')) {
      originalUrl = '/' + originalUrl;
    }

    const allVersions = [
      { 
        id: 'original', 
        label: 'Original',
        file_path: originalUrl,
        author: 'Original',
        date: new Date().toLocaleString(),
        duration: duration ? formatTime(duration) : '00:00'
      },
      ...processedVersions
    ];

    console.log('Versões processadas para comparação:', allVersions);
    setShowComparison(true);
  };

  const handleExitComparison = () => {
    setShowComparison(false);
  };
  
  // Funções de drag and drop para versões
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const startDrawing = () => {
    console.log('Starting drawing mode');
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
    
    // Limpar qualquer desenho anterior antes de iniciar um novo
    setTempDrawing(null);
    
    // Ativar modo de desenho
    setIsDrawing(true);
  };
  
  const handleDrawingSave = (imageData) => {
    console.log('Drawing saved in VideoPlayer, data length:', imageData ? imageData.length : 0);
    
    // Verificar se temos dados válidos
    const isValidData = imageData && typeof imageData === 'string' && imageData.length > 0;
    
    if (isValidData) {
      console.log('Setting valid temp drawing data');
      setTempDrawing(imageData);
      
      // Notificar o componente pai
      if (onDrawingSave) {
        console.log('Notifying parent component about drawing');
        onDrawingSave(imageData);
      }
    } else {
      console.log('Invalid drawing data received, using fallback');
      // Usar um valor fallback para garantir que temos sempre algo
      const fallbackData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      setTempDrawing(fallbackData);
      
      if (onDrawingSave) {
        onDrawingSave(fallbackData);
      }
    }
    
    setIsDrawing(false);
  };
  
  const handleDrawingCancel = () => {
    console.log('Drawing cancelled');
    setIsDrawing(false);
    setTempDrawing(null);
  };
  
  // Adicionar efeito para detectar evento de iniciar desenho
  useEffect(() => {
    const handleStartDrawingEvent = () => {
      console.log('Received startDrawing event');
      startDrawing();
    };
    
    window.addEventListener('startDrawing', handleStartDrawingEvent);
    
    return () => {
      window.removeEventListener('startDrawing', handleStartDrawingEvent);
    };
  }, []);
  
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!videoId) {
      toast.error('Video ID not found');
      return;
    }
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      toast.error('Only video files are allowed');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      toast.loading('Uploading new version...');
      const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/versions`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating version');
      }
      
      const data = await response.json();
      toast.dismiss();
      toast.success('New version created successfully!');
      
      // Atualizar lista de versões
      setVideoVersions(prev => [data, ...prev]);
      onVersionCreated?.(data);
    } catch (error) {
      toast.dismiss();
      console.error('Error creating version:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleCommentSubmit = async (comment) => {
    try {
      if (!videoId || !user) {
        toast.error('Error: User not logged in or video not selected');
        return;
      }

      const commentData = {
        text: comment.text,
        author: user?.name || 'Anonymous',
        email: user?.email || 'anonymous@example.com',
        videoTime: currentTime,
        drawing: tempDrawing,
        parentId: comment.parentId || null
      };
      
      // Adicionar version_id se tiver uma versão ativa
      if (activeVersion) {
        commentData.version_id = activeVersion.id;
        console.log('Adicionando comentário à versão:', activeVersion.id);
      }

      console.log('Sending comment:', { projectId, folderId, videoId, commentData });

      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(commentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Error saving comment');
      }

      const savedComment = await response.json();
      console.log('Comment saved:', savedComment);

      // Formatar o comentário para corresponder à estrutura esperada pelo frontend
      const formattedComment = {
        ...savedComment,
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

      setLocalComments(prevComments => [formattedComment, ...prevComments]);
      setTempDrawing(null);
      toast.success('Comment saved successfully!');

    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error(`Error saving comment: ${error.message}`);
    }
  };

  useEffect(() => {
    console.log('VideoPlayer - currentVideoUrl changed to:', currentVideoUrl);
    
    // Garantir que temos uma URL válida
    if (!currentVideoUrl) {
      console.error('URL de vídeo inválida ou vazia');
      return;
    }
    
    // Convertendo para URL absoluta e removendo prefixo /api/videos se presente
    let absoluteUrl = currentVideoUrl;
    if (absoluteUrl.startsWith('/api/videos/')) {
      absoluteUrl = absoluteUrl.replace('/api/videos/', '/');
      console.log('Corrigindo URL com prefixo incorreto:', absoluteUrl);
    }
    
    if (!absoluteUrl.startsWith('http') && !absoluteUrl.startsWith('/')) {
      absoluteUrl = '/' + absoluteUrl;
      console.log('Convertendo para URL absoluta:', absoluteUrl);
    }
    
    // Se estamos no servidor de desenvolvimento e acessando por IP
    if (typeof window !== 'undefined' && window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      const serverURL = window.location.origin;
      // Se a URL já estiver completa não precisamos fazer nada
      if (!absoluteUrl.startsWith('http')) {
        absoluteUrl = serverURL + absoluteUrl;
        console.log('URL completa com endereço do servidor:', absoluteUrl);
      }
    }
    
    // Cada vez que a URL do vídeo muda, garantir que o elemento de vídeo seja atualizado
    if (videoRef.current && absoluteUrl) {
      const video = videoRef.current;
      
      // Se a URL atual for diferente da que está no src
      const currentSrc = video.querySelector('source')?.src || video.src;
      if (currentSrc !== absoluteUrl) {
        console.log('Source URL differs, updating video element from', currentSrc, 'to', absoluteUrl);
        
        // Atualizar a fonte do vídeo
        if (video.querySelector('source')) {
          video.querySelector('source').src = absoluteUrl;
        } else {
          video.src = absoluteUrl;
        }
        
        // Recarregar o vídeo
        console.log('Recarregando vídeo');
        video.load();
      }
    }
  }, [currentVideoUrl]);

  const loadCommentsForVersion = async (versionId) => {
    if (!selectedVideo?.id) {
      console.error('Não foi possível carregar comentários: vídeo não selecionado');
      return;
    }
    
    try {
      console.log('Carregando comentários para versão:', versionId);
      // Limpar comentários atuais enquanto carrega novos
      setComments([]); 
      
      let url = `/api/projects/${projectId}/folders/${folderId}/videos/${selectedVideo.id}/comments`;
      if (versionId) {
        url += `?versionId=${versionId}`;
      }
      
      console.log('URL da requisição de comentários:', url);
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || `Erro ${response.status} ao carregar comentários`);
      }
      
      const data = await response.json();
      console.log(`${data.length} comentários carregados para versão ${versionId || 'original'}`);
      
      // Processar os comentários recebidos
      const processedComments = data.map(comment => ({
        ...comment,
        videoTime: parseFloat(comment.video_time || 0) || 0,
        author: comment.user_name || 'Anônimo',
        email: comment.user_email || 'anonymous@example.com',
        timestamp: comment.created_at,
        likes: parseInt(comment.likes) || 0,
        likedBy: comment.liked_by ? JSON.parse(comment.liked_by) : [],
        replies: [],
        resolved: Boolean(comment.resolved),
        drawing: comment.drawing_data ? JSON.parse(comment.drawing_data) : null
      }));
      
      // Verificar se a versão ativa ainda é a mesma
      if ((!versionId && !activeVersion) || (activeVersion && versionId === activeVersion.id)) {
        console.log('Atualizando comentários na interface');
        setComments(processedComments);
      } else {
        console.warn('Versão ativa mudou durante o carregamento, ignorando comentários');
      }
    } catch (error) {
      console.error('Erro ao carregar comentários por versão:', error);
      toast.error(`Erro ao carregar comentários: ${error.message}`);
    }
  };

  if (showComparison) {
    const allVersions = [
      { 
        id: 'original', 
        label: 'Original',
        file_path: videoUrl,
        author: 'Original',
        date: new Date().toLocaleString(),
        duration: duration ? formatTime(duration) : '00:00'
      },
      ...videoVersions.map(version => ({
        ...version,
        label: `V${version.id.substring(0, 8)}`,
        author: version.author || 'Unknown',
        date: new Date(version.created_at).toLocaleString(),
        duration: version.duration ? formatTime(version.duration) : '00:00'
      }))
    ];

    return (
      <ComparisonMode
        onExit={handleExitComparison}
        userData={localUserData}
        initialLeftUrl={videoUrl}
        initialRightUrl={videoVersions[0]?.file_path || ''}
        versions={allVersions}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <Header
        title={videoUrl ? videoUrl.split('/').pop() : 'Loading...'}
        commentsCount={comments.length}
        videoUrl={videoUrl}
        onBack={onBack}
        projectId={projectId}
        folderId={folderId}
        videoId={videoId}
        onStatusChange={onStatusChange}
        initialStatus={initialStatus}
        versions={videoVersions}
        onVersionChange={handleVersionChange}
        onCompareClick={handleCompareClick}
      />
      
      {/* Indicador de versão ativa */}
      {activeVersion && (
        <div className="bg-[#1A1A1A] px-4 py-2 text-sm flex items-center justify-between">
          <div className="text-white flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span>
              Exibindo: {activeVersion.file_path ? activeVersion.file_path.split('/').pop() : 'Versão ' + activeVersion.id.substring(0, 8)}
            </span>
          </div>
          <span className="text-gray-400 text-xs">
            Criado em: {new Date(activeVersion.created_at).toLocaleString()}
          </span>
        </div>
      )}
      
      <div 
        className="flex-1 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 border-2 border-dashed border-red-500">
            <div className="text-center">
              <p className="text-xl font-semibold text-white">Drop to create a new version</p>
              <p className="text-sm text-gray-300 mt-2">Drag a video file</p>
            </div>
          </div>
        )}
      
        <div 
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center bg-black"
        >
          <div className={`relative ${
            aspectRatio === '16:9' 
              ? 'w-full h-full' 
              : 'h-full aspect-[9/16] max-w-[calc(100vh*0.5625)]'
          }`}>
            <video
              ref={videoRef}
              className={`w-full h-full object-contain ${isDrawing ? 'cursor-crosshair' : 'cursor-pointer'}`}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedData}
              onClick={togglePlay}
              playsInline
              key={currentVideoUrl}
              onError={(e) => {
                const errorMessage = e.target.error ? e.target.error.message : 'Erro desconhecido';
                console.error('Erro ao carregar vídeo:', errorMessage, 'URL:', currentVideoUrl);
                toast.error('Erro ao carregar o vídeo. Verifique o URL ou tente novamente.');
              }}
            >
              <source 
                src={(() => {
                  // Processar URL para garantir que esteja correta
                  let url = currentVideoUrl;
                  
                  // Remover prefixo incorreto se presente
                  if (url && url.startsWith('/api/videos/')) {
                    url = url.replace('/api/videos/', '/');
                    console.log('Prefixo incorreto removido do URL do vídeo:', url);
                  }
                  
                  // Garantir que é um caminho absoluto
                  if (url && !url.startsWith('http') && !url.startsWith('/')) {
                    url = '/' + url;
                  }
                  
                  // Se estamos no servidor de desenvolvimento e acessando por IP
                  if (typeof window !== 'undefined' && window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
                    const serverURL = window.location.origin;
                    // Se a URL já estiver completa não precisamos fazer nada
                    if (!url.startsWith('http')) {
                      url = serverURL + url;
                      console.log('URL completa com endereço do servidor:', url);
                    }
                  }
                  
                  console.log('URL final processada para source:', url);
                  return url;
                })()} 
                type="video/mp4" 
              />
              Seu navegador não suporta vídeos.
            </video>

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute top-0 right-0 bg-black bg-opacity-70 text-white p-2 text-xs">
                Drawing: {isDrawing ? 'On' : 'Off'}<br />
                Temp Drawing: {tempDrawing ? 'Present' : 'None'}<br />
                Visible Drawing: {visibleDrawing ? 'Visible' : 'Hidden'}<br />
                Drawings: {commentDrawings.length}
              </div>
            )}

            <VideoAnnotation
              isVisible={!!visibleDrawing || !!tempDrawing}
              annotation={isDrawing ? tempDrawing : visibleDrawing}
            />
            
            {/* Video Drawing Overlay - Active when isDrawing is true */}
            <VideoDrawingOverlay 
              videoRef={videoRef}
              isDrawing={isDrawing}
              onSave={handleDrawingSave}
              onCancel={handleDrawingCancel}
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="text-white hover:text-[#D00102] transition-colors"
              disabled={!isLoaded}
            >
              {isPlaying ? (
                <PauseIcon className="w-8 h-8" />
              ) : (
                <PlayIcon className="w-8 h-8" />
              )}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, currentTime - 10);
                }
              }}
              className="text-white hover:text-[#D00102] transition-colors"
            >
              <BackwardIcon className="w-6 h-6" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.min(duration, currentTime + 10);
                }
              }}
              className="text-white hover:text-[#D00102] transition-colors"
            >
              <ForwardIcon className="w-6 h-6" />
            </button>

            <div className="flex-1 relative">
              <div className="relative w-full h-8">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer top-1/2 -translate-y-1/2"
                  style={{
                    background: `linear-gradient(to right, #D00102 0%, #D00102 ${
                      (currentTime / duration) * 100
                    }%, #3F3F3F ${
                      (currentTime / duration) * 100
                    }%, #3F3F3F 100%)`
                  }}
                />
                {commentMarkers.map((marker) => (
                  <CommentMarker
                    key={marker.id}
                    comment={marker}
                    position={(marker.time / duration) * 100}
                    onHover={() => {}}
                    onLeave={() => {}}
                    onClick={() => {
                      if (videoRef.current) {
                        // Garantir que o tempo é válido antes de atribuir
                        const safeTime = parseFloat(marker.time);
                        if (!isNaN(safeTime) && isFinite(safeTime)) {
                          videoRef.current.currentTime = safeTime;
                        } else {
                          console.warn("Tempo inválido no marcador:", marker);
                        }
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="text-white text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {videoVersions.length > 0 && (
              <button
                onClick={handleCompareClick}
                className="text-white hover:text-[#D00102] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="mt-2 text-sm text-gray-400">
            {videoVersions.length > 0 ? (
              <span>
                {videoVersions.length} {videoVersions.length === 1 ? 'version' : 'versions'} available - Drag a new video here to create another version
                {activeVersion && (
                  <span className="ml-2 text-white">
                    Currently viewing: {activeVersion.id === 'original' ? 'Original' : `Version ${videoVersions.findIndex(v => v.id === activeVersion.id) + 1}`}
                  </span>
                )}
              </span>
            ) : (
              <span>Drag a video here to create a new version</span>
            )}
          </div>
        </div>
      </div>

      {/* Estrutura de controles do player */}
      <div className="relative bg-black p-4">
        {/* ... existing controls code ... */}
      </div>
    </div>
  );
});

export default VideoPlayer;