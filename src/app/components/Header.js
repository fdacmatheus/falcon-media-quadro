'use client';
import { ArrowLeftIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'no_status', label: 'No Status', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'review', label: 'In Review', color: 'bg-blue-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' }
];

const Header = ({ 
  title = 'SV055A.mp4',
  commentsCount = 0,
  videoUrl = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  onVersionChange = () => {},
  onCompareClick = () => {},
  onBack,
  onStatusChange = () => {},
  initialStatus = 'no_status',
  projectId,
  folderId,
  videoId,
  versions = []
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [isVersionOpen, setIsVersionOpen] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // Adicionar versão "Original" à lista de versões
  const allVersions = [
    { 
      id: 'original', 
      name: 'Original',
      file_path: videoUrl,
      created_at: new Date().toISOString()
    },
    ...versions
  ];

  const currentStatus = STATUS_OPTIONS.find(opt => opt.value === status);
  
  // Se nenhuma versão selecionada, use a original
  const selectedVersion = selectedVersionId 
    ? allVersions.find(v => v.id === selectedVersionId) 
    : allVersions[0];

  const handleVersionChange = (version) => {
    setSelectedVersionId(version.id);
    setIsVersionOpen(false);
    onVersionChange(version);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      console.log('Atualizando status:', { projectId, folderId, videoId, newStatus });

      if (!projectId || !folderId || !videoId) {
        toast.error('Erro: IDs não encontrados');
        return;
      }

      const response = await fetch(
        `/api/projects/${projectId}/folders/${folderId}/videos/${videoId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao atualizar status');
      }

      const updatedVideo = await response.json();
      setStatus(newStatus);
      setIsStatusOpen(false);
      onStatusChange(newStatus);
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do vídeo');
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao fazer download do vídeo:', error);
    }
  };

  const handleCompareClick = () => {
    console.log('Header: Iniciando modo de comparação de versões');
    
    // Verificar se há versões suficientes para comparar
    if (!versions || versions.length === 0) {
      toast.error('Não há versões para comparar');
      return;
    }
    
    // Notificar o usuário que estamos entrando no modo de comparação
    toast.success('Iniciando modo de comparação de versões', {
      icon: '🔄',
      duration: 3000
    });
    
    // Chamar o callback para entrar no modo de comparação
    onCompareClick();
  };

  return (
    <div className="w-full bg-[#1F1F1F] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-white font-medium">{title}</h1>
      </div>

      {/* Version Selector with Compare Button */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2E2E2E] rounded-md text-white hover:bg-[#3F3F3F] transition-colors text-sm"
            onClick={() => setIsVersionOpen(!isVersionOpen)}
          >
            <span className="font-medium">
              {selectedVersion.id === 'original' ? 'Original' : `Version ${allVersions.indexOf(selectedVersion)}`}
            </span>
            <span className="text-gray-400 text-xs">
              {selectedVersion ? new Date(selectedVersion.created_at).toLocaleDateString() : ''}
            </span>
          </button>

          {isVersionOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-[#2E2E2E] rounded-md shadow-lg py-1 z-50">
              {allVersions.map((version, index) => (
                <button
                  key={version.id}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#3F3F3F] transition-colors ${
                    version.id === selectedVersion.id ? 'text-[#FF0054]' : 'text-white'
                  }`}
                  onClick={() => handleVersionChange(version)}
                >
                  <span className="font-medium">
                    {version.id === 'original' ? 'Original' : `Version ${index}`}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(version.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {versions.length > 0 && (
          <button
            onClick={handleCompareClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2E2E2E] rounded-md text-white hover:bg-[#3F3F3F] transition-colors text-sm"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
            Compare
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-5 h-5 text-white" />
            <div className="w-6 h-6 bg-[#FF0054] rounded-full flex items-center justify-center text-white text-xs">
              {commentsCount}
            </div>
          </div>
          <div className="relative">
            <button 
              className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors text-sm"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
            >
              <div className={`w-2 h-2 rounded-full ${currentStatus.color}`} />
              {currentStatus.label}
            </button>
            
            {isStatusOpen && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-[#2E2E2E] rounded-md shadow-lg py-1 z-50">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#3F3F3F] transition-colors"
                    onClick={() => handleStatusChange(option.value)}
                  >
                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={handleDownload}
          className="text-white hover:text-gray-300 transition-colors text-sm"
        >
          Download
        </button>
        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold">
          M
        </div>
      </div>
    </div>
  );
};

export default Header; 