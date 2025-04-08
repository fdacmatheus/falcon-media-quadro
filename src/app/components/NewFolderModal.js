export default function NewFolderModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = e.target.folderName.value;
    onSubmit(name);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-[#1F1F1F] rounded-lg p-6 w-96">
        <h2 className="text-[#6B7280] text-lg font-medium mb-4">Nova Pasta</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="folderName"
            placeholder="Nome da pasta"
            className="w-full bg-[#2E2E2E] text-[#9CA3AF] placeholder-[#6B7280] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#D00102]"
            autoFocus
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#6B7280] hover:bg-[#2E2E2E] rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#D00102] text-[#1F1F1F] rounded hover:bg-[#D00102]/90 transition-colors"
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 