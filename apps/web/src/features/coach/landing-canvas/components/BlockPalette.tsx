/**
 * BlockPalette — Paleta de bloques disponibles para agregar al lienzo.
 * Client Component.
 */
'use client';

import type { BlockType } from '@/features/coach/landing-canvas/types';
import {
  blockTypeLabel,
  createHeroBlock,
  createHeadingBlock,
  createTextBlock,
  createImageBlock,
  createButtonBlock,
  createDividerBlock,
  createSocialLinksBlock,
  createContactBlock,
} from '@/features/coach/landing-canvas/utils/block-utils';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCK_TYPES: BlockType[] = [
  'hero',
  'heading',
  'text',
  'image',
  'button',
  'divider',
  'social-links',
  'contact',
];

interface BlockPaletteProps {
  onAdd: (block: { type: BlockType }) => void;
}

export function BlockPalette({ onAdd }: BlockPaletteProps): JSX.Element {
  const handleAdd = (type: BlockType) => {
    let block: { type: BlockType };
    switch (type) {
      case 'hero':
        block = createHeroBlock();
        break;
      case 'heading':
        block = createHeadingBlock();
        break;
      case 'text':
        block = createTextBlock();
        break;
      case 'image':
        block = createImageBlock();
        break;
      case 'button':
        block = createButtonBlock();
        break;
      case 'divider':
        block = createDividerBlock();
        break;
      case 'social-links':
        block = createSocialLinksBlock();
        break;
      case 'contact':
        block = createContactBlock();
        break;
      default:
        throw new Error(`Unknown block type: ${type}`);
    }
    onAdd(block);
  };

  return (
    <div className="coach-palette h-full flex flex-col gap-4 p-4 bg-surface-1 border-r border-surface-3">
      <div className="flex items-center gap-2 px-2">
        <Plus size={16} />
        <span className="text-xs font-medium text-text-primary uppercase tracking-wider">
          Agregar bloque
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleAdd(type)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm transition-colors',
              'bg-surface-2 border border-surface-3 text-text-secondary hover:bg-surface-3 hover:text-text-primary',
            )}
          >
            <span className="text-text-muted">{blockTypeLabel(type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
