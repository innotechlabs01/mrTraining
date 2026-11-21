import type { KeyboardEvent, MouseEvent } from 'react';
import type { CoachLandingBlockInteractionProps } from '@/features/coach/landing-canvas/types';

export interface BlockInteractionState {
  isSelectable: boolean;
  isSelected: boolean;
  handleClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
  handleKeyDown?: ((event: KeyboardEvent<HTMLElement>) => void) | undefined;
}

/**
 * Construye el comportamiento de seleccion para un bloque del canvas.
 *
 * El click siempre cancela la accion por defecto para que un enlace dentro
 * del bloque no navegue mientras el coach esta editando. Enter y Espacio
 * activan el mismo comportamiento para navegacion por teclado.
 */
export function getBlockInteractionState(
  blockId: string,
  {
    onSelectBlock,
    selectedBlockId,
  }: CoachLandingBlockInteractionProps,
): BlockInteractionState {
  if (!onSelectBlock) {
    return {
      isSelectable: false,
      isSelected: false,
    };
  }

  const selectBlock = () => onSelectBlock(blockId);

  return {
    isSelectable: true,
    isSelected: selectedBlockId === blockId,
    handleClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectBlock();
    },
    handleKeyDown: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      selectBlock();
    },
  };
}
