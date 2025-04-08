'use client';

const CommentMarker = ({ comment, position, onHover, onLeave, onClick }) => {
  return (
    <div
      className="absolute flex items-center justify-center w-5 h-5 bg-[#2E2E2E] rounded-full cursor-pointer hover:scale-110 transition-transform group border border-[#D00102]"
      style={{ left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span className="text-[10px] font-medium text-white">
        {comment.author[0].toUpperCase()}
      </span>
      <div className="fixed transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999]"
           style={{ 
             left: `${position}%`,
             bottom: 'calc(100% + 40px)'
           }}>
        <div className="bg-[#2E2E2E] p-2 rounded-lg shadow-lg whitespace-nowrap border border-[#3F3F3F]">
          <p className="text-white text-sm">{comment.text}</p>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
            <span>{comment.author}</span>
            {comment.resolved && <span className="text-green-500">Resolved</span>}
          </div>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-2 h-2 bg-[#2E2E2E] border-r border-b border-[#3F3F3F] rotate-45"></div>
      </div>
    </div>
  );
};

export default CommentMarker; 