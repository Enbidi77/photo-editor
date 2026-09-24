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

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['pending-invitations'],
    queryFn: () => remoteProjectRepository.getPendingInvitations(),
    refetchInterval: 1000 * 30, // Poll every 30 seconds
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => remoteProjectRepository.acceptInvitation(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['projects-list'] });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => remoteProjectRepository.declineInvitation(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
    },
  });
}

export function useProjectInvites(projectId: string | null) {
  return useQuery({
    queryKey: ['project-invites', projectId],
    queryFn: () => (projectId ? remoteProjectRepository.getProjectInvites(projectId) : []),
    enabled: Boolean(projectId),
  });
}

export function useCancelProjectInvite(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => remoteProjectRepository.cancelProjectInvite(projectId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invites', projectId] });
    },
  });
}
