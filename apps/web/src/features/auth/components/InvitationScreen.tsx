'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Target, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorState } from './ErrorState';

interface InvitationScreenProps {
  type: 'organization' | 'coach' | 'athlete';
  inviterName: string;
  orgName?: string;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const config = {
  organization: {
    icon: Building2,
    message: (name: string, org?: string) =>
      org
        ? `You've been invited to join ${org} organization`
        : `You've been invited to join an organization`,
  },
  coach: {
    icon: Users,
    message: (name: string) => `${name} has invited you to join their coaching team`,
  },
  athlete: {
    icon: Target,
    message: (name: string) => `${name} wants to coach you`,
  },
};

export function InvitationScreen({
  type,
  inviterName,
  orgName,
  onAccept,
  onDecline,
  isLoading = false,
  error = null,
}: InvitationScreenProps) {
  const Icon = config[type].icon;
  const message = config[type].message(inviterName, orgName);
  const hasAccepted = false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10"
      >
        <Icon className="h-10 w-10 text-brand-primary" />
      </motion.div>

      <div className="text-center">
        <h2 className="text-h3 font-display text-text-primary mb-2">
          You&apos;re Invited!
        </h2>
        <p className="text-body text-text-secondary leading-relaxed">
          {message}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full"
          >
            <ErrorState message={error} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {hasAccepted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <CheckCircle className="h-16 w-16 text-success" />
            <p className="text-body font-semibold text-text-primary">
              Invitation Accepted!
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex w-full flex-col gap-4"
          >
            <button
              type="button"
              onClick={onAccept}
              disabled={isLoading}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold text-body-sm transition-all duration-200',
                'bg-brand-primary text-white',
                'hover:bg-brand-primary-hover active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Accept Invitation'
              )}
            </button>

            <button
              type="button"
              onClick={onDecline}
              disabled={isLoading}
              className="text-body-sm text-text-secondary hover:text-text-primary transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Decline
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
