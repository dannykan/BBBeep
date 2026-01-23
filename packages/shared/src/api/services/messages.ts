/**
 * Messages API Service
 */

import { getApiClient } from '../client';
import type { Message, SentMessage, MessageType } from '../../types';

export const messagesApi = {
  create: (data: {
    licensePlate: string;
    type: MessageType;
    template: string;
    customText?: string;
    useAiRewrite?: boolean;
    location?: string;
    occurredAt?: string;
  }) =>
    getApiClient()
      .post<Message>('/messages', data)
      .then((res) => res.data),

  getAll: (unreadOnly?: boolean) =>
    getApiClient()
      .get<Message[]>('/messages', { params: { unreadOnly } })
      .then((res) => res.data),

  getSent: () =>
    getApiClient()
      .get<SentMessage[]>('/messages/sent')
      .then((res) => res.data),

  getOne: (id: string) =>
    getApiClient()
      .get<Message>(`/messages/${id}`)
      .then((res) => res.data),

  markAsRead: (id: string) =>
    getApiClient()
      .post(`/messages/${id}/read`)
      .then((res) => res.data),

  reply: (
    id: string,
    replyText: string,
    options?: { isQuickReply?: boolean; useAiRewrite?: boolean }
  ) =>
    getApiClient()
      .post(`/messages/${id}/reply`, { replyText, ...options })
      .then((res) => res.data),

  report: (id: string, reason?: string) =>
    getApiClient()
      .post(`/messages/${id}/report`, { reason })
      .then((res) => res.data),
};
