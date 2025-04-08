'use client';
import React, { useState, useCallback, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer';
import Comments from './components/Comments';

export default function Home() {
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [tempDrawing, setTempDrawing] = useState(null);

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

  return (
    <main className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <div className="w-2/3">
            <VideoPlayer 
              ref={videoRef}
              onLogin={handleLogin} 
              onTimeUpdate={handleTimeUpdate}
              comments={comments}
              onDrawingSave={handleDrawingSave}
            />
          </div>
          <div className="w-1/3 bg-[#1F1F1F] rounded-lg overflow-hidden h-[600px]">
            {user ? (
              <Comments 
                user={user} 
                currentTime={currentTime}
                onTimeClick={handleSeekToTime}
                onNewComment={handleNewComment}
                comments={comments}
                setComments={setComments}
                tempDrawing={tempDrawing}
                onClearDrawing={() => setTempDrawing(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Please, login to comment
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
