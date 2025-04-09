'use client';
import { useState, useRef, useEffect } from 'react';
import { XMarkIcon, FolderPlusIcon, VideoCameraIcon, ArrowUpIcon, ShareIcon } from '@heroicons/react/24/outline';
import VideoPlayer from './VideoPlayer';
import Comments from './Comments';
import { use } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Header from './Header';

export default function FolderContent({ projectId, folderId }) {
  const router = useRouter();
  const [showNewSubfolderModal, setShowNewSubfolderModal] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [subfolders, setSubfolders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [comments, setComments] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);
  const [user, setUser] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [draggedVideo, setDraggedVideo] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Searching videos:', { projectId, folderId });
      
      const response = await fetch(`/api/projects/${projectId}/folders/${folderId}/videos`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error loading videos');
      }
      
      const data = await response.json();
      console.log('Videos loaded with versions:', data);
      setVideos(data);
    } catch (error) {
      console.error('Error searching videos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && folderId) {
      fetchVideos();
    }
  }, [projectId, folderId]);

  useEffect(() => {
    console.log('IDs:', { projectId, folderId });
    if (selectedVideo) {
      console.log('Video selected:', selectedVideo);
    }
  }, [projectId, folderId, selectedVideo]);

  const handleCreateSubfolder = () => {
    if (newSubfolderName.trim()) {
      const newSubfolder = {
        id: Date.now(),
        name: newSubfolderName.trim(),
        parentId: folderId
      };
      setSubfolders([...subfolders, newSubfolder]);
      setNewSubfolderName('');
      setShowNewSubfolderModal(false);
    }
  };

  const handleUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) {
        toast.error('No file selected');
        return;
      }

      console.log('Starting file upload:', file);
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Unknown upload error');
      }

      // Update video list with new video and status
      const newVideo = {
        ...data,
        video_status: 'no_status', // Initial status after upload
        duration: 0 // Will be updated when processing is complete
      };
      
      setVideos(prevVideos => [...prevVideos, newVideo]);
      
      // Show success message
      toast.success('Video uploaded successfully!');

      // Start polling to check processing status
      const checkProcessingStatus = async () => {
        try {
          const statusResponse = await fetch(
            `/api/projects/${projectId}/folders/${folderId}/videos/${data.id}/status`
          );
          
          if (!statusResponse.ok) {
            throw new Error('Error checking processing status');
          }

          const statusData = await statusResponse.json();
          
          // Update video in list with new status
          setVideos(prevVideos =>
            prevVideos.map(video =>
              video.id === data.id
                ? { ...video, ...statusData }
                : video
            )
          );

          // If still processing, keep checking
          if (statusData.processing) {
            setTimeout(checkProcessingStatus, 5000); // Check every 5 seconds
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      };

      // Start polling
      checkProcessingStatus();

    } catch (error) {
      console.error('Complete error:', error);
      toast.error(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (videoId) => {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;

    try {
      console.log('Tentando excluir vídeo:', videoId);
      
      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}`,
        { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao excluir vídeo');
      }

      // Remove video from local state
      setVideos(prevVideos => {
        const newVideos = prevVideos.filter(v => v.id !== videoId);
        console.log('Vídeos após exclusão:', newVideos);
        return newVideos;
      });
      
      // If the deleted video was selected, clear selection
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
        setComments([]); // Limpa os comentários também
      }

      toast.success('Vídeo excluído com sucesso!');
      
      // Recarrega a lista de vídeos para garantir sincronização
      await fetchVideos();
      
    } catch (error) {
      console.error('Erro ao excluir vídeo:', error);
      toast.error(error.message || 'Falha ao excluir vídeo');
    }
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleSeekToTime = (time) => {
    console.log('handleSeekToTime called with time:', time);
    console.log('videoRef exists?', !!videoRef.current);
    if (videoRef.current) {
      console.log('Current time before:', videoRef.current.currentTime);
      videoRef.current.currentTime = time;
      console.log('Current time after:', videoRef.current.currentTime);
    }
  };

  const handleDrawingSave = (imageData) => {
    setTempDrawing(imageData);
  };

  const handleNewComment = (comment) => {
    const commentWithDrawing = {
      ...comment,
      drawing: tempDrawing
    };
    setComments(prevComments => [commentWithDrawing, ...prevComments]);
    setTempDrawing(null);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const formatVideoName = (fileName) => {
    // Remove file extension
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
    // Remove UUID (assuming it's the last segment after a hyphen)
    const nameWithoutUUID = nameWithoutExtension.replace(/-[a-f0-9-]+$/, "");
    return nameWithoutUUID;
  };

  const formatDuration = (duration, processing) => {
    if (processing) {
      return 'Processing...';
    }
    if (!duration) return '00:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'no_status':
        return 'bg-gray-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'review':
        return 'bg-blue-500';
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'no_status':
        return 'No Status';
      case 'in_progress':
        return 'In Progress';
      case 'review':
        return 'In Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'No Status';
    }
  };

  const handleVideoClick = async (video) => {
    try {
      // Build complete video path
      const videoWithFullPath = {
        ...video,
        file_path: `/api/videos/${video.file_path}` // Add API prefix
      };
      
      setSelectedVideo(videoWithFullPath);
      setComments([]); 
      setCurrentTime(0); // Reset current time when selecting a new video

      if (!video?.id) {
        console.error('Invalid video:', video);
        return;
      }

      console.log('Fetching comments for video:', video.id);

      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${video.id}/comments`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Response error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Error loading comments');
      }

      const data = await response.json();
      console.log('Comments loaded:', data);

      if (Array.isArray(data)) {
        setComments(data);
      } else {
        console.error('Invalid response:', data);
        setComments([]);
      }

    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Error loading comments');
      setComments([]);
    }
  };

  const handleVideoEnd = () => {
    setSelectedVideo(null);
  };

  const handleCommentSubmit = async (comment) => {
    try {
      if (!selectedVideo?.id || !user) {
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

      console.log('Sending comment:', commentData);

      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${selectedVideo.id}/comments`,
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

      setComments(prevComments => [savedComment, ...prevComments]);
      setTempDrawing(null);
      toast.success('Comment saved successfully!');

    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error(`Error saving comment: ${error.message}`);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/projects/${projectId}/folders/${folderId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleVideoStatusUpdate = async (status) => {
    if (!selectedVideo) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${selectedVideo.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update video status');
      }

      // Update video status in local list
      setVideos(prevVideos =>
        prevVideos.map(video =>
          video.id === selectedVideo.id
            ? { ...video, video_status: status }
            : video
        )
      );

      toast.success('Status updated successfully!');
    } catch (error) {
      console.error('Error updating video status:', error);
      toast.error('Error updating video status');
    }
  };

  const handleDragStart = (e, video) => {
    setDraggedVideo(video);
    e.dataTransfer.setData('text/plain', video.id);
  };

  const handleDragOver = (e, video) => {
    e.preventDefault();
    if (draggedVideo && draggedVideo.id !== video.id) {
      setDropTarget(video.id);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e, targetVideo) => {
    e.preventDefault();
    setDropTarget(null);
    
    if (!draggedVideo || draggedVideo.id === targetVideo.id) return;

    try {
      console.log('Creating version via drag and drop', {
        sourceVideo: draggedVideo,
        targetVideo,
        projectId,
        folderId
      });
      
      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${targetVideo.id}/versions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceVideoId: draggedVideo.id
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating version:', errorData);
        throw new Error(errorData.error || 'Failed to create video version');
      }

      const newVersion = await response.json();
      console.log('New version created:', newVersion);
      
      // Update the videos list: add version to target and remove source video
      setVideos(prevVideos => {
        // First add the version to the target video
        const updatedVideos = prevVideos.map(video => 
          video.id === targetVideo.id 
            ? { 
                ...video, 
                versions: [...(video.versions || []), newVersion],
                hasVersions: true
              }
            : video
        );
        
        // Then filter out the source video
        return updatedVideos.filter(video => video.id !== draggedVideo.id);
      });

      // After successful version creation, refresh videos to ensure all data is up-to-date
      fetchVideos();

      toast.success('Version created successfully!');
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Error creating video version');
    }
  };

  if (loading) {
    return <div className="text-[#6B7280]">Loading...</div>;
  }

  if (error) {
    return <div className="text-[#D00102]">Error: {error}</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Folder Header */}
      <div className="bg-[#1A1B1E] border-b border-[#2E2E2E] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              <ArrowUpIcon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-medium">{folderId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-[#2E2E2E] text-white rounded-md hover:bg-[#3E3E3E] transition-colors flex items-center gap-2"
            >
              <ShareIcon className="w-5 h-5" />
              Share
            </button>
            <button 
              className="px-4 py-2 bg-[#D00102] text-white rounded-md hover:bg-[#B00102] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Sending...' : 'Upload Video'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleUpload}
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6">
        {selectedVideo ? (
          <div className="flex gap-4 h-[calc(100vh-120px)]">
            <div className="flex-1 bg-black rounded-lg overflow-hidden">
              <VideoPlayer
                ref={videoRef}
                videoUrl={selectedVideo.file_path}
                onTimeUpdate={handleTimeUpdate}
                onVideoEnd={handleVideoEnd}
                onLogin={handleLogin}
                comments={comments}
                onDrawingSave={handleDrawingSave}
                fullWidth
                onBack={() => setSelectedVideo(null)}
                projectId={projectId}
                folderId={folderId}
                videoId={selectedVideo.id}
                initialStatus={selectedVideo.video_status || 'no_status'}
                onStatusChange={handleVideoStatusUpdate}
              />
            </div>
            <div className="w-96 bg-[#1A1B1E] rounded-lg overflow-hidden">
              <Comments
                videoId={selectedVideo.id}
                comments={comments}
                onCommentSubmit={handleCommentSubmit}
                user={user}
                currentTime={currentTime}
                onTimeClick={handleSeekToTime}
                tempDrawing={tempDrawing}
                onClearDrawing={() => setTempDrawing(null)}
                setComments={setComments}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div 
                key={video.id} 
                className={`bg-[#2E2E2E] rounded-lg p-4 hover:bg-[#3E3E3E] transition-colors cursor-pointer group relative ${
                  dropTarget === video.id ? 'border-2 border-[#D00102]' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, video)}
                onDragOver={(e) => handleDragOver(e, video)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, video)}
                onClick={() => handleVideoClick(video)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-40 h-24 bg-black rounded-md overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white">{formatVideoName(video.name)}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {!video.processing && (
                        <>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(video.video_status)}`} />
                          <span className="text-sm text-gray-400">{getStatusLabel(video.video_status)}</span>
                          
                          {/* Version indicator */}
                          {video.versions && video.versions.length > 0 && (
                            <span className="ml-2 text-xs bg-[#D00102] text-white px-2 py-0.5 rounded-full">
                              {video.versions.length} {video.versions.length === 1 ? 'version' : 'versions'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(video.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !selectedVideo && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="text-lg">No videos yet</p>
            <p className="text-sm mt-2">Upload your first video to get started</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#2E2E2E] p-6 rounded-lg flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-white">Carregando...</p>
            </div>
          </div>
        )}
      </div>

      {/* New Subfolder Modal */}
      {showNewSubfolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#1A1B1E] rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Create New Subfolder</h2>
              <button onClick={() => setShowNewSubfolderModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Subfolder Name"
              className="w-full bg-[#2E2E2E] text-white px-4 py-2 rounded-md mb-4"
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSubfolder()}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-400 hover:text-white"
                onClick={() => setShowNewSubfolderModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#D00102] text-white rounded-md hover:bg-[#B00102]"
                onClick={handleCreateSubfolder}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 