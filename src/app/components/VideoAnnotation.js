'use client';
import { useRef, useEffect } from 'react';

const VideoAnnotation = ({ isVisible, annotation }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    contextRef.current = context;

    const resizeCanvas = () => {
      const video = canvas.parentElement;
      if (!video) return;

      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      
      // Se houver uma anotação, redesenhá-la após o redimensionamento
      if (annotation && isVisible) {
        drawAnnotation(annotation);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [annotation, isVisible]);

  // Função para desenhar a anotação no canvas
  const drawAnnotation = (src) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      console.log('Annotation drawn on canvas');
    };
    image.onerror = (err) => {
      console.error('Error loading annotation image:', err);
    };
    image.src = src;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    if (!isVisible || !annotation) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    console.log('Displaying annotation');
    drawAnnotation(annotation);
  }, [isVisible, annotation]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
         style={{ opacity: isVisible ? 1 : 0, zIndex: 40 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
};

export default VideoAnnotation; 