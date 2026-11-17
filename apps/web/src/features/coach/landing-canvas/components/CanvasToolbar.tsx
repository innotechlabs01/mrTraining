/**
 * CanvasToolbar — Barra de herramientas superior: Guardar, Publicar, Exportar HTML.
 * Client Component.
 */
'use client';

import { useLandingCanvas } from '@/features/coach/landing-canvas/hooks/useLandingCanvas';
import { Save, Send, Code2, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasToolbarProps {
  isPublished: boolean;
  onPreview: () => void;
  onExport: (html: string) => void;
  documentId: string | null;
}

export function CanvasToolbar({
  isPublished,
  onPreview,
  onExport,
  documentId,
}: CanvasToolbarProps): JSX.Element {
  const {
    saveDocument,
    publishDocument,
    exportHtml,
    isSaving,
  } = useLandingCanvas();

  const handleExport = () => {
    if (!documentId) return;
    const html = exportHtml();
    if (html) {
      onExport(html);
    }
  };

  return (
    <div className="coach-toolbar flex flex-col lg:flex-row items-center justify-between gap-4 p-4 bg-surface-1 border-b border-surface-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Editor de Landing
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={saveDocument}
          disabled={isSaving || !documentId}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
            isSaving
              ? 'bg-surface-2 text-text-muted border border-surface-3'
              : 'bg-brand-primary text-white hover:bg-brand-primary/90 border-transparent',
          )}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>

        <button
          onClick={() => publishDocument(!isPublished)}
          disabled={isSaving || !documentId}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
            isSaving
              ? 'bg-surface-2 text-text-muted border border-surface-3'
              : isPublished
                ? 'bg-emerald-500 text-white hover:bg-emerald-400 border-transparent'
                : 'bg-brand-primary text-white hover:bg-brand-primary/90 border-transparent',
          )}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {isPublished ? 'Publicado' : 'Publicar'}
        </button>

        <button
          onClick={handleExport}
          disabled={!documentId}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
            'bg-surface-2 border border-surface-3 text-text-primary hover:bg-surface-3',
          )}
        >
          <Code2 size={16} /> Exportar HTML
        </button>

        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-surface-2 border border-surface-3 text-text-primary hover:bg-surface-3"
        >
          <Eye size={16} /> Vista previa publica
        </button>
      </div>
    </div>
  );
}
