import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateStudyTopicInput,
  LearnAskRequestInput,
  StudyStatus,
  UpdateLearnerProfileInput,
} from '@velunee/contracts';

import {
  askLearn,
  createStudyTopic,
  deleteStudyTopic,
  loadLearnerProfile,
  loadStudyTopics,
  updateLearnerProfile,
  updateStudyTopicStatus,
} from './api';

const learnKey = ['learn'] as const;

function useInvalidateLearn(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: learnKey });
  };
}

export function useLearnerProfile() {
  return useQuery({
    queryKey: [...learnKey, 'profile'],
    queryFn: () => loadLearnerProfile(),
  });
}

export function useUpdateLearnerProfile() {
  const invalidate = useInvalidateLearn();
  return useMutation({
    mutationFn: (input: UpdateLearnerProfileInput) => updateLearnerProfile(input),
    onSuccess: invalidate,
  });
}

export function useAskLearn() {
  return useMutation({
    mutationFn: (input: LearnAskRequestInput) => askLearn(input),
  });
}

export function useStudyTopics() {
  return useQuery({
    queryKey: [...learnKey, 'topics'],
    queryFn: () => loadStudyTopics(),
  });
}

export function useCreateStudyTopic() {
  const invalidate = useInvalidateLearn();
  return useMutation({
    mutationFn: (input: CreateStudyTopicInput) => createStudyTopic(input),
    onSuccess: invalidate,
  });
}

export function useUpdateStudyTopicStatus() {
  const invalidate = useInvalidateLearn();
  return useMutation({
    mutationFn: (input: { topicId: string; status: StudyStatus }) =>
      updateStudyTopicStatus(input.topicId, input.status),
    onSuccess: invalidate,
  });
}

export function useDeleteStudyTopic() {
  const invalidate = useInvalidateLearn();
  return useMutation({
    mutationFn: (topicId: string) => deleteStudyTopic(topicId),
    onSuccess: invalidate,
  });
}
