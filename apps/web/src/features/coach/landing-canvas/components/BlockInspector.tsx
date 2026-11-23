/**
 * BlockInspector — Panel de propiedades para editar el bloque seleccionado.
 * Client Component.
 *
 * Recibe los handlers por props (una sola instancia de useLandingCanvas vive
 * en CoachLandingCanvas; F2). No llama a useLandingCanvas().
 *
 * El switch de editores es exhaustivo: assertNever solo en el default (F3),
 * asi que nunca se ejecuta con un bloque valido y el inspector no crashea.
 */
'use client';

import type {
  CoachLandingBlock,
  CanvasConfig,
  HeroBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SocialLinksBlockProps,
  ContactBlockProps,
  SocialLink,
} from '@/features/coach/landing-canvas/types';
import { assertNever } from '@/features/coach/landing-canvas/utils/block-utils';
import { cn } from '@/lib/utils';

interface BlockInspectorProps {
  block: CoachLandingBlock | null;
  config: CanvasConfig;
  onUpdateBlock: (
    id: string,
    patch: Partial<CoachLandingBlock['props']>,
  ) => void;
  onUpdateConfig: (patch: Partial<CanvasConfig>) => void;
  onDeselect: () => void;
}

export function BlockInspector({
  block,
  config,
  onUpdateBlock,
  onUpdateConfig,
  onDeselect,
}: BlockInspectorProps): JSX.Element {
  if (!block) {
    return (
      <div className="coach-inspector p-4 bg-surface-1 border-l border-surface-3">
        <p className="text-sm text-text-secondary">
          Selecciona un bloque para editar sus propiedades.
        </p>
      </div>
    );
  }

  const { props } = block;

  return (
    <div className="coach-inspector p-4 bg-surface-1 border-l border-surface-3 flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Propiedades
        </span>
        <button
          onClick={onDeselect}
          className="text-xs text-text-secondary hover:text-text-primary underline"
        >
          Deseleccionar
        </button>
      </div>

      {/* Estilos comunes a todos los bloques */}
      <section className="space-y-3 pt-2 border-t border-surface-3">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Estilo
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <ColorInput
            label="Fondo"
            value={props.backgroundColor ?? ''}
            onChange={(v) =>
              onUpdateBlock(block.id, { backgroundColor: v || undefined })
            }
          />
          <ColorInput
            label="Texto"
            value={props.textColor ?? ''}
            onChange={(v) => onUpdateBlock(block.id, { textColor: v || undefined })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Padding"
            value={props.padding ?? ''}
            placeholder="1rem"
            onChange={(v) => onUpdateBlock(block.id, { padding: v || undefined })}
          />
          <TextInput
            label="Margin inferior"
            value={props.marginBottom ?? ''}
            placeholder="1rem"
            onChange={(v) =>
              onUpdateBlock(block.id, { marginBottom: v || undefined })
            }
          />
        </div>
        <div className="flex gap-2">
          <AlignButtons
            value={props.align ?? 'left'}
            onChange={(v) => onUpdateBlock(block.id, { align: v })}
          />
        </div>
      </section>

      {/* Props especificas por tipo de bloque (switch exhaustivo, F3) */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Contenido
        </h4>
        {renderBlockEditor(block, onUpdateBlock)}
      </section>

      {/* Config global del canvas */}
      <section className="mt-4 pt-4 border-t border-surface-3 space-y-3">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Diseno global
        </h4>
        <ColorInput
          label="Color primario"
          value={config.primaryColor}
          onChange={(v) => onUpdateConfig({ primaryColor: v })}
        />
        <TextInput
          label="Tipografia (font-family)"
          value={config.fontFamily}
          placeholder="system-ui, -apple-system, sans-serif"
          onChange={(v) => onUpdateConfig({ fontFamily: v })}
        />
        <ColorInput
          label="Fondo de pagina"
          value={config.backgroundColor}
          onChange={(v) => onUpdateConfig({ backgroundColor: v })}
        />
      </section>
    </div>
  );
}

/**
 * Renderiza el editor correspondiente al tipo de bloque.
 * Switch exhaustivo sobre la union discriminada: assertNever solo en default.
 */
function renderBlockEditor(
  block: CoachLandingBlock,
  onUpdateBlock: (
    id: string,
    patch: Partial<CoachLandingBlock['props']>,
  ) => void,
): JSX.Element {
  switch (block.type) {
    case 'hero':
      return <HeroBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'heading':
      return <HeadingBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'text':
      return <TextBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'image':
      return <ImageBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'button':
      return <ButtonBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'divider':
      return <DividerBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'social-links':
      return <SocialLinksBlockEditor block={block} updateBlock={onUpdateBlock} />;
    case 'contact':
      return <ContactBlockEditor block={block} updateBlock={onUpdateBlock} />;
    default:
      return assertNever(block);
  }
}

/* ---------- Editores por tipo de bloque ---------- */

interface CommonEditorProps {
  block: CoachLandingBlock;
  updateBlock: (id: string, patch: Partial<CoachLandingBlock['props']>) => void;
}

function HeroBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as HeroBlockProps;
  return (
    <div className="space-y-3">
      <TextInput
        label="Titular"
        value={p.headline}
        onChange={(v) => updateBlock(block.id, { headline: v })}
      />
      <TextInput
        label="Subtitular"
        value={p.subheadline}
        onChange={(v) => updateBlock(block.id, { subheadline: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Etiqueta CTA"
          value={p.ctaLabel}
          onChange={(v) => updateBlock(block.id, { ctaLabel: v })}
        />
        <TextInput
          label="URL CTA"
          value={p.ctaUrl}
          onChange={(v) => updateBlock(block.id, { ctaUrl: v })}
        />
      </div>
      <TextInput
        label="URL de imagen"
        value={p.mediaUrl ?? ''}
        onChange={(v) => updateBlock(block.id, { mediaUrl: v || undefined })}
      />
      <TextInput
        label="Alt de imagen"
        value={p.mediaAlt ?? ''}
        onChange={(v) => updateBlock(block.id, { mediaAlt: v || undefined })}
      />
    </div>
  );
}

function HeadingBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as HeadingBlockProps;
  return (
    <div className="space-y-3">
      <TextInput
        label="Texto"
        value={p.text}
        onChange={(v) => updateBlock(block.id, { text: v })}
      />
      <SelectInput
        label="Nivel"
        value={p.level}
        options={['h1', 'h2', 'h3', 'h4']}
        onChange={(v) =>
          updateBlock(block.id, { level: v as 'h1' | 'h2' | 'h3' | 'h4' })
        }
      />
    </div>
  );
}

function TextBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as TextBlockProps;
  return (
    <div className="space-y-3">
      <TextareaInput
        label="Cuerpo"
        value={p.body}
        onChange={(v) => updateBlock(block.id, { body: v })}
      />
    </div>
  );
}

function ImageBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as ImageBlockProps;
  return (
    <div className="space-y-3">
      <TextInput
        label="URL de imagen"
        value={p.src}
        onChange={(v) => updateBlock(block.id, { src: v })}
      />
      <TextInput
        label="Texto alternativo"
        value={p.alt}
        onChange={(v) => updateBlock(block.id, { alt: v })}
      />
      <SelectInput
        label="Ancho"
        value={p.width ?? 'auto'}
        options={['auto', 'full']}
        onChange={(v) =>
          updateBlock(block.id, { width: v as 'auto' | 'full' })
        }
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={p.rounded ?? false}
          onChange={(e) =>
            updateBlock(block.id, { rounded: e.target.checked })
          }
        />
        <label className="text-sm text-text-secondary">Esquinas redondeadas</label>
      </div>
    </div>
  );
}

function ButtonBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as ButtonBlockProps;
  return (
    <div className="space-y-3">
      <TextInput
        label="Etiqueta"
        value={p.label}
        onChange={(v) => updateBlock(block.id, { label: v })}
      />
      <TextInput
        label="URL"
        value={p.url}
        onChange={(v) => updateBlock(block.id, { url: v })}
      />
      <SelectInput
        label="Variante"
        value={p.variant}
        options={['primary', 'secondary', 'ghost']}
        onChange={(v) =>
          updateBlock(block.id, { variant: v as 'primary' | 'secondary' | 'ghost' })
        }
      />
      <SelectInput
        label="Tamano"
        value={p.size ?? 'md'}
        options={['sm', 'md', 'lg']}
        onChange={(v) =>
          updateBlock(block.id, { size: v as 'sm' | 'md' | 'lg' })
        }
      />
    </div>
  );
}

function DividerBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as DividerBlockProps;
  return (
    <div className="space-y-3">
      <SelectInput
        label="Estilo"
        value={p.style}
        options={['solid', 'dashed', 'dotted']}
        onChange={(v) =>
          updateBlock(block.id, { style: v as 'solid' | 'dashed' | 'dotted' })
        }
      />
      <SelectInput
        label="Grosor"
        value={p.thickness}
        options={['1px', '2px']}
        onChange={(v) =>
          updateBlock(block.id, { thickness: v as '1px' | '2px' })
        }
      />
    </div>
  );
}

function SocialLinksBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as SocialLinksBlockProps;
  return (
    <div className="space-y-3">
      <SelectInput
        label="Diseno"
        value={p.layout ?? 'row'}
        options={['row', 'column']}
        onChange={(v) =>
          updateBlock(block.id, { layout: v as 'row' | 'column' })
        }
      />
      <div className="space-y-2">
        {p.links.map((link: SocialLink, i: number) => (
          <div key={i} className="flex gap-2">
            <TextInput
              label={`Etiqueta ${i + 1}`}
              value={link.label}
              onChange={(v) => {
                const links = [...p.links];
                links[i] = { ...links[i], label: v };
                updateBlock(block.id, { links });
              }}
            />
            <TextInput
              label={`URL ${i + 1}`}
              value={link.url}
              onChange={(v) => {
                const links = [...p.links];
                links[i] = { ...links[i], url: v };
                updateBlock(block.id, { links });
              }}
            />
          </div>
        ))}
        <button
          onClick={() => {
            const links = [...p.links, { label: '', url: '' }];
            updateBlock(block.id, { links });
          }}
          className="text-xs text-brand-primary underline"
        >
          + Agregar enlace
        </button>
      </div>
    </div>
  );
}

function ContactBlockEditor({ block, updateBlock }: CommonEditorProps) {
  const p = block.props as unknown as ContactBlockProps;
  return (
    <div className="space-y-3">
      <TextInput
        label="Email"
        value={p.email ?? ''}
        onChange={(v) => updateBlock(block.id, { email: v || undefined })}
      />
      <TextInput
        label="Telefono"
        value={p.phone ?? ''}
        onChange={(v) => updateBlock(block.id, { phone: v || undefined })}
      />
      <TextInput
        label="WhatsApp"
        value={p.whatsapp ?? ''}
        onChange={(v) => updateBlock(block.id, { whatsapp: v || undefined })}
      />
      <TextInput
        label="Ciudad"
        value={p.city ?? ''}
        onChange={(v) => updateBlock(block.id, { city: v || undefined })}
      />
    </div>
  );
}

/* ---------- Inputs compartidos ---------- */

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded-lg border-0 bg-transparent cursor-pointer p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-text-primary"
        />
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary block">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-text-primary"
      />
    </div>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-text-primary"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-text-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function AlignButtons({
  value,
  onChange,
}: {
  value: 'left' | 'center' | 'right' | undefined;
  onChange: (v: 'left' | 'center' | 'right') => void;
}) {
  const aligns: { id: 'left' | 'center' | 'right'; label: string }[] = [
    { id: 'left', label: 'Izq' },
    { id: 'center', label: 'Cen' },
    { id: 'right', label: 'Der' },
  ];
  return (
    <div className="flex gap-1">
      {aligns.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={cn(
            'w-8 h-8 rounded-lg text-xs text-text-primary transition-colors flex items-center justify-center',
            value === a.id
              ? 'bg-brand-primary text-white'
              : 'bg-surface-2 border border-surface-3 hover:bg-surface-3',
          )}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
