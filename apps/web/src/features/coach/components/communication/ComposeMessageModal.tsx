'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2, Users, UserCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAthletes } from '../../hooks/useAthletes';
import { useAI } from '../../hooks/useAI';

interface ComposeMessageModalProps {
  onClose: () => void;
  onSend: (to: string[], type: 'individual' | 'announcement', message: string) => void;
}

export default function ComposeMessageModal({ onClose, onSend }: ComposeMessageModalProps) {
  const { athletes } = useAthletes();
  const { suggestions: suggestedMessages } = useAI();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messageType, setMessageType] = useState<'individual' | 'announcement'>('individual');
  const [message, setMessage] = useState('');
  const [assisting, setAssisting] = useState(false);

  const toggleAthlete = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }, []);

  const handleAiAssist = useCallback(() => {
    setAssisting(true);
    const randomSuggestion =
      suggestedMessages[Math.floor(Math.random() * suggestedMessages.length)];
    setTimeout(() => {
      setMessage(randomSuggestion.description);
      setAssisting(false);
    }, 800);
  }, [suggestedMessages]);

  const handleSend = useCallback(() => {
    if (selectedIds.length === 0 || !message.trim()) return;
    onSend(selectedIds, messageType, message.trim());
    onClose();
  }, [selectedIds, messageType, message, onSend, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const canSend = selectedIds.length > 0 && message.trim().length > 0;

  const selectedNames = useMemo(
    () =>
      selectedIds
        .map((id) => athletes.find((a) => a.id === id)?.name)
        .filter(Boolean),
    [selectedIds, athletes],
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleOverlayClick}
      >
        <motion.div
          className={cn(
            'relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl',
            'bg-surface-1 border border-white/10 shadow-2xl',
          )}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface-1 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">New Message</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-surface-3 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            <section>
              <label className="mb-2 block text-sm font-medium text-secondary">To</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMessageType('individual')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    messageType === 'individual'
                      ? 'bg-brand-primary text-white'
                      : 'bg-surface-3 text-secondary hover:text-white',
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setMessageType('announcement')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    messageType === 'announcement'
                      ? 'bg-brand-primary text-white'
                      : 'bg-surface-3 text-secondary hover:text-white',
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  Group Announcement
                </button>
              </div>

              {messageType === 'announcement' && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === athletes.length ? [] : athletes.map((a) => a.id),
                    )
                  }
                  className="mb-2 text-xs text-brand-secondary hover:underline"
                >
                  {selectedIds.length === athletes.length ? 'Deselect all' : 'Select all athletes'}
                </button>
              )}

              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg bg-surface-2 p-2">
                {athletes.length === 0 && (
                  <p className="py-4 text-center text-sm text-[#6B7280]">No athletes found</p>
                )}
                {athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => toggleAthlete(athlete.id)}
                    disabled={messageType === 'individual' && selectedIds.length > 0 && !selectedIds.includes(athlete.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-200',
                      selectedIds.includes(athlete.id)
                        ? 'bg-brand-primary/15 text-white'
                        : 'text-secondary hover:bg-surface-3 hover:text-white',
                      messageType === 'individual' && selectedIds.length > 0 && !selectedIds.includes(athlete.id) && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-4">
                      {athlete.avatarUrl ? (
                        <img
                          src={athlete.avatarUrl}
                          alt={athlete.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="flex-1 text-sm">{athlete.name}</span>
                    {selectedIds.includes(athlete.id) && (
                      <UserCheck className="h-4 w-4 text-brand-primary" />
                    )}
                  </button>
                ))}
              </div>

              {selectedNames.length > 0 && (
                <p className="mt-2 text-xs text-[#6B7280]">
                  To: {selectedNames.join(', ')}
                </p>
              )}
            </section>

            <section>
              <label className="mb-2 block text-sm font-medium text-secondary">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className={cn(
                  'w-full resize-none rounded-lg border border-white/10 bg-surface-3 px-4 py-3 text-sm text-white placeholder:text-[#6B7280]',
                  'focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary',
                  'transition-all duration-200',
                )}
              />
              <button
                type="button"
                onClick={handleAiAssist}
                disabled={assisting}
                className={cn(
                  'mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  assisting
                    ? 'bg-surface-3 text-[#6B7280] cursor-not-allowed'
                    : 'glass-card text-brand-primary hover:bg-white/[0.08]',
                )}
              >
                {assisting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {assisting ? 'Generating...' : 'AI Assist'}
              </button>
            </section>
          </div>

          <div className="border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white',
                'transition-all duration-200',
                canSend
                  ? 'bg-brand-primary hover:bg-brand-primary-hover'
                  : 'bg-surface-3 text-[#6B7280] cursor-not-allowed',
              )}
            >
              <Send className="h-4 w-4" />
              Send Message
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
