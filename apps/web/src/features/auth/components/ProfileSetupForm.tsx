'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileSetupFormProps {
  onSubmit: (data: { firstName: string; lastName: string; avatar?: File }) => void;
  initialData?: { firstName: string; lastName: string };
  isLoading?: boolean;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' },
  }),
};

export function ProfileSetupForm({ onSubmit, initialData, isLoading }: ProfileSetupFormProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName ?? '');
  const [lastName, setLastName] = useState(initialData?.lastName ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ firstName, lastName });
  };

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center mb-2">
        <h2 className="text-h3 font-display text-text-primary mb-2">
          Set up your profile
        </h2>
        <p className="text-body-sm text-text-secondary">
          Tell us a bit about yourself
        </p>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key="avatar-field"
          custom={0}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-3"
        >
          <div className="text-caption text-text-secondary">Profile Photo</div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-3 border-2 border-surface-6 transition-all duration-200 group"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-surface-5 to-surface-3" />
            )}

            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center transition-all duration-200',
                avatarHover ? 'bg-black/50' : 'bg-black/20',
              )}
            >
              <Camera
                className={cn(
                  'w-6 h-6 text-white transition-all duration-200',
                  avatarHover ? 'scale-110' : 'scale-100',
                )}
              />
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </motion.div>

        <motion.div
          key="firstName-field"
          custom={1}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-1.5"
        >
          <label className="text-caption text-text-secondary">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            className={cn(
              'h-12 px-4 rounded-md text-white text-body-sm',
              'bg-surface-2 border border-surface-6',
              'placeholder:text-text-secondary/50',
              'focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20',
              'transition-all duration-200',
            )}
          />
        </motion.div>

        <motion.div
          key="lastName-field"
          custom={2}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-1.5"
        >
          <label className="text-caption text-text-secondary">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
            className={cn(
              'h-12 px-4 rounded-md text-white text-body-sm',
              'bg-surface-2 border border-surface-6',
              'placeholder:text-text-secondary/50',
              'focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20',
              'transition-all duration-200',
            )}
          />
        </motion.div>
      </AnimatePresence>

      <motion.div
        key="submit-field"
        custom={3}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={cn(
            'w-full h-12 rounded-md font-semibold text-body-sm transition-all duration-200',
            'bg-brand-primary text-white',
            'hover:bg-brand-primary-hover active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2',
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </motion.div>
    </motion.form>
  );
}
