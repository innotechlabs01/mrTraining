'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageThread as MessageThreadType, Message } from '../../types';

interface MessageThreadProps {
  thread: MessageThreadType;
  onBack?: () => void;
}

export default function MessageThread({ thread, onBack }: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState(thread.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages(thread.messages);
  }, [thread.id, thread.messages]);

  const handleSend = useCallback(() => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    const msg: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'coach',
      senderName: 'You',
      content: trimmed,
      timestamp: 'Just now',
      type: 'text',
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [newMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const participantNames = thread.participants.map((p) => p.name).join(', ');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-surface-3 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex -space-x-2">
          {thread.participants.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-1 bg-surface-4"
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt={p.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-[#6B7280]" />
              )}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{participantNames}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isCoach = msg.senderId === 'coach';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn('flex', isCoach ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    isCoach
                      ? 'bg-brand-primary text-white rounded-br-md'
                      : 'bg-surface-3 text-white rounded-bl-md',
                  )}
                >
                  {!isCoach && (
                    <p className="mb-0.5 text-xs font-medium text-[#6B7280]">{msg.senderName}</p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-right text-xs',
                      isCoach ? 'text-white/60' : 'text-[#6B7280]',
                    )}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className={cn(
              'flex-1 rounded-lg bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-[#6B7280]',
              'border border-white/10 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary',
              'transition-all duration-200',
            )}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
              newMessage.trim()
                ? 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                : 'bg-surface-3 text-[#6B7280]',
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
