// Support ticket types for mobile (athlete perspective)

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'problem' | 'question' | 'feature' | 'billing' | 'technical' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketAuthor = 'coach' | 'support' | 'athlete';

export interface SupportTicket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  coach_id: string;
  athlete_id?: string;
  assigned_to?: string;
  unread_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author: TicketAuthor;
  author_id: string;
  body: string;
  image_url?: string;
  read_at?: string;
  created_at: string;
}

export interface CreateTicketRequest {
  subject: string;
  body: string;
  category?: string;
  priority?: string;
  image_url?: string;
}

export interface AddMessageRequest {
  body: string;
  image_url?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface TicketListResponse {
  data: SupportTicket[];
  total: number;
  page: number;
  limit: number;
}