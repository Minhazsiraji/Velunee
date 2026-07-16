import {
  learnAskResponseSchema,
  learnDeletedResponseSchema,
  learnerProfileResponseSchema,
  studyTopicResponseSchema,
  studyTopicsResponseSchema,
  type CreateStudyTopicInput,
  type LearnAskRequestInput,
  type LearnAskResponse,
  type LearnDeletedResponse,
  type LearnerProfileResponse,
  type StudyStatus,
  type StudyTopicResponse,
  type StudyTopicsResponse,
  type UpdateLearnerProfileInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadLearnerProfile(): Promise<LearnerProfileResponse> {
  const payload = await apiRequest<unknown>('/learn/profile');
  return learnerProfileResponseSchema.parse(payload);
}

export async function updateLearnerProfile(
  input: UpdateLearnerProfileInput,
): Promise<LearnerProfileResponse> {
  const payload = await apiRequest<unknown>('/learn/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return learnerProfileResponseSchema.parse(payload);
}

export async function askLearn(input: LearnAskRequestInput): Promise<LearnAskResponse> {
  const payload = await apiRequest<unknown>('/learn/ask', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return learnAskResponseSchema.parse(payload);
}

export async function loadStudyTopics(): Promise<StudyTopicsResponse> {
  const payload = await apiRequest<unknown>('/learn/topics');
  return studyTopicsResponseSchema.parse(payload);
}

export async function createStudyTopic(input: CreateStudyTopicInput): Promise<StudyTopicResponse> {
  const payload = await apiRequest<unknown>('/learn/topics', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return studyTopicResponseSchema.parse(payload);
}

export async function updateStudyTopicStatus(
  topicId: string,
  status: StudyStatus,
): Promise<StudyTopicResponse> {
  const payload = await apiRequest<unknown>(`/learn/topics/${topicId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return studyTopicResponseSchema.parse(payload);
}

export async function deleteStudyTopic(topicId: string): Promise<LearnDeletedResponse> {
  const payload = await apiRequest<unknown>(`/learn/topics/${topicId}`, { method: 'DELETE' });
  return learnDeletedResponseSchema.parse(payload);
}
