'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import Comments from './components/Comments';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);
  const router = useRouter();

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

  const handleNewComment = (comment) => {
    const commentWithDrawing = {
      ...comment,
      drawing: tempDrawing
    };
    setComments(prevComments => [commentWithDrawing, ...prevComments]);
    setTempDrawing(null);
  };

  useEffect(() => {
    router.push('/projects');
  }, [router]);

  return null;
}
