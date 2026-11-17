/**
 * CoachLandingCanvas — Editor canvas WYSIWYG para la landing del coach.
 *
 * Orquesta: paleta de bloques, lienzo con vista previa en vivo, inspector de
 * propiedades, toolbar (Guardar / Publicar / Exportar HTML) y selector de
 * landing. Usa `useLandingCanvas` para el estado y la persistencia (E1-E4).
 *
 * Client Component: gestiona estado de edicion y llama a la API de Go.
 *
 * F2: aqui vive la UNICA instancia de useLandingCanvas() de la feature.
 * Los handlers se pasan por props a CanvasToolbar, BlockInspector y
 * BlockPalette; ninguno de ellos vuelve a llamar al hook.
 */
'use client';

import { useState } from 'react';
import type {
  CoachLandingDocument,
  BlockType,
} from '@/features/coach/landing-canvas/types';
import { useLandingCanvas } from '@/features/coach/landing-canvas/hooks/useLandingCanvas';
import { BlockPalette } from '@/features/coach/landing-canvas/components/BlockPalette';
import { BlockInspector } from '@/features/coach/landing-canvas/components/BlockInspector';
import { LivePreview } from '@/features/coach/landing-canvas/components/LivePreview';
import { CanvasToolbar } from '@/features/coach/landing-canvas/components/CanvasToolbar';
import {
  defaultCanvasConfig,
  createBlockForType,
} from '@/features/coach/landing-canvas/utils/block-utils';
import { toast } from 'sonner';

export function CoachLandingCanvas(): JSX.Element {
  const {
    document: landingDoc,
    sections,
    config,
    landings,
    isLoading,
    selectedBlockId,
    setSelectedBlockId,
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    updateBlock,
    updateConfig,
    isSaving,
    saveDocument,
    publishDocument,
    exportHtml,
    createLanding,
  } = useLandingCanvas();

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportHtmlContent, setExportHtmlContent] = useState('');

  const currentDoc: CoachLandingDocument | null = landingDoc;

  const selectedBlock = currentDoc
    ? currentDoc.sections.find((b) => b.id === selectedBlockId) ?? null
    : null;

  const selectedIndex = currentDoc
    ? currentDoc.sections.findIndex((b) => b.id === selectedBlockId)
    : -1;

  const handleAddBlock = (type: BlockType) => {
    addBlock(createBlockForType(type));
  };

  /**
   * Genera el HTML del documento actual y abre el dialogo de descarga.
   * Sin esto, `exportHtml()` devolvia el string y el resultado se perdia:
   * el dialogo nunca se abria y la exportacion era inaccesible (AC10).
   */
  const handleExportHtml = () => {
    const html = exportHtml();
    setExportHtmlContent(html);
    setShowExportDialog(true);
  };

  const handleDownloadHtml = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${currentDoc?.slug || 'landing'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Cargando landings...
      </div>
    );
  }

  // No hay landing aun: mostrar formulario de creacion
  if (!currentDoc && landings.length === 0) {
    return (
      <div className="flex flex-col h-full p-8">
        <div className="max-w-xl mx-auto bg-surface-1 rounded-xl border border-surface-3 p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Crear tu landing
          </h1>
          <p className="text-text-secondary mb-6">
            Aun no tienes una landing publicada. Crea la primera para empezar a disenar.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const slug = formData.get('slug') as string;
              const title = formData.get('title') as string;
              const subtitle = formData.get('subtitle') as string;
              if (!slug || !title) {
                toast.error('Slug y titulo son obligatorios');
                return;
              }
              const input = {
                slug,
                title,
                subtitle: subtitle || '',
                config: JSON.stringify(defaultCanvasConfig()),
                sections: JSON.stringify([createBlockForType('hero')]),
                images: JSON.stringify([]),
              };
              void createLanding(input);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Slug (URL)
              </label>
              <input
                name="slug"
                type="text"
                defaultValue="mi-landing"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Titulo
              </label>
              <input
                name="title"
                type="text"
                defaultValue="Mi entrenamiento"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Subtitulo
              </label>
              <input
                name="subtitle"
                type="text"
                defaultValue="Entrenamiento personalizado"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-text-primary"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-brand-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-primary/90 disabled:opacity-50"
            >
              Crear landing
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        Selecciona una landing para editar.
      </div>
    );
  }

  return (
    <div className="coach-canvas h-full flex flex-col bg-surface-0">
      {/* Toolbar */}
      <CanvasToolbar
        isPublished={currentDoc.isPublished}
        isSaving={isSaving}
        slug={currentDoc.slug}
        onSave={saveDocument}
        onPublish={publishDocument}
        onExportHtml={handleExportHtml}
      />

      {/* Cuerpo: paleta | lienzo | inspector */}
      <div className="flex-1 flex overflow-hidden">
        <BlockPalette onAdd={handleAddBlock} />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <LivePreview sections={sections} config={config} />
          </div>

          {/* Acciones de bloque seleccionado (mover/eliminar) */}
          {selectedBlock && (
            <div className="p-3 bg-surface-1 border-t border-surface-3 flex items-center gap-3">
              <button
                onClick={() => moveBlockUp(selectedBlock.id)}
                disabled={selectedIndex === 0}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-3 disabled:opacity-30"
                title="Subir"
              >
                ▲
              </button>
              <button
                onClick={() => moveBlockDown(selectedBlock.id)}
                disabled={
                  selectedIndex >= currentDoc.sections.length - 1
                }
                className="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-3 disabled:opacity-30"
                title="Bajar"
              >
                ▼
              </button>
              <button
                onClick={() => {
                  removeBlock(selectedBlock.id);
                  setSelectedBlockId(null);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-400/10"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <BlockInspector
          block={selectedBlock}
          config={config}
          onUpdateBlock={updateBlock}
          onUpdateConfig={updateConfig}
          onDeselect={() => setSelectedBlockId(null)}
        />
      </div>

      {/* Dialog de exportacion HTML */}
      {showExportDialog && exportHtmlContent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-surface-1 rounded-xl border border-surface-3 p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Exportar HTML
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Descarga un archivo HTML autonomo que se abre en cualquier navegador y muestra lo mismo que la vista previa.
            </p>
            <button
              onClick={() => handleDownloadHtml(exportHtmlContent)}
              className="w-full bg-brand-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-primary/90"
            >
              Descargar {currentDoc.slug}.html
            </button>
            <button
              onClick={() => setShowExportDialog(false)}
              className="w-full mt-2 bg-transparent border border-surface-3 text-text-secondary px-4 py-2 rounded-lg hover:bg-surface-3"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
