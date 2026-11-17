/**
 * CoachLandingDocumentView — Renderiza una landing completa de coach.
 *
 * Server Component puro (sin 'use client'), igual que CoachLandingBlock. Es el
 * unico contenedor de pagina compartido por la vista previa del editor
 * (LivePreview) y la pagina publica /l/[slug], lo que garantiza WYSIWYG real:
 * mismo ancho, mismo padding, misma separacion, mismo fondo, misma tipografia
 * y mismo color en preview y pagina publicada (F12, F13).
 *
 * Inyecta las variables CSS del tema del coach (--coach-primary, --coach-bg,
 * --coach-font) a partir del config global, para que el config del inspector
 * se aplique tanto en preview como en pagina publica.
 *
 * Nunca usa dangerouslySetInnerHTML. Todo el renderizado delega en
 * CoachLandingBlock (el mismo renderer que usa la pagina publica).
 */
import type {
  CoachLandingBlock as CoachLandingBlockType,
  CanvasConfig,
  CoachLandingBlockInteractionProps,
} from '@/features/coach/landing-canvas/types';
import { buildCoachLandingCssVars } from '@/features/coach/landing-canvas/utils/block-utils';
import { CoachLandingBlock } from '@/features/coach/landing-canvas/components/blocks/CoachLandingBlock';

interface CoachLandingDocumentViewProps extends CoachLandingBlockInteractionProps {
  sections: CoachLandingBlockType[];
  config: CanvasConfig;
}

export function CoachLandingDocumentView({
  sections,
  config,
  onSelectBlock,
  selectedBlockId,
}: CoachLandingDocumentViewProps): JSX.Element {
  const vars = buildCoachLandingCssVars(config);

  return (
    <main className="coach-landing-page" style={vars}>
      {sections.map((block) => (
        <CoachLandingBlock
          key={block.id}
          block={block}
          config={config}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
        />
      ))}
    </main>
  );
}
