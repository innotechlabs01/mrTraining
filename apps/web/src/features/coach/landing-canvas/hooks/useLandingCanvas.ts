/**
 * useLandingCanvas — Hook de estado del editor canvas.
 *
 * Gestiona el estado de edicion del canvas: secciones, config, bloque
 * seleccionado, y las operaciones de guardar/publicar/exportar contra la
 * API de Go (E1-E4, E7). Estado puro de cliente; los componentes de bloque
 * (Server Components) reciben los datos como props.
 */
'use client';

import {
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import type {
  CoachLandingBlock,
  CoachLandingDocument,
  CanvasConfig,
} from '@/features/coach/landing-canvas/types';
import {
  getCoachLandings,
  createCoachLanding,
  updateCoachLanding,
  publishCoachLanding,
  deleteCoachLanding,
  uploadLandingMedia,
  type CreateCoachLandingInput,
} from '@/features/coach/landing-canvas/api/coachLanding';
import {
  defaultCanvasConfig,
} from '@/features/coach/landing-canvas/utils/block-utils';
import { exportDocumentToHtml } from '@/features/coach/landing-canvas/utils/html-export';
import { toast } from 'sonner';

/**
 * Reindexa `order` de forma consecutiva (0..n-1) sobre un array nuevo de
 * bloques, sin mutar los objetos originales. Se usa despues de add/remove/move
 * para que `order` nunca quede desincronizado (F9).
 */
function reindexSections(sections: CoachLandingBlock[]): CoachLandingBlock[] {
  return sections.map((s, index) => ({
    ...s,
    order: index,
  }));
}

interface UseLandingCanvasReturn {
  // Datos del documento actual
  document: CoachLandingDocument | null;
  sections: CoachLandingBlock[];
  config: CanvasConfig;
  // Seleccion
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  // Carga / lista
  isLoading: boolean;
  landings: CoachLandingDocument[];
  selectedLandingId: string | null;
  setSelectedLandingId: (id: string | null) => void;
  // Acciones de secciones
  addBlock: (block: CoachLandingBlock) => void;
  removeBlock: (id: string) => void;
  moveBlockUp: (id: string) => void;
  moveBlockDown: (id: string) => void;
  updateBlock: (
    id: string,
    patch: Partial<CoachLandingBlock['props']>,
  ) => void;
  updateConfig: (patch: Partial<CanvasConfig>) => void;
  // Persistencia
  isSaving: boolean;
  saveDocument: () => Promise<void>;
  publishDocument: (isPublished: boolean) => Promise<void>;
  deleteDocument: () => Promise<void>;
  // Media
  isUploading: boolean;
  handleUploadMedia: (file: File) => Promise<string | null>;
  // Export
  exportHtml: () => string;
  // Crear / recargar
  createLanding: (input: CreateCoachLandingInput) => Promise<void>;
  loadLandings: () => Promise<void>;
}

export function useLandingCanvas(): UseLandingCanvasReturn {
  const [document, setDocument] = useState<CoachLandingDocument | null>(null);
  const [landings, setLandings] = useState<CoachLandingDocument[]>([]);
  const [selectedLandingId, setSelectedLandingId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- Derivados del documento seleccionado ---

  const sections = useMemo(() => document?.sections ?? [], [document]);

  const config = useMemo(
    () => document?.config ?? defaultCanvasConfig(),
    [document],
  );

  // --- Cargar lista de landings (E1) ---

  const loadLandings = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getCoachLandings();
      setLandings(list);
      if (list.length > 0 && !selectedLandingId) {
        setSelectedLandingId(list[0].id);
        setDocument(list[0]);
      }
    } catch {
      // Si no hay landing aun, no es error: lista vacia.
      setLandings([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLandingId]);

  useEffect(() => {
    void loadLandings();
  }, [loadLandings]);

  // --- Cuando cambia el landing seleccionado, sincronizar documento ---

  useEffect(() => {
    if (!selectedLandingId) {
      setDocument(null);
      return;
    }
    const found = landings.find((l) => l.id === selectedLandingId);
    setDocument(found ?? null);
  }, [selectedLandingId, landings]);

  // --- Acciones de secciones ---

  const addBlock = useCallback(
    (block: CoachLandingBlock) => {
      setDocument((prev) => {
        if (!prev) return prev;
        const ordered: CoachLandingBlock = { ...block, order: prev.sections.length };
        const next = reindexSections([...prev.sections, ordered]);
        return {
          ...prev,
          sections: next as CoachLandingBlock[],
          updatedAt: new Date().toISOString(),
        } as CoachLandingDocument;
      });
      setSelectedBlockId(block.id);
    },
    [],
  );

  const removeBlock = useCallback(
    (id: string) => {
      setDocument((prev) => {
        if (!prev) return prev;
        const next = reindexSections(
          prev.sections.filter((s) => s.id !== id),
        );
        return {
          ...prev,
          sections: next as CoachLandingBlock[],
          updatedAt: new Date().toISOString(),
        } as CoachLandingDocument;
      });
      setSelectedBlockId(null);
    },
    [],
  );

  const moveBlockUp = useCallback(
    (id: string) => {
      setDocument((prev) => {
        if (!prev) return prev;
        const idx = prev.sections.findIndex((s) => s.id === id);
        if (idx <= 0) return prev;
        const next = [...prev.sections];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return {
          ...prev,
          sections: reindexSections(next) as CoachLandingBlock[],
          updatedAt: new Date().toISOString(),
        } as CoachLandingDocument;
      });
    },
    [],
  );

  const moveBlockDown = useCallback(
    (id: string) => {
      setDocument((prev) => {
        if (!prev) return prev;
        const idx = prev.sections.findIndex((s) => s.id === id);
        if (idx < 0 || idx >= prev.sections.length - 1) return prev;
        const next = [...prev.sections];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return {
          ...prev,
          sections: reindexSections(next) as CoachLandingBlock[],
          updatedAt: new Date().toISOString(),
        } as CoachLandingDocument;
      });
    },
    [],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<CoachLandingBlock['props']>) => {
      setDocument((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === id ? ({ ...s, props: { ...s.props, ...patch } } as CoachLandingBlock) : s,
          ),
          updatedAt: new Date().toISOString(),
        } as CoachLandingDocument;
      });
    },
    [],
  );

  const updateConfig = useCallback(
    (patch: Partial<CanvasConfig>) => {
      setDocument((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          config: { ...prev.config, ...patch },
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [],
  );

  // --- Crear landing (E2) ---

  const createLanding = useCallback(
    async (input: CreateCoachLandingInput) => {
      setIsSaving(true);
      try {
        const created = await createCoachLanding(input);
        setLandings((prev) => [created, ...prev]);
        setSelectedLandingId(created.id);
        setDocument(created);
        toast.success('Landing creada');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error creando la landing');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  // --- Guardar (E3) ---

  const saveDocument = useCallback(async () => {
    if (!document) return;
    setIsSaving(true);
    try {
      await updateCoachLanding(document.id, {
        title: document.title,
        subtitle: document.subtitle,
        config: JSON.stringify(document.config),
        sections: JSON.stringify(document.sections),
        images: JSON.stringify(document.images),
      });
      toast.success('Landing guardada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando la landing');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [document]);

  // --- Publicar (E4) ---

  const publishDocument = useCallback(
    async (isPublished: boolean) => {
      if (!document) return;
      setIsSaving(true);
      try {
        await publishCoachLanding(document.id, { is_published: isPublished });
        setDocument((prev) =>
          prev ? { ...prev, isPublished } : null,
        );
        setLandings((prev) =>
          prev.map((l) =>
            // Se sincroniza con el documento ACTUAL (con las ediciones
            // pendientes), no con la copia de `landings`: usar `l` hacia
            // atrás el documento y descartaba las ediciones no guardadas.
            l.id === document!.id ? { ...document!, isPublished } : l,
          ),
        );
        toast.success(
          isPublished
            ? 'Landing publicada. Ya esta visible en tu URL publica.'
            : 'Landing despublicada.',
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error publicando la landing');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [document],
  );

  // --- Eliminar (E5) ---

  const deleteDocument = useCallback(async () => {
    if (!document) return;
    if (
      !window.confirm(
        '¿Eliminar esta landing? Esta accion no se puede deshacer.',
      )
    )
      return;
    setIsSaving(true);
    try {
      await deleteCoachLanding(document.id);
      setLandings((prev) => prev.filter((l) => l.id !== document.id));
      setDocument(null);
      setSelectedLandingId(null);
      toast.success('Landing eliminada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error eliminando la landing');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [document]);

  // --- Subir media (E7) ---

  const handleUploadMedia = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true);
      try {
        const res = await uploadLandingMedia(file);
        toast.success('Archivo subido');
        return res.url;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error subiendo archivo');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  // --- Exportar HTML ---

  const exportHtml = useCallback((): string => {
    if (!document) return '';
    return exportDocumentToHtml(document);
  }, [document]);

  return {
    document,
    sections,
    config,
    selectedBlockId,
    setSelectedBlockId,
    isLoading,
    landings,
    selectedLandingId,
    setSelectedLandingId,
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    updateBlock,
    updateConfig,
    isSaving,
    saveDocument,
    publishDocument,
    deleteDocument,
    isUploading,
    handleUploadMedia,
    exportHtml,
    createLanding,
    loadLandings,
  };
}
