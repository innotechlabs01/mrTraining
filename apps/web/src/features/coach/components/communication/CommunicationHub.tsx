'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Sparkles,
  Send,
  Pencil,
  AlertCircle,
  RefreshCw,
  Loader2,
  User,
  ChevronRight,
  Mail,
  MailOpen,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessages } from '../../hooks/useMessages';
import { useAI } from '../../hooks/useAI';
import MessageThread from './MessageThread';
import ComposeMessageModal from './ComposeMessageModal';
import type { MessageThread as MessageThreadType } from '../../types';

type ThreadTab = 'all' | 'unread' | 'athletes';

export default function CommunicationHub() {
  const { threads, unreadCount, isLoading, error } = useMessages();
  const { suggestions } = useAI();
  const [activeTab, setActiveTab] = useState<ThreadTab>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [sendingSuggestion, setSendingSuggestion] = useState<string | null>(null);

  const filteredThreads = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return threads.filter((t) => t.unread);
      case 'athletes':
        return threads.filter((t) => t.participants.length === 1);
      default:
        return threads;
    }
  }, [threads, activeTab]);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const visibleSuggestions = showAllSuggestions
    ? suggestions
    : suggestions.slice(0, 2);

  const handleSendSuggestion = useCallback((suggestionId: string) => {
    setSendingSuggestion(suggestionId);
    setTimeout(() => setSendingSuggestion(null), 1000);
  }, []);

  const handleSendMessage = useCallback(
    (_to: string[], _type: string, _message: string) => {
      // onSend callback - message would be sent via API
    },
    [],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-surface-1 p-12">
        <AlertCircle className="h-8 w-8 text-error" />
        <p className="text-sm text-secondary">Failed to load messages</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          <RefreshCw className="mr-2 inline h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      <div className={cn('flex flex-col', selectedThread ? 'hidden lg:flex lg:w-80' : 'flex-1 lg:w-80')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold font-display text-white">Communication</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
          {(['all', 'unread', 'athletes'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200',
                activeTab === tab
                  ? 'bg-surface-4 text-white'
                  : 'text-secondary hover:text-white',
              )}
            >
              {tab}
              {tab === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 text-brand-primary">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2" />
              ))}
            </div>
          )}

          {!isLoading && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Mail className="mb-3 h-10 w-10 text-[#6B7280]" />
              <p className="text-sm text-[#6B7280]">No messages yet</p>
            </div>
          )}

          {!isLoading && filteredThreads.length === 0 && threads.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <MailOpen className="mb-3 h-10 w-10 text-[#6B7280]" />
              <p className="text-sm text-[#6B7280]">No {activeTab} messages</p>
            </div>
          )}

          {!isLoading &&
            filteredThreads.map((thread, i) => (
              <motion.button
                key={thread.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05, ease: 'easeOut' }}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200',
                  selectedThreadId === thread.id
                    ? 'bg-brand-primary/10 border border-brand-primary/20'
                    : 'hover:bg-surface-2 border border-transparent',
                )}
              >
                <div className="flex shrink-0 -space-x-1.5">
                  {thread.participants.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface-1 bg-surface-4"
                    >
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-[#6B7280]" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {thread.participants.map((p) => p.name).join(', ')}
                    </span>
                    {thread.unread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[#6B7280]">
                    {thread.lastMessage.content}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6B7280]/60">
                    {thread.lastMessage.timestamp}
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#6B7280]" />
              </motion.button>
            ))}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
              <span className="text-xs font-medium text-brand-primary">
                AI-Suggested Messages
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Based on today&apos;s performance, consider sending:
            </p>
            <AnimatePresence>
              {visibleSuggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="glass-card rounded-lg p-3"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-brand-primary" />
                    <span className="text-xs font-semibold text-brand-primary">AI</span>
                    <span className="text-xs font-medium text-white">{suggestion.title}</span>
                  </div>
                  <p className="text-sm text-secondary">{suggestion.description}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendSuggestion(suggestion.id)}
                      disabled={sendingSuggestion === suggestion.id}
                      className="flex items-center gap-1 rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
                    >
                      {sendingSuggestion === suggestion.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Send
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-surface-3 px-3 py-1 text-xs font-medium text-secondary transition-colors hover:text-white"
                    >
                      Edit
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {suggestions.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                className="text-xs text-brand-secondary hover:underline"
              >
                {showAllSuggestions
                  ? 'Show less'
                  : `Show ${suggestions.length - 2} more suggestions`}
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className={cn(
            'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full',
            'bg-brand-primary text-white shadow-lg shadow-brand-primary/30',
            'transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-xl hover:shadow-brand-primary/40',
            'lg:relative lg:bottom-auto lg:right-auto lg:mt-4 lg:h-auto lg:w-full lg:rounded-lg lg:px-4 lg:py-3 lg:shadow-none',
          )}
          aria-label="Compose message"
        >
          <Pencil className="h-5 w-5 lg:mr-2" />
          <span className="hidden lg:inline text-sm font-semibold">New Message</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {selectedThread && (
          <motion.div
            key={selectedThread.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn(
              'flex-1 rounded-xl border border-white/10 bg-surface-1 overflow-hidden',
              'fixed inset-0 z-30 lg:relative lg:inset-auto',
              selectedThread ? 'flex' : 'hidden',
            )}
          >
            <MessageThread
              thread={selectedThread}
              onBack={() => setSelectedThreadId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompose && (
          <ComposeMessageModal
            onClose={() => setShowCompose(false)}
            onSend={handleSendMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
