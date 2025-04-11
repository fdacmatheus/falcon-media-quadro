'use client';
import { useState, useEffect, useRef } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const Comments = ({ 
  user, 
  currentTime = 0, 
  onTimeClick, 
  comments = [], 
  setComments, 
  onNewComment, 
  tempDrawing, 
  onClearDrawing,
  videoId,
  projectId,
  folderId,
  onCommentSubmit,
  activeVersion
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitBtnRef = useRef(null);

  // Efeito para garantir que o botão de submit seja registrado corretamente
  useEffect(() => {
    console.log('Componente Comments montado, configurando listeners');
    console.log('IDs disponíveis:', { projectId, folderId, videoId });
    console.log('Estado atual do tempDrawing:', tempDrawing ? 'Presente' : 'Ausente');
    
    // REMOÇÃO do Timeout e event listeners adicionais
    // Vamos simplificar e usar apenas o onClick direto no botão
    
  }, [projectId, folderId, videoId]); // Removidas dependências que causavam re-renderização excessiva

  // Adicionar logs para ajudar na depuração da versão ativa
  useEffect(() => {
    if (activeVersion) {
      console.log('Comments: Versão ativa alterada para:', activeVersion);
      console.log('Comentários atuais:', comments.length);
    }
  }, [activeVersion, comments]);

  // Função para fazer chamada direta à API
  const makeDirectAPICall = async (comment) => {
    console.log('Iniciando chamada direta à API com IDs:', {projectId, folderId, videoId});
    
    if (!projectId || !folderId || !videoId) {
      console.error('Faltam IDs necessários:', { projectId, folderId, videoId });
      throw new Error('IDs necessários não encontrados');
    }
    
    // Preparar dados para a API de forma simplificada
    const requestBody = {
      text: comment.text || '',
      user_name: user?.name || comment.author || 'Anônimo',
      user_email: user?.email || comment.email || 'anonymous@example.com',
      video_time: comment.videoTime || parseFloat(currentTime) || 0,
      parentId: comment.parentId || null,
      project_id: projectId,
      folder_id: folderId,
      video_id: videoId,
      drawing_data: comment.drawing ? 
        (typeof comment.drawing === 'string' ? comment.drawing : JSON.stringify(comment.drawing)) : null
    };
    
    console.log('Enviando para a API:', requestBody);
    
    try {
      // Fazer chamada à API com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na chamada à API:', errorText);
        throw new Error(`Falha ao salvar comentário: ${response.status}`);
      }
      
      const savedComment = await response.json();
      console.log('Comentário salvo com sucesso:', savedComment);
      
      return savedComment;
    } catch (error) {
      console.error('Erro na chamada à API:', error);
      // Não fazer toast aqui para evitar duplicação
      throw error;
    }
  };

  const formatVideoTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === null || !isFinite(timeInSeconds)) return '0:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('FORM SUBMIT TRIGGERED!');
    console.log('New comment text:', newComment);
    console.log('Has drawing:', !!tempDrawing);
    console.log('IDs para envio:', { projectId, folderId, videoId });
    
    // Verificação adicional para debug
    if (!tempDrawing) {
      console.log('tempDrawing é falso (null/undefined)');
    } else {
      console.log('tempDrawing está presente com dados, comprimento:', tempDrawing.length);
    }
    
    // Verificar se há conteúdo para enviar
    const hasText = newComment.trim().length > 0;
    const hasDrawing = tempDrawing !== null && tempDrawing !== undefined;
    
    console.log('Verificação de conteúdo:', { hasText, hasDrawing });
    
    if (!hasText && !hasDrawing) {
      console.log('Sem conteúdo para enviar (texto ou desenho)');
      toast.error('Adicione um comentário ou desenho antes de enviar');
      return;
    }

    try {
      // Enviar o comentário diretamente via fetch
      console.log('Enviando comentário diretamente via fetch');

      if (!projectId || !folderId || !videoId) {
        console.error('Faltam IDs necessários:', { projectId, folderId, videoId });
        toast.error('Erro: IDs necessários não encontrados');
        return;
      }

      // Verificar e normalizar o tempo atual
      let safeCurrentTime = 0;
      try {
        safeCurrentTime = parseFloat(currentTime);
        if (isNaN(safeCurrentTime) || !isFinite(safeCurrentTime)) {
          console.warn('currentTime inválido:', currentTime, 'usando 0');
          safeCurrentTime = 0;
        }
      } catch (e) {
        console.error('Erro ao processar currentTime:', e);
        safeCurrentTime = 0;
      }

      // Preparar o formato correto para o desenho
      let drawingDataJson = null;
      if (tempDrawing) {
        try {
          // Verificar se já é um JSON válido
          const testParse = JSON.parse(tempDrawing);
          
          // Verificar se o timestamp é válido
          if (testParse.timestamp !== undefined) {
            let timestamp = parseFloat(testParse.timestamp);
            if (isNaN(timestamp) || !isFinite(timestamp)) {
              console.warn('Timestamp inválido no objeto de desenho, corrigindo');
              testParse.timestamp = safeCurrentTime;
              drawingDataJson = JSON.stringify(testParse);
            } else {
              // Se for válido, manter o JSON original
              drawingDataJson = tempDrawing;
            }
          } else {
            // Se não tiver timestamp, adicionar
            testParse.timestamp = safeCurrentTime;
            drawingDataJson = JSON.stringify(testParse);
          }
          
          console.log('tempDrawing processado como JSON válido');
        } catch (e) {
          // Se não for JSON válido, é uma string de imagem direta
          // Criar objeto no formato esperado
          const drawingObj = {
            imageData: tempDrawing,
            timestamp: safeCurrentTime
          };
          drawingDataJson = JSON.stringify(drawingObj);
          console.log('Convertido tempDrawing para formato objeto com timestamp');
        }
      }

      // Preparar dados para o backend
      const requestBody = {
        text: newComment.trim(),
        user_name: user?.name || 'Anônimo',
        user_email: user?.email || 'anonymous@example.com',
        video_time: safeCurrentTime,
        parentId: null,
        project_id: projectId,
        folder_id: folderId,
        video_id: videoId,
        drawing_data: drawingDataJson
      };

      // Incluir version_id se houver uma versão ativa
      if (activeVersion) {
        requestBody.version_id = activeVersion.id;
        console.log('Adicionando version_id ao comentário:', activeVersion.id);
      }

      console.log('Request body para API:', {
        ...requestBody,
        video_time: safeCurrentTime,
        drawing_data: drawingDataJson ? 'Presente' : 'Ausente'
      });

      // Fazer a chamada fetch diretamente
      const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta do servidor:', errorText);
        throw new Error(`Falha ao salvar comentário: ${response.status} ${errorText}`);
      }

      const savedComment = await response.json();
      console.log('Comentário salvo com sucesso:', savedComment);

      // Formatar o comentário para a interface
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

      // Atualizar a interface
      setComments(prevComments => [formattedComment, ...prevComments]);
      setNewComment('');
      if (onClearDrawing) {
        onClearDrawing();
      }
      
      toast.success('Comentário adicionado com sucesso!');
      
      // REMOVER a chamada a onCommentSubmit e onNewComment para evitar duplicação
      // Essas funções já são chamadas pelo componente pai quando a lista de comentários muda
    } catch (error) {
      console.error('Erro ao salvar comentário:', error);
      toast.error('Erro ao salvar comentário: ' + error.message);
    }
  };

  const handleReplySubmit = async (e, parentComment) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const reply = {
        text: replyText,
        author: user?.name || 'Anonymous',
        email: user?.email || 'anonymous@example.com',
        videoTime: parseFloat(currentTime) || 0,
        parentId: parentComment.id,
        drawing: null
      };

      console.log('Enviando reply:', reply);

      // Criar uma versão formatada do reply para atualização local
      const formattedReply = {
        id: Date.now(), // ID temporário
        text: replyText,
        author: user?.name || 'Anonymous',
        email: user?.email || 'anonymous@example.com',
        videoTime: parseFloat(currentTime) || 0,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        replies: [],
        resolved: false
      };

      // Atualizar o estado local dos comentários
      if (setComments) {
        setComments(prevComments => {
          const updateCommentsRecursively = (comments, targetId) => {
            return comments.map(comment => {
              if (comment.id === targetId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), formattedReply]
                };
              }
              if (comment.replies?.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentsRecursively(comment.replies, targetId)
                };
              }
              return comment;
            });
          };

          return updateCommentsRecursively(prevComments, parentComment.id);
        });
      }

      // Enviar para o servidor usando onCommentSubmit
      if (onCommentSubmit) {
        onCommentSubmit(reply);
      }
      
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
    }
  };

  const handleLike = async (commentId, isReply = false, parentId = null) => {
    if (!user?.email) return;

    try {
      // Encontrar o comentário para obter os IDs necessários
      const findComment = (comments, targetId) => {
        for (const comment of comments) {
          if (comment.id === targetId) return comment;
          if (comment.replies?.length > 0) {
            const found = findComment(comment.replies, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const targetComment = findComment(comments, commentId);
      if (!targetComment) return;

      const response = await fetch(`/api/projects/${targetComment.project_id}/folders/${targetComment.folder_id}/videos/${videoId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar like');
      }

      const updatedComment = await response.json();

      const updateComment = (comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: updatedComment.likes,
            likedBy: updatedComment.liked_by ? JSON.parse(updatedComment.liked_by) : []
          };
        }
        if (comment.replies?.length > 0) {
          return {
            ...comment,
            replies: comment.replies.map(reply => updateComment(reply))
          };
        }
        return comment;
      };

      if (setComments) {
        setComments(prevComments => prevComments.map(comment => updateComment(comment)));
      }
    } catch (error) {
      console.error('Erro ao atualizar like:', error);
      // Aqui você pode adicionar uma notificação de erro para o usuário se desejar
    }
  };

  const handleResolve = (commentId, isReply = false, parentId = null) => {
    const updateComment = (comment) => ({
      ...comment,
      resolved: !comment.resolved
    });

    const updateCommentsRecursively = (comments, targetId) => {
      return comments.map(comment => {
        if (comment.id === targetId) {
          return updateComment(comment);
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentsRecursively(comment.replies, targetId)
          };
        }
        return comment;
      });
    };

    if (setComments) {
      setComments(updateCommentsRecursively(comments, commentId));
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      console.log('Trying to delete comment:', { projectId, folderId, videoId, commentId });
      
      // Atualizar o estado local primeiro para feedback imediato
      if (setComments) {
        setComments(prevComments => {
          const removeCommentRecursively = (comments, targetId) => {
            return comments.filter(comment => {
              if (comment.id === targetId) return false;
              if (comment.replies?.length > 0) {
                comment.replies = removeCommentRecursively(comment.replies, targetId);
              }
              return true;
            });
          };

          return removeCommentRecursively(prevComments, commentId);
        });
      }

      // Fazer a requisição para o servidor
      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments/${commentId}`,
        {
          method: 'DELETE'
        }
      );

      // Se a resposta for 204 (No Content) ou 200 (OK), consideramos sucesso
      if (response.status === 204 || response.status === 200) {
        toast.success('Comment deleted successfully!');
        return;
      }

      // Se chegou aqui, houve um erro
      let errorMessage = 'Failed to delete comment';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.log('Could not read response body:', e);
      }

      // Se houver erro, revertemos a atualização do estado local
      if (setComments) {
        setComments(prevComments => {
          const addCommentBack = (comments, targetId) => {
            // Aqui você precisaria ter o comentário original para adicionar de volta
            // Por enquanto, apenas mostramos o erro
            return comments;
          };

          return addCommentBack(prevComments, commentId);
        });
      }

      toast.error(errorMessage);
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error deleting comment');
    }
  };

  const handleEdit = async (commentId, newText) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/comments/${commentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: newText })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      const updatedComment = await response.json();

      // Atualizar o estado local com o comentário editado
      if (setComments) {
        setComments(prevComments => {
          const updateCommentRecursively = (comments, targetId) => {
            return comments.map(comment => {
              if (comment.id === targetId) {
                return {
                  ...comment,
                  text: newText
                };
              }
              if (comment.replies?.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentRecursively(comment.replies, targetId)
                };
              }
              return comment;
            });
          };

          return updateCommentRecursively(prevComments, commentId);
        });
      }

      setEditingComment(null);
      setEditText('');
      toast.success('Comment updated successfully!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Error updating comment');
    }
  };

  const CommentItem = ({ comment, isReply = false, parentId = null }) => {
    // Definir autor padrão e likedBy padrão se não existirem
    const authorName = comment.author || comment.user_name || 'matheus';
    const firstLetter = authorName.charAt(0) || 'M';
    
    // Garantir que likedBy seja sempre um array
    const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : 
      (comment.liked_by ? JSON.parse(comment.liked_by) : []);
    
    // Verificar se o usuário deu like de forma segura
    const isLikedByUser = user?.email && likedBy.includes(user.email);

    // Garantir que replies seja sempre um array
    const replies = Array.isArray(comment.replies) ? comment.replies : [];

    // Verificar se o usuário é o autor do comentário
    const isAuthor = user?.email && (
      user.email === comment.email || 
      user.email === comment.user_email
    );

    // Validar o timestamp do vídeo para exibição
    let validVideoTime = 0;
    try {
      validVideoTime = parseFloat(comment.videoTime || comment.video_time || 0);
      if (isNaN(validVideoTime) || !isFinite(validVideoTime)) {
        validVideoTime = 0;
      }
    } catch (e) {
      console.error('Erro ao processar tempo do vídeo para comentário:', comment.id);
      validVideoTime = 0;
    }
    
    // Verificar se o comentário tem desenho em qualquer formato possível
    let hasDrawing = false;
    let drawingData = null;
    let drawingTimestamp = validVideoTime;
    
    // Verificar diversas possibilidades de onde o desenho pode estar
    if (comment.drawing) {
      hasDrawing = true;
      if (typeof comment.drawing === 'object') {
        drawingData = comment.drawing;
        if (comment.drawing.timestamp) {
          drawingTimestamp = parseFloat(comment.drawing.timestamp) || validVideoTime;
        }
      } else if (typeof comment.drawing === 'string') {
        hasDrawing = true;
        drawingData = { imageData: comment.drawing, timestamp: validVideoTime };
      }
    } else if (comment.drawing_data) {
      hasDrawing = true;
      try {
        if (typeof comment.drawing_data === 'string') {
          const parsed = JSON.parse(comment.drawing_data);
          drawingData = parsed;
          if (parsed.timestamp) {
            drawingTimestamp = parseFloat(parsed.timestamp) || validVideoTime;
          }
        } else if (typeof comment.drawing_data === 'object') {
          drawingData = comment.drawing_data;
          if (comment.drawing_data.timestamp) {
            drawingTimestamp = parseFloat(comment.drawing_data.timestamp) || validVideoTime;
          }
        }
      } catch (e) {
        console.error('Erro ao processar drawing_data:', e);
        if (comment.drawing_data.startsWith && comment.drawing_data.startsWith('data:')) {
          drawingData = { imageData: comment.drawing_data, timestamp: validVideoTime };
        }
      }
    }
    
    // Validar o timestamp do desenho
    if (isNaN(drawingTimestamp) || !isFinite(drawingTimestamp)) {
      drawingTimestamp = validVideoTime;
    }
    
    // Debug para verificar os dados de desenho
    console.log(`Comentário ${comment.id} renderizado:`, {
      hasDrawing,
      drawingTimestamp,
      validVideoTime,
      drawingData: drawingData ? 'Presente' : 'Ausente'
    });

    return (
      <div className={`p-4 border-b border-[#3F3F3F] ${comment.resolved ? 'bg-[#1F3F1F]/20' : ''} group relative`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#D00102] rounded-full flex items-center justify-center text-white font-bold">
            {firstLetter.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h4 className="text-white font-bold">{authorName}</h4>
              <span className="text-gray-400 text-xs">
                {formatDate(comment.timestamp || comment.created_at)}
              </span>
              <span 
                className="text-[#D00102] text-sm font-medium cursor-pointer hover:underline"
                onClick={() => {
                  const time = parseFloat(comment.videoTime || comment.video_time) || 0;
                  if (isNaN(time) || !isFinite(time)) {
                    console.warn('Timestamp inválido no comentário:', comment.id);
                    onTimeClick?.(0);
                  } else {
                    console.log('Clicou no timestamp:', time);
                    onTimeClick?.(time);
                  }
                }}
              >
                at {formatVideoTime(validVideoTime)}
              </span>
              {hasDrawing && (
                <span className="text-[#D00102] text-sm flex items-center gap-1 cursor-pointer" 
                  onClick={() => {
                    console.log('Clicou no desenho, navegando para:', drawingTimestamp);
                    onTimeClick?.(drawingTimestamp);
                  }}>
                  <PencilIcon className="w-4 h-4" />
                  Drawing at {formatVideoTime(drawingTimestamp)}
                </span>
              )}
              {comment.resolved && (
                <span className="text-green-500 text-sm flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  Resolved
                </span>
              )}
            </div>

            {editingComment === comment.id ? (
              <div className="mt-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-[#3F3F3F] text-white px-4 py-2 rounded-lg focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(comment.id, editText)}
                    className="bg-[#D00102] text-white px-4 py-2 rounded-lg hover:bg-[#D00102]/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                    className="bg-[#3F3F3F] text-white px-4 py-2 rounded-lg hover:bg-[#4F4F4F] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white mt-1">{comment.text}</p>
            )}
            
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleLike(comment.id, isReply, parentId)}
                className={`flex items-center gap-1 ${isLikedByUser ? 'text-[#D00102]' : 'text-gray-400'} hover:text-[#D00102] transition-colors`}
              >
                {isLikedByUser ? (
                  <HeartSolid className="w-5 h-5" />
                ) : (
                  <HeartOutline className="w-5 h-5" />
                )}
                {comment.likes > 0 && <span>{comment.likes}</span>}
              </button>
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Reply
              </button>
              <button
                onClick={() => handleResolve(comment.id, isReply, parentId)}
                className={`flex items-center gap-1 ${comment.resolved ? 'text-green-500' : 'text-gray-400'} hover:text-green-500 transition-colors`}
              >
                <CheckCircleIcon className="w-5 h-5" />
                {comment.resolved ? 'Resolved' : 'Resolve'}
              </button>
              {isAuthor && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditText(comment.text);
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-4 ml-8">
                <form onSubmit={(e) => handleReplySubmit(e, comment)} className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Replying to {authorName}</span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full bg-[#3F3F3F] text-white px-4 py-2 rounded-lg focus:outline-none text-sm"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-[#D00102] text-white px-4 py-2 rounded-lg hover:bg-[#D00102]/90 transition-colors text-sm"
                  >
                    Reply
                  </button>
                </form>
              </div>
            )}

            {replies.length > 0 && (
              <div className="ml-4 mt-4 border-l-2 border-[#3F3F3F]">
                {replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    isReply={true}
                    parentId={comment.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-[#3F3F3F]">
        <h2 className="text-white text-xl font-bold">Comments</h2>
        
        {/* Mostrar informação da versão ativa */}
        {activeVersion && (
          <div className="mt-2 text-sm text-gray-400">
            Showing comments for version: <span className="text-yellow-400">{activeVersion.id.substring(0, 8)}</span>
            <div className="text-xs text-gray-500 mt-1">
              Created: {new Date(activeVersion.created_at).toLocaleString()}
            </div>
          </div>
        )}
        
        {/* Debug info */}
        <div className="bg-black bg-opacity-70 text-white p-2 text-xs mt-2">
          <div className="text-green-500">Debug Info:</div>
          tempDrawing: {tempDrawing ? 
            <span className="text-green-400">Presente ({typeof tempDrawing === 'string' ? tempDrawing.slice(0, 20) + '...' : 'não é string'})</span> : 
            <span className="text-red-400">Ausente</span>}
          <br />
          TextComment: {newComment.trim() ? 
            <span className="text-green-400">Presente</span> : 
            <span className="text-red-400">Ausente</span>}
        </div>
      </div>

      <div className="p-4 border-b border-[#3F3F3F]">
        {!replyingTo && (
          <form id="commentForm" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#D00102] font-bold">
                {formatVideoTime(currentTime)}
              </span>
              <span className="text-gray-400">Current time</span>
              {tempDrawing && (
                <span className="text-[#D00102] text-sm flex items-center gap-1">
                  <PencilIcon className="w-4 h-4" />
                  Drawing added
                  <button
                    type="button"
                    onClick={onClearDrawing}
                    className="text-gray-400 hover:text-white ml-1"
                  >
                    (remove)
                  </button>
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? "Write a comment..." : "Write an anonymous comment..."}
                className="w-full bg-[#3F3F3F] text-white px-4 py-2 rounded-lg focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  id="submitCommentButton"
                  type="button" 
                  disabled={false}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Submit button clicked directly');
                    
                    // Evitar duplicação - verificar se já está em andamento
                    if (document.getElementById('submitCommentButton').disabled) {
                      console.log('Botão já está processando uma submissão');
                      return;
                    }
                    
                    // Verificar conteúdo primeiro
                    const hasContent = !!(newComment.trim() || tempDrawing);
                    console.log('Tem conteúdo para enviar:', hasContent);
                    
                    if (!hasContent) {
                      toast.error('Adicione um comentário ou desenho antes de enviar');
                      return;
                    }
                    
                    // Desabilitar o botão temporariamente para evitar duplo clique
                    document.getElementById('submitCommentButton').disabled = true;
                    
                    // Chamar diretamente o handleSubmit
                    handleSubmit(e).finally(() => {
                      // Re-habilitar o botão após a conclusão (sucesso ou erro)
                      setTimeout(() => {
                        const btn = document.getElementById('submitCommentButton');
                        if (btn) btn.disabled = false;
                      }, 1000);
                    });
                  }}
                  className={`flex-1 bg-[#D00102] text-white px-4 py-2 rounded-lg transition-colors hover:bg-[#D00102]/90`}
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log('Draw button clicked, dispatching startDrawing event');
                    const event = new CustomEvent('startDrawing');
                    window.dispatchEvent(event);
                  }}
                  className="bg-[#3F3F3F] text-white px-4 py-2 rounded-lg hover:bg-[#4F4F4F] transition-colors flex items-center gap-2"
                >
                  <PencilIcon className="w-5 h-5" />
                  Draw
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              {activeVersion 
                ? `No comments yet for this version. Be the first to comment!` 
                : `No comments yet. Be the first to comment!`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onTimeClick={onTimeClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments; 