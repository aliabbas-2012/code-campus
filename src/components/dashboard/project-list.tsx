'use client';

import { useState } from 'react';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
import { ProjectCard } from './project-card';
import { ProjectFormDialog, type ProjectFormValues } from './project-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StorageQuotaBar } from './storage-quota-bar';
import type { Project } from '@/types/api';

export function ProjectList(): React.ReactNode {
  const { data: allProjects, isLoading, isError, error, refetch } = useProjects();
  const projects = allProjects?.filter((p) => !p.assignment_id);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const handleCreate = (values: ProjectFormValues): void => {
    createProject.mutate(
      { name: values.name, description: values.description || undefined },
      { onSuccess: () => setShowCreate(false) },
    );
  };

  const handleRename = (values: ProjectFormValues): void => {
    if (!renaming) return;
    updateProject.mutate(
      { id: renaming.id, input: { name: values.name, description: values.description || undefined } },
      { onSuccess: () => setRenaming(null) },
    );
  };

  const handleDelete = (): void => {
    if (!deleting) return;
    deleteProject.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
          <div className="mt-2">
            <StorageQuotaBar />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Project
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <p>{error instanceof ApiError ? error.message : 'Failed to load projects.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && projects && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-600">No projects yet — create your first one to start coding.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New Project
          </button>
        </div>
      )}

      {!isLoading && !isError && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onRename={() => setRenaming(project)}
              onDelete={() => setDeleting(project)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <ProjectFormDialog
          title="New Project"
          submitLabel="Create"
          isSubmitting={createProject.isPending}
          submitError={createProject.error}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {renaming && (
        <ProjectFormDialog
          title="Rename Project"
          submitLabel="Save"
          defaultValues={{ name: renaming.name, description: renaming.description ?? '' }}
          isSubmitting={updateProject.isPending}
          submitError={updateProject.error}
          onSubmit={handleRename}
          onClose={() => setRenaming(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="This will permanently delete all files inside it. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
