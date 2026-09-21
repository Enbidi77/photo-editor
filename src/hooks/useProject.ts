'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remoteProjectRepository, CreateProjectInput } from '@/lib/projects/remoteProjectRepository';

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? remoteProjectRepository.get(projectId) : null),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => (projectId ? remoteProjectRepository.getMembers(projectId) : []),
    enabled: Boolean(projectId),
  });
}

export function useProjectsList() {
  return useQuery({
    queryKey: ['projects-list'],
    queryFn: () => remoteProjectRepository.getAll(),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => remoteProjectRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => remoteProjectRepository.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });
}
