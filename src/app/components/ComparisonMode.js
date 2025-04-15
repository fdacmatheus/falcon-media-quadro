'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const ComparisonMode = ({ 
  onExit, 
  userData = {},
  initialLeftUrl,
  initialRightUrl,
  versions = []
}) => {
  const [leftVersion, setLeftVersion] = useState(versions[0]?.id || null);
  const [rightVersion, setRightVersion] = useState(versions[versions.length - 1]?.id || null);
  const [localUserData, setLocalUserData] = useState(userData);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLeftLoaded, setIsLeftLoaded] = useState(false);
  const [isRightLoaded, setIsRightLoaded] = useState(false);
  const leftVideoRef = useRef(null);
  const rightVideoRef = useRef(null);
  const [leftDuration, setLeftDuration] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [leftEnded, setLeftEnded] = useState(false);
  const [rightEnded, setRightEnded] = useState(false);

  useEffect(() => {
    console.log('ComparisonMode montado com versões:', versions);
    if (!versions.length) {
      console.error('Nenhuma versão disponível para comparação');
      toast.error('Erro: Nenhuma versão disponível para comparação');
      onExit();
      return;
    }

    // Configurar versões iniciais se não definidas
    if (!leftVersion) {
      setLeftVersion(versions[0].id);
    }
    if (!rightVersion) {
      setRightVersion(versions[versions.length - 1].id);
    }
  }, []);

  const getVersionUrl = (versionId) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) {
      console.error('Versão não encontrada:', versionId);
      return '';
    }

    let url = version.file_path;
    
    // Garantir que a URL está formatada corretamente
    if (!url) {
      console.error('URL não encontrada para a versão:', versionId);
      return '';
    }

    // Se a URL já começa com http ou /api, retornar como está
    if (url.startsWith('http') || url.startsWith('/api/')) {
      return url;
    }

    // Adicionar prefixo /api/videos/ se necessário
    if (!url.startsWith('/api/videos/')) {
      url = `/api/videos/${url}`;
    }

    console.log('URL processada para versão:', versionId, url);
    return url;
  };

  useEffect(() => {
    if (leftVersion) {
      const url = getVersionUrl(leftVersion);
      console.log('Carregando vídeo esquerdo:', url);
      if (leftVideoRef.current) {
        leftVideoRef.current.src = url;
        leftVideoRef.current.load();
      }
    }
  }, [leftVersion]);

  useEffect(() => {
    if (rightVersion) {
      const url = getVersionUrl(rightVersion);
      console.log('Carregando vídeo direito:', url);
      if (rightVideoRef.current) {
        rightVideoRef.current.src = url;
        rightVideoRef.current.load();
      }
    }
  }, [rightVersion]);

  const handleLoadedMetadata = (e, isLeft) => {
    console.log(`Vídeo ${isLeft ? 'esquerdo' : 'direito'} carregado:`, e.target.duration);
    const video = e.target;
    if (isLeft) {
      setIsLeftLoaded(true);
      setLeftDuration(video.duration);
    } else {
      setIsRightLoaded(true);
      setRightDuration(video.duration);
    }
    
    setDuration(Math.max(leftDuration, rightDuration, video.duration));
  };

  const togglePlay = async () => {
    if (!leftVideoRef.current || !rightVideoRef.current || !isLeftLoaded || !isRightLoaded) {
      console.log('Não é possível reproduzir: vídeos não carregados');
      return;
    }

    try {
      if (isPlaying) {
        setIsPlaying(false);
        await Promise.all([
          leftVideoRef.current.pause(),
          rightVideoRef.current.pause()
        ]);
      } else {
        if (leftEnded && rightEnded) {
          leftVideoRef.current.currentTime = 0;
          rightVideoRef.current.currentTime = 0;
          setLeftEnded(false);
          setRightEnded(false);
        }

        setIsPlaying(true);
        await Promise.all([
          leftVideoRef.current.play(),
          rightVideoRef.current.play()
        ]);
      }
    } catch (error) {
      console.error('Erro ao controlar reprodução:', error);
      toast.error('Erro ao reproduzir vídeos');
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Header */}
      <div className="bg-[#1F1F1F] px-4 py-3 flex items-center justify-between">
        <button 
          onClick={onExit}
          className="flex items-center gap-2 text-[#6B7280] hover:text-white transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Sair do modo de comparação
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="px-4 py-2 bg-[#2E2E2E] text-white rounded-md hover:bg-[#3E3E3E] transition-colors"
            disabled={!isLeftLoaded || !isRightLoaded}
          >
            {isPlaying ? 'Pausar' : 'Reproduzir'}
          </button>
        </div>
      </div>

      {/* Videos Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Video */}
        <div className="flex-1 border-r border-[#2E2E2E] flex flex-col">
          <div className="bg-[#1F1F1F] px-4 py-2 flex items-center justify-between">
            <select
              value={leftVersion}
              onChange={(e) => setLeftVersion(e.target.value)}
              className="bg-[#2E2E2E] text-white text-sm px-2 py-1 rounded-md"
            >
              {versions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.label || `Versão ${version.id.substring(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="text-sm">
              <span className="text-white">{versions.find(v => v.id === leftVersion)?.author}</span>
              <span className="text-gray-400 ml-2">{versions.find(v => v.id === leftVersion)?.date}</span>
            </div>
          </div>
          <div className="relative flex-1">
            <video
              ref={leftVideoRef}
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => handleLoadedMetadata(e, true)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => setLeftEnded(true)}
              onError={(e) => {
                console.error('Erro ao carregar vídeo esquerdo:', e);
                toast.error('Erro ao carregar vídeo');
              }}
              playsInline
              muted
            />
          </div>
        </div>

        {/* Right Video */}
        <div className="flex-1 flex flex-col">
          <div className="bg-[#1F1F1F] px-4 py-2 flex items-center justify-between">
            <select
              value={rightVersion}
              onChange={(e) => setRightVersion(e.target.value)}
              className="bg-[#2E2E2E] text-white text-sm px-2 py-1 rounded-md"
            >
              {versions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.label || `Versão ${version.id.substring(0, 8)}`}
                </option>
              ))}
            </select>
            <div className="text-sm">
              <span className="text-white">{versions.find(v => v.id === rightVersion)?.author}</span>
              <span className="text-gray-400 ml-2">{versions.find(v => v.id === rightVersion)?.date}</span>
            </div>
          </div>
          <div className="relative flex-1">
            <video
              ref={rightVideoRef}
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => handleLoadedMetadata(e, false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => setRightEnded(true)}
              onError={(e) => {
                console.error('Erro ao carregar vídeo direito:', e);
                toast.error('Erro ao carregar vídeo');
              }}
              playsInline
              muted
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#1F1F1F] px-4 py-2">
        <input
          type="range"
          min="0"
          max="100"
          value={(currentTime / duration) * 100 || 0}
          onChange={(e) => {
            const progress = parseFloat(e.target.value) / 100;
            const newTime = progress * duration;
            setCurrentTime(newTime);
            if (leftVideoRef.current) leftVideoRef.current.currentTime = newTime * (leftDuration / duration);
            if (rightVideoRef.current) rightVideoRef.current.currentTime = newTime * (rightDuration / duration);
          }}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default ComparisonMode; 