'use client';

import { useRouter } from 'next/navigation';
import type { Project } from '@/types/api';

interface ProjectCardProps {
  project: Project;
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onRename, onDelete }: ProjectCardProps): React.ReactNode {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/projects/${project.id}`)}
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900">{project.name}</h3>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            aria-label="Rename project"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete project"
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-gray-500">
        {project.description || 'No description'}
      </p>
    </div>
  );
}
