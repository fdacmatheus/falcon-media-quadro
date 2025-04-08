'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const ComparisonMode = ({ 
  onExit, 
  userData = {},
  initialLeftUrl,  // Nova prop para URL inicial do vídeo esquerdo
  initialRightUrl, // Nova prop para URL inicial do vídeo direito
  versions = []    // Nova prop para lista de versões disponíveis
}) => {
  const [leftVersion, setLeftVersion] = useState(versions[0]?.id || 'v1');
  const [rightVersion, setRightVersion] = useState(versions[versions.length - 1]?.id || 'v3');
  const [localUserData, setLocalUserData] = useState(userData);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLeftLoaded, setIsLeftLoaded] = useState(false);
  const [isRightLoaded, setIsRightLoaded] = useState(false);
  const leftVideoRef = useRef(null);
  const rightVideoRef = useRef(null);
  const isTimeUpdateFromUser = useRef(false);
  const [leftDuration, setLeftDuration] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);
  const [syncInterval, setSyncInterval] = useState(null);
  const [primaryVideo, setPrimaryVideo] = useState('left');
  const [isBuffering, setIsBuffering] = useState(false);
  const [leftEnded, setLeftEnded] = useState(false);
  const [rightEnded, setRightEnded] = useState(false);
  const [currentVersions, setCurrentVersions] = useState(versions);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localUserData?.name) {
      try {
        const savedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (savedUserData?.name) {
          setLocalUserData(savedUserData);
        }
      } catch (error) {
        console.error('Error recovering user data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (versions.length > 0) {
      setCurrentVersions(versions);
    } else {
      setCurrentVersions([
        { 
          id: 'v1', 
          label: 'V1',
          author: localUserData?.name || 'User',
          date: 'Mar 21st, 5:27pm',
          duration: '00:43',
          url: initialLeftUrl || "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
        },
        { 
          id: 'v2', 
          label: 'V2',
          author: localUserData?.name || 'User',
          date: 'Mar 22nd, 2:15pm',
          duration: '00:45',
          url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        },
        { 
          id: 'v3', 
          label: 'V3',
          author: localUserData?.name || 'User',
          date: 'Today, 12:02pm',
          duration: '00:48',
          url: initialRightUrl || "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        }
      ]);
    }
  }, [versions, initialLeftUrl, initialRightUrl, localUserData?.name]);

  useEffect(() => {
    setIsLeftLoaded(false);
    if (leftVideoRef.current) {
      leftVideoRef.current.currentTime = 0;
      leftVideoRef.current.pause();
    }
    setIsPlaying(false);
  }, [leftVersion]);

  useEffect(() => {
    setIsRightLoaded(false);
    if (rightVideoRef.current) {
      rightVideoRef.current.currentTime = 0;
      rightVideoRef.current.pause();
    }
    setIsPlaying(false);
  }, [rightVersion]);

  useEffect(() => {
    if (leftVideoRef.current) leftVideoRef.current.currentTime = 0;
    if (rightVideoRef.current) rightVideoRef.current.currentTime = 0;
    setIsPlaying(false);
  }, [leftVersion, rightVersion]);

  const togglePlay = async () => {
    if (!leftVideoRef.current || !rightVideoRef.current || !isLeftLoaded || !isRightLoaded) {
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

        const leftProgress = leftVideoRef.current.currentTime / leftDuration;
        const rightTime = leftProgress * rightDuration;
        rightVideoRef.current.currentTime = rightTime;

        const videosToPlay = [];
        if (!leftEnded) {
          leftVideoRef.current.muted = true;
          videosToPlay.push(leftVideoRef.current);
        }
        if (!rightEnded) {
          rightVideoRef.current.muted = true;
          videosToPlay.push(rightVideoRef.current);
        }

        setIsPlaying(true);
        await Promise.all(videosToPlay.map(video => {
          try {
            return video.play();
          } catch (error) {
            console.error('Error playing video:', error);
            return Promise.reject(error);
          }
        }));
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      setIsPlaying(false);
      leftVideoRef.current?.pause();
      rightVideoRef.current?.pause();
    }
  };

  const handleTimeUpdate = (e) => {
    const video = e.target;
    const isLeft = video === leftVideoRef.current;
    
    if (isBuffering || (!isPlaying && !leftEnded && !rightEnded)) return;

    const currentVideo = isLeft ? leftVideoRef.current : rightVideoRef.current;
    const otherVideo = isLeft ? rightVideoRef.current : leftVideoRef.current;
    const currentDuration = isLeft ? leftDuration : rightDuration;
    const otherDuration = isLeft ? rightDuration : leftDuration;

    if ((isLeft && rightEnded) || (!isLeft && leftEnded)) {
      setCurrentTime(currentVideo.currentTime);
      return;
    }

    const progress = currentVideo.currentTime / currentDuration;
    const targetTime = progress * otherDuration;

    if (Math.abs(otherVideo.currentTime - targetTime) > 0.1) {
      otherVideo.currentTime = targetTime;
    }

    const maxDuration = Math.max(leftDuration, rightDuration);
    setCurrentTime(progress * maxDuration);
  };

  const handleLoadedMetadata = (e, isLeft) => {
    console.log(`Video ${isLeft ? 'left' : 'right'} metadata loaded`);
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

  const handleLoadedData = (isLeft) => {
    console.log(`Video ${isLeft ? 'left' : 'right'} data loaded`);
  };

  const handleCanPlay = (isLeft) => {
    console.log(`Video ${isLeft ? 'left' : 'right'} can play`);
  };

  const handleSeek = (e) => {
    const progress = parseFloat(e.target.value) / 100;
    
    if (leftVideoRef.current && rightVideoRef.current) {
      const wasPlaying = isPlaying;
      
      setIsPlaying(false);
      Promise.all([
        leftVideoRef.current.pause(),
        rightVideoRef.current.pause()
      ]).then(() => {
        const leftTime = progress * leftDuration;
        const rightTime = progress * rightDuration;

        if (leftTime < leftDuration) setLeftEnded(false);
        if (rightTime < rightDuration) setRightEnded(false);

        leftVideoRef.current.currentTime = Math.min(leftTime, leftDuration);
        rightVideoRef.current.currentTime = Math.min(rightTime, rightDuration);

        const maxDuration = Math.max(leftDuration, rightDuration);
        setCurrentTime(progress * maxDuration);

        if (wasPlaying) {
          const videosToPlay = [];
          if (!leftEnded) videosToPlay.push(leftVideoRef.current);
          if (!rightEnded) videosToPlay.push(rightVideoRef.current);

          if (videosToPlay.length > 0) {
            setIsPlaying(true);
            Promise.all(videosToPlay.map(video => video.play()))
              .catch(error => {
                console.error('Error resuming playback:', error);
                setIsPlaying(false);
              });
          }
        }
      });
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [syncInterval]);

  useEffect(() => {
    const handleLeftVideoEnd = () => {
      setLeftEnded(true);
      if (!rightEnded) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
        leftVideoRef.current?.pause();
        rightVideoRef.current?.pause();
      }
    };

    const handleRightVideoEnd = () => {
      setRightEnded(true);
      if (!leftEnded) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
        leftVideoRef.current?.pause();
        rightVideoRef.current?.pause();
      }
    };

    const leftVideo = leftVideoRef.current;
    const rightVideo = rightVideoRef.current;

    if (leftVideo) leftVideo.addEventListener('ended', handleLeftVideoEnd);
    if (rightVideo) rightVideo.addEventListener('ended', handleRightVideoEnd);

    return () => {
      if (leftVideo) leftVideo.removeEventListener('ended', handleLeftVideoEnd);
      if (rightVideo) rightVideo.removeEventListener('ended', handleRightVideoEnd);
    };
  }, [leftEnded, rightEnded]);

  useEffect(() => {
    setLeftEnded(false);
    setRightEnded(false);
  }, [leftVersion, rightVersion]);

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Header */}
      <div className="bg-[#1F1F1F] px-4 py-3 flex items-center">
        <button 
          onClick={onExit}
          className="flex items-center gap-2 text-[#6B7280] hover:text-white transition-colors text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Exit comparison mode
        </button>
      </div>

      {/* Videos Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Video Container */}
        <div className="flex-1 border-r border-[#2E2E2E] flex flex-col">
          <div className="bg-[#1F1F1F] px-4 py-2 flex items-center justify-between">
            <select
              value={leftVersion}
              onChange={(e) => setLeftVersion(e.target.value)}
              className="bg-[#2E2E2E] text-white text-sm px-2 py-1 rounded-md"
            >
              {currentVersions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
            <div className="text-sm">
              <span className="text-white">{currentVersions.find(v => v.id === leftVersion)?.author}</span>
              <span className="text-gray-400 ml-2">{currentVersions.find(v => v.id === leftVersion)?.date}</span>
            </div>
            <div className="text-white text-sm flex items-center gap-2">
              <span>{formatTime(currentTime)}</span>
              <span className="text-gray-400">/ {currentVersions.find(v => v.id === leftVersion)?.duration}</span>
            </div>
          </div>
          <div className="relative w-full h-full">
            <video
              ref={leftVideoRef}
              className="w-full h-full object-contain"
              src={currentVersions.find(v => v.id === leftVersion)?.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => handleLoadedMetadata(e, true)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                setLeftEnded(true);
                if (!rightEnded) {
                  setIsPlaying(true);
                } else {
                  setIsPlaying(false);
                }
              }}
              playsInline
              preload="auto"
              muted
            />
          </div>
        </div>

        {/* Right Video Container */}
        <div className="flex-1">
          <div className="bg-[#1F1F1F] px-4 py-2 flex items-center justify-between">
            <select
              value={rightVersion}
              onChange={(e) => setRightVersion(e.target.value)}
              className="bg-[#2E2E2E] text-white text-sm px-2 py-1 rounded-md"
            >
              {currentVersions.map(version => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
            <div className="text-sm">
              <span className="text-white">{currentVersions.find(v => v.id === rightVersion)?.author}</span>
              <span className="text-gray-400 ml-2">{currentVersions.find(v => v.id === rightVersion)?.date}</span>
            </div>
            <div className="text-white text-sm flex items-center gap-2">
              <span>{formatTime(currentTime)}</span>
              <span className="text-gray-400">/ {currentVersions.find(v => v.id === rightVersion)?.duration}</span>
            </div>
          </div>
          <div className="relative w-full h-full">
            <video
              ref={rightVideoRef}
              className="w-full h-full object-contain"
              src={currentVersions.find(v => v.id === rightVersion)?.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => handleLoadedMetadata(e, false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                setRightEnded(true);
                if (!leftEnded) {
                  setIsPlaying(true);
                } else {
                  setIsPlaying(false);
                }
              }}
              playsInline
              preload="auto"
              muted
            />
          </div>
        </div>
      </div>

      {/* Player Controls */}
      <div className="bg-[#1F1F1F] p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className={`text-white hover:text-[#D00102] transition-colors ${(!isLeftLoaded || !isRightLoaded) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isLeftLoaded || !isRightLoaded}
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={(currentTime / duration) * 100 || 0}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #D00102 0%, #D00102 ${(currentTime / duration) * 100}%, #3F3F3F ${(currentTime / duration) * 100}%, #3F3F3F 100%)`
              }}
            />
          </div>
          <div className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonMode; 