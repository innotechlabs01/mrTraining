/**
 * CanvasToolbar — Barra de herramientas superior: Guardar, Publicar, Exportar HTML.
 * Client Component.
 *
 * Recibe todos los handlers por props (una sola instancia de useLandingCanvas
 * vive en CoachLandingCanvas; F2). No llama a useLandingCanvas().
 */
'use client';

import { Save, Send, Code2, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasToolbarProps {
  isPublished: boolean;
  onSave: () => void;
  onPublish: (next: boolean) => void;
  onExportHtml: () => void;
  isSaving: boolean;
  slug: string;
}

export function CanvasToolbar({
  isPublished,
  onSave,
  onPublish,
  onExportHtml,
  isSaving,
  slug,
}: CanvasToolbarProps): JSX.Element {
  const handlePreview = () => {
    window.open(`/l/${slug}`, '_blank');
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
          onClick={onSave}
          disabled={isSaving}
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
          onClick={() => onPublish(!isPublished)}
          disabled={isSaving}
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
          onClick={onExportHtml}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
            'bg-surface-2 border border-surface-3 text-text-primary hover:bg-surface-3',
          )}
        >
          <Code2 size={16} /> Exportar HTML
        </button>

        <button
          onClick={handlePreview}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-surface-2 border border-surface-3 text-text-primary hover:bg-surface-3"
        >
          <Eye size={16} /> Vista previa publica
        </button>
      </div>
    </div>
  );
}
