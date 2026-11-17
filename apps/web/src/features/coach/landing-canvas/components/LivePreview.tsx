/**
 * LivePreview — Vista previa en vivo del canvas.
 *
 * Renderiza CoachLandingBlock (Server Component puro, mismo import path que
 * /l/[slug]) para cada seccion del documento actual. Cuando el estado del
 * canvas cambia (cliente), este componente se re-renderiza y la vista previa
 * se actualiza sin recargar la pagina (AC3, AC4).
 *
 * Nota: CoachLandingBlock se importa sin 'use client'. Es un Server Component
 * puro que se renderiza tanto en el servidor (/l/[slug]) como aqui (preview
 * del editor), garantizando WYSIWYG por construccion (D1, AC2).
 */
'use client';

import type {
  CoachLandingBlock as CoachLandingBlockType,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import { CoachLandingBlock } from '@/features/coach/landing-canvas/components/blocks/CoachLandingBlock';

interface LivePreviewProps {
  sections: CoachLandingBlockType[];
  config: CanvasConfig;
}

export function LivePreview({ sections, config }: LivePreviewProps): JSX.Element {
  return (
    <div className="coach-live-preview min-h-full bg-surface-0">
      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-muted">
          <p className="text-sm">El lienzo esta vacio. Agrega un bloque desde la paleta.</p>
        </div>
      ) : (
        <main className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
          {sections.map((block) => (
            <CoachLandingBlock
              key={block.id}
              block={block}
              config={config}
            />
          ))}
        </main>
      )}
    </div>
  );
}
