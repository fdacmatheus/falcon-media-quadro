'use client';
import { use } from 'react';
import FolderContent from '@/app/components/FolderContent';

export default function FolderPage({ params }) {
  const { id: projectId, folderId } = use(params);

  return <FolderContent projectId={projectId} folderId={folderId} />;
} 