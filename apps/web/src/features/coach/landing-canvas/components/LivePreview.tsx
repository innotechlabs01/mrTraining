/**
 * LivePreview — Vista previa en vivo del canvas.
 *
 * Renderiza CoachLandingDocumentView (el mismo componente compartido que usa
 * la pagina publica /l/[slug]) para cada seccion del documento actual. Cuando
 * el estado del canvas cambia (cliente), este componente se re-renderiza y la
 * vista previa se actualiza sin recargar la pagina (AC3, AC4).
 *
 * El unico marco adicional es el chrome del editor (fondo del lienzo, borde,
 * etc.); el contenido (ancho, padding, gaps, fondo, tipografia, color) es
 * identico al de la pagina publica, lo que garantiza WYSIWYG real (F12, F13).
 */
'use client';

import type {
  CoachLandingBlock as CoachLandingBlockType,
  CanvasConfig,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { CoachLandingDocumentView } from '@/features/coach/landing-canvas/components/CoachLandingDocumentView';

interface LivePreviewProps extends CoachLandingBlockInteractionProps {
  sections: CoachLandingBlockType[];
  config: CanvasConfig;
}

export function LivePreview({
  sections,
  config,
  onSelectBlock,
  selectedBlockId,
}: LivePreviewProps): JSX.Element {
  return (
    <div className="coach-live-preview min-h-full bg-surface-0">
      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <p className="text-sm">El lienzo esta vacio. Agrega un bloque desde la paleta.</p>
        </div>
      ) : (
        <CoachLandingDocumentView
          sections={sections}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      )}
    </div>
  );
}
