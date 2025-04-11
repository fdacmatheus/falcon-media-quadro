'use client';
import { useState, useRef, useEffect, forwardRef } from 'react';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';
import VideoAnnotation from './VideoAnnotation';
import VideoDrawingOverlay from './VideoDrawingOverlay';
import ComparisonMode from './ComparisonMode';
import Header from './Header';
import CommentMarker from './CommentMarker';
import { toast } from 'react-hot-toast';

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
  onVersionCreated
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

  useEffect(() => {
    setCommentsCount(comments.length);
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
      if (!videoId) return;
      try {
        const response = await fetch(
          `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/versions`
        );
        if (!response.ok) throw new Error('Falha ao buscar versões');
        const data = await response.json();
        setVideoVersions(data);
      } catch (error) {
        console.error('Erro ao buscar versões:', error);
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
    
    const wasPlaying = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
    
    // Save current playback position
    const currentPosition = videoRef.current?.currentTime || 0;
    
    // Update video URL
    setCurrentVideoUrl(version.file_path);
    setActiveVersion(version);
    
    // Reset loaded state
    setIsLoaded(false);
    
    // When video is loaded, resume from same position with improved timing
    const resumePlayback = () => {
      if (videoRef.current) {
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
      resumePlayback();
      videoRef.current.removeEventListener('loadeddata', handleVideoLoaded);
    };
    
    videoRef.current?.addEventListener('loadeddata', handleVideoLoaded);
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

      setComments(prevComments => [formattedComment, ...prevComments]);
      setTempDrawing(null);
      toast.success('Comment saved successfully!');

    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error(`Error saving comment: ${error.message}`);
    }
  };

  if (showComparison) {
    return (
      <ComparisonMode
        onExit={handleExitComparison}
        userData={localUserData}
        initialLeftUrl={videoUrl}
        initialRightUrl={videoVersions.length > 0 ? videoVersions[0].file_path : ''}
        versions={[
          { id: 'original', file_path: videoUrl, name: 'Original', created_at: new Date().toISOString() },
          ...videoVersions
        ]}
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
              className="w-full h-full object-contain"
              controls={false}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedData}
              onClick={togglePlay}
              playsInline
            >
              <source src={currentVideoUrl} type="video/mp4" />
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
    </div>
  );
});

export default VideoPlayer;