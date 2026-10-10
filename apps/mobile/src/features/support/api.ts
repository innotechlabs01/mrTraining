import { smartClient } from '../../infrastructure/api/client';
import type {
  SupportTicket,
  TicketMessage,
  CreateTicketRequest,
  AddMessageRequest,
  UnreadCountResponse,
  TicketListResponse,
} from '../support/types';

// Support API service for athlete
export const supportApi = {
  // Athlete tickets
  getMyTickets: async (status?: string): Promise<SupportTicket[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await smartClient.get<{ data?: SupportTicket[] }>(`/athlete/tickets${params}`);
    return Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
  },

  createTicket: async (data: CreateTicketRequest): Promise<{ id: string }> => {
    const response = await smartClient.post<{ id: string }>('/athlete/tickets', data);
    return response.data;
  },

  getTicket: async (id: string): Promise<SupportTicket> => {
    const response = await smartClient.get<SupportTicket>(`/athlete/tickets/${id}`);
    return response.data;
  },

  // Messages
  getMessages: async (ticketId: string): Promise<TicketMessage[]> => {
    const response = await smartClient.get<{ data?: TicketMessage[] }>(`/tickets/${ticketId}/messages`);
    return Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
  },

  addMessage: async (ticketId: string, data: AddMessageRequest): Promise<{ id: string }> => {
    const response = await smartClient.post<{ id: string }>(`/tickets/${ticketId}/messages`, data);
    return response.data;
  },

  markRead: async (ticketId: string): Promise<{ ok: boolean }> => {
    const response = await smartClient.post<{ ok: boolean }>(`/tickets/${ticketId}/read`);
    return response.data;
  },

  getUnreadCount: async (ticketId: string): Promise<number> => {
    const response = await smartClient.get<UnreadCountResponse>(`/tickets/${ticketId}/unread`);
    return response.data.count;
  },
};

export type CreateTicketRequest = {
  subject: string;
  body: string;
  category?: string;
  priority?: string;
  image_url?: string;
};

export type AddMessageRequest = {
  body: string;
  image_url?: string;
};