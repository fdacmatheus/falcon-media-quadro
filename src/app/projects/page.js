'use client';
import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import FolderContent from '../components/FolderContent';

export default function ProjectsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Load folders when a project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchFolders(selectedProject);
      router.push(`/projects/${selectedProject}`);
    } else {
      setFolders([]);
      router.push('/projects');
    }
  }, [selectedProject, router]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to load projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      setError('Failed to load projects');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async (projectId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/folders`);
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim()
        }),
      });

      if (!response.ok) throw new Error('Failed to create project');
      
      const newProject = await response.json();
      setProjects([...projects, newProject]);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowNewProjectModal(false);
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      setError('Failed to create project');
      console.error('Error:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedProject) return;

    try {
      const response = await fetch(`/api/projects/${selectedProject}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: null // Can be updated to support subfolders
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
      
      const newFolder = await response.json();
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (error) {
      setError(error.message || 'Failed to create folder');
      console.error('Error:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Iniciando deleção do projeto:', projectId);
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      console.log('Resposta da deleção:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir projeto');
      }

      // Atualiza a UI
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
      
      // Limpa a seleção se necessário
      if (selectedProject === projectId) {
        setSelectedFolder(null);
        setSelectedProject(null);
        setFolders([]);
        router.push('/projects');
      }

      // Feedback de sucesso
      setError('Projeto excluído com sucesso');
      setTimeout(() => setError(null), 3000);

    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      setError('Erro ao excluir projeto: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      const response = await fetch(`/api/projects/${selectedProject}/folders/${folderId}`, {
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

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    router.push(`/projects/${selectedProject}/folders/${folder.id}`);
  };

  return (
    <div className="flex h-screen bg-[#1A1B1E] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#1A1B1E] border-r border-[#2E2E2E] flex flex-col">
        {/* Account Header */}
        <div className="p-4 border-b border-[#2E2E2E]">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium">Falcon Media System</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-[#2E2E2E] text-white pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 mb-2">
            <button 
              className="w-full px-4 py-2 bg-[#D00102] text-white rounded-md hover:bg-[#B00102] transition-colors text-sm"
              onClick={() => setShowNewProjectModal(true)}
            >
              New Project
            </button>
          </div>
          {projects.map(project => (
            <div
              key={project.id}
              className={`px-4 py-2 cursor-pointer group flex items-center justify-between ${
                selectedProject === project.id ? 'bg-[#2E2E2E]' : 'hover:bg-[#2E2E2E]'
              }`}
            >
              <div 
                className="flex-1"
                onClick={() => setSelectedProject(project.id)}
              >
                <span className="text-sm text-gray-300 hover:text-white">{project.name}</span>
                {project.description && (
                  <p className="text-xs text-gray-500 mt-1">{project.description}</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedFolder ? (
          <FolderContent 
            folder={selectedFolder} 
            onClose={() => {
              setSelectedFolder(null);
              router.push(`/projects/${selectedProject}`);
            }} 
          />
        ) : (
          <>
            {/* Project Header */}
            <div className="bg-[#1A1B1E] border-b border-[#2E2E2E] p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-medium">
                  {projects.find(p => p.id === selectedProject)?.name}
                </h1>
                <button 
                  className="px-4 py-2 bg-[#D00102] text-white rounded-md hover:bg-[#B00102] transition-colors"
                  onClick={() => setShowNewFolderModal(true)}
                >
                  New Folder
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {folders.map(folder => (
                  <div 
                    key={folder.id} 
                    className="bg-[#2E2E2E] rounded-lg p-4 hover:bg-[#3E3E3E] transition-colors cursor-pointer group relative"
                    onClick={() => handleFolderClick(folder)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-40 h-24 bg-black rounded-md overflow-hidden flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white">{folder.name}</h3>
                        <p className="text-sm text-gray-400">
                          {folder.subFolders?.length || 0} {folder.subFolders?.length === 1 ? 'subfolder' : 'subfolders'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#1A1B1E] rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Create New Project</h2>
              <button onClick={() => setShowNewProjectModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Project Name"
              className="w-full bg-[#2E2E2E] text-white px-4 py-2 rounded-md mb-4"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <textarea
              placeholder="Project Description"
              className="w-full bg-[#2E2E2E] text-white px-4 py-2 rounded-md mb-4 h-24 resize-none"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-400 hover:text-white"
                onClick={() => setShowNewProjectModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#D00102] text-white rounded-md hover:bg-[#B00102]"
                onClick={handleCreateProject}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#1A1B1E] rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Create New Folder</h2>
              <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Folder Name"
              className="w-full bg-[#2E2E2E] text-white px-4 py-2 rounded-md mb-4"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-400 hover:text-white"
                onClick={() => setShowNewFolderModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#D00102] text-white rounded-md hover:bg-[#B00102]"
                onClick={handleCreateFolder}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#1A1B1E] rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
} 