'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import FolderContent from '../../components/FolderContent';
import FolderIcon from '../../components/FolderIcon';
import NewFolderModal from '../../components/NewFolderModal';

export default function ProjectPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [project, setProject] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchProject();
    fetchFolders();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to load project');
      const data = await response.json();
      setProject(data);
    } catch (error) {
      setError('Failed to load project');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${id}/folders`);
      if (!response.ok) throw new Error('Failed to load folders');
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      setError('Failed to load folders');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name) => {
    try {
      const response = await fetch(`/api/projects/${id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar pasta');
      }

      await fetchFolders();
      setShowNewFolderModal(false);
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      const response = await fetch(`/api/projects/${id}/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }
      
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
    } catch (error) {
      setError(error.message || 'Failed to delete folder');
      console.error('Error:', error);
    }
  };

  const handleFolderClick = (folderId) => {
    router.push(`/projects/${id}/folders/${folderId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#1A1B1E] text-white items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-[#1A1B1E] text-white items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-[#1A1B1E] text-white items-center justify-center">
        <div className="text-white">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-[#1F1F1F] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/projects')}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-lg font-medium">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-400">{project.description}</p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#6B7280] text-xl font-medium">Pastas</h2>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F1F1F] text-[#6B7280] rounded hover:bg-[#2E2E2E] transition-colors"
              >
                <FolderIcon className="w-5 h-5 text-[#D00102]" />
                Nova Pasta
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => router.push(`/projects/${id}/folders/${folder.id}`)}
                  className="group flex flex-col items-center p-4 bg-[#1F1F1F] rounded-lg cursor-pointer hover:bg-[#2E2E2E] transition-colors"
                >
                  <FolderIcon className="w-12 h-12 text-[#D00102] mb-2" />
                  <span className="text-[#6B7280] text-sm text-center group-hover:text-[#9CA3AF] transition-colors">
                    {folder.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <NewFolderModal
            isOpen={showNewFolderModal}
            onClose={() => setShowNewFolderModal(false)}
            onSubmit={handleCreateFolder}
          />
        </div>

        {/* Folder Content */}
        {selectedFolder && (
          <FolderContent 
            folder={selectedFolder} 
            onClose={() => {
              setSelectedFolder(null);
              router.push(`/projects/${id}`);
            }}
          />
        )}
      </div>
    </div>
  );
} 