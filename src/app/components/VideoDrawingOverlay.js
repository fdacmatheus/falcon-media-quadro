import { useRef, useEffect, useState } from 'react';

const VideoDrawingOverlay = ({ videoRef, isDrawing, onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isPainting, setIsPainting] = useState(false);
  const [context, setContext] = useState(null);

  // Inicialização e redimensionamento do canvas
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Ajusta o tamanho do canvas para corresponder ao vídeo
    const updateCanvasSize = () => {
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Reinicializa o contexto após redimensionar
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#D00102';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      setContext(ctx);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Chamar updateCanvasSize novamente após um pequeno delay para garantir
    // que o canvas tenha as dimensões corretas após a renderização completa
    const timer = setTimeout(() => {
      updateCanvasSize();
      console.log('Canvas size updated:', canvas.width, 'x', canvas.height);
    }, 100);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      clearTimeout(timer);
    };
  }, [videoRef, isDrawing]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!context) return;
    const coords = getCoordinates(e);
    
    // Garantir que a cor e espessura estão definidas antes de começar
    context.strokeStyle = '#D00102';
    context.lineWidth = 3;
    context.lineCap = 'round';
    
    context.beginPath();
    context.moveTo(coords.x, coords.y);
    setIsPainting(true);
    console.log('Started drawing at:', coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isPainting || !context) return;
    const coords = getCoordinates(e);
    context.lineTo(coords.x, coords.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    context.closePath();
    setIsPainting(false);
    console.log('Stopped drawing');
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    console.log('Canvas cleared');
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    
    try {
      console.log('Salvando desenho do canvas');
      const canvas = canvasRef.current;
      
      // Verificar se o canvas está vazio
      const isCanvasEmpty = isCanvasBlank(canvas);
      if (isCanvasEmpty) {
        console.log('Canvas está vazio, nada para salvar');
        if (onSave) onSave('empty_drawing');
        return;
      }
      
      // Obter dados da imagem como URL data
      const imageData = canvas.toDataURL('image/png');
      console.log('Dados da imagem gerados, comprimento:', imageData.length);
      
      if (onSave) {
        console.log('Chamando callback onSave');
        onSave(imageData);
      }
    } catch (error) {
      console.error('Erro ao salvar desenho:', error);
      // Mesmo em caso de erro, tentar passar algo para o callback
      if (onSave) onSave('error_drawing');
    }
  };

  // Função para verificar se o canvas está vazio
  const isCanvasBlank = (canvas) => {
    try {
      const context = canvas.getContext('2d');
      const pixelBuffer = new Uint32Array(
        context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      return !pixelBuffer.some(color => color !== 0);
    } catch (e) {
      console.error('Erro ao verificar canvas vazio:', e);
      return false;
    }
  };

  if (!isDrawing) return null;

  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-[#3F3F3F] text-white rounded-lg hover:bg-[#4F4F4F] transition-colors"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[#D00102] text-white rounded-lg hover:bg-[#D00102]/90 transition-colors"
        >
          Save Drawing
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-[#3F3F3F] text-white rounded-lg hover:bg-[#4F4F4F] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default VideoDrawingOverlay; 