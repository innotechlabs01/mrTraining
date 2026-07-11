'use client';

import { useState, useEffect, useCallback } from 'react';
import { MOCK_TICKETS } from '@/features/coach/data/_mocks';
import type { SupportTicket, TicketMessage, TicketAuthor } from '@/features/coach/types';

const STORAGE_KEY = 'mr-training-tickets';

function loadTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return MOCK_TICKETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_TICKETS;
    const parsed = JSON.parse(raw) as SupportTicket[];
    if (!Array.isArray(parsed) || parsed.length === 0) return MOCK_TICKETS;
    return parsed;
  } catch {
    return MOCK_TICKETS;
  }
}

function nextNumber(tickets: SupportTicket[]): number {
  return tickets.reduce((max, t) => Math.max(max, t.number), 0) + 1;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewTicketInput {
  subject: string;
  category: SupportTicket['category'];
  priority: SupportTicket['priority'];
  body: string;
  imageUrl?: string;
}

export function useTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);

  useEffect(() => {
    setTickets(loadTickets());
  }, []);

  const persist = useCallback((next: SupportTicket[]) => {
    setTickets(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const createTicket = useCallback(
    (input: NewTicketInput) => {
      const current = loadTickets();
      const number = nextNumber(current);
      const now = new Date().toISOString();
      const ticket: SupportTicket = {
        id: uid('tk'),
        number,
        subject: input.subject,
        category: input.category,
        priority: input.priority,
        status: 'open',
        createdAt: now,
        messages: [
          {
            id: uid('msg'),
            author: 'coach',
            body: input.body,
            imageUrl: input.imageUrl,
            createdAt: now,
          },
          {
            id: uid('msg'),
            author: 'support',
            body: `Gracias por tu reporte #${number}. Nuestro equipo de soporte lo revisará a la brevedad.`,
            createdAt: new Date(Date.now() + 1000).toISOString(),
          },
        ],
      };
      persist([ticket, ...current]);
      return ticket;
    },
    [persist],
  );

  const addMessage = useCallback(
    (ticketId: string, author: TicketAuthor, body: string, imageUrl?: string) => {
      const current = loadTickets();
      const next = current.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              messages: [
                ...t.messages,
                { id: uid('msg'), author, body, imageUrl, createdAt: new Date().toISOString() },
              ],
            }
          : t,
      );
      persist(next);
    },
    [persist],
  );

  const resolveTicket = useCallback(
    (ticketId: string) => {
      const current = loadTickets();
      const next = current.map((t) =>
        t.id === ticketId ? { ...t, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : t,
      );
      persist(next);
    },
    [persist],
  );

  const reopenTicket = useCallback(
    (ticketId: string) => {
      const current = loadTickets();
      const next = current.map((t) =>
        t.id === ticketId ? { ...t, status: 'open' as const, resolvedAt: undefined } : t,
      );
      persist(next);
    },
    [persist],
  );

  return { tickets, createTicket, addMessage, resolveTicket, reopenTicket };
}
