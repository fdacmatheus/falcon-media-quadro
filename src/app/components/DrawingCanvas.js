import { useRef, useEffect, useState } from 'react';

const DrawingCanvas = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#D00102';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    setContext(ctx);
  }, []);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e) => {
    if (e.touches && e.touches[0]) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top
      };
    }
    return {
      offsetX: e.offsetX,
      offsetY: e.offsetY
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    onSave(imageData);
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border border-[#3F3F3F] rounded-lg bg-[#2E2E2E] cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2">
        <button
          onClick={clearCanvas}
          className="px-3 py-1 bg-[#3F3F3F] text-white rounded hover:bg-[#4F4F4F] transition-colors"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-[#D00102] text-white rounded hover:bg-[#D00102]/90 transition-colors"
        >
          Save Drawing
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-[#3F3F3F] text-white rounded hover:bg-[#4F4F4F] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas; 