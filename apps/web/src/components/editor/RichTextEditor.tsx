'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import DOMPurify from 'dompurify'
import 'ckeditor5/ckeditor5.css'
import styles from './RichTextEditor.module.css'

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  error?: string
  label?: string
  placeholder?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const toolbarConfig: any = [
  'heading',
  '|',
  'bold', 'italic', 'underline', 'strikethrough',
  '|',
  'link',
  '|',
  'bulletedList', 'numberedList',
  '|',
  'alignment',
  '|',
  'blockQuote',
  '|',
  'insertTable',
  '|',
  'undo', 'redo'
]

// Simple dynamic import with ssr: false
const CKEditorComponent = dynamic(
  () => import('@ckeditor/ckeditor5-react').then(({ CKEditor }) =>
    import('@ckeditor/ckeditor5-build-classic').then(({ default: ClassicEditor }) => {
      const CKEditorWrapper = (props: any) => (
        <CKEditor
          editor={ClassicEditor}
          config={{
            toolbar: toolbarConfig,
            licenseKey: 'GPL',
          }}
          data={props.value ?? ''}
          onChange={(event: any, editor: any) => {
            const data = DOMPurify.sanitize(editor.getData() ?? '')
            props.onChange?.(data)
          }}
          disabled={props.disabled}
        />
      )
      return CKEditorWrapper
    })
  ),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-surface-2 rounded-xl" /> }
)

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  error,
  label,
}: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="rich-text-editor">
        {label && (
          <label className="rich-text-editor-label" htmlFor="rich-text-editor">
            {label}
          </label>
        )}
        <textarea
          className="w-full min-h-[300px] p-4 bg-surface-2 border border-surface-3 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder="Editor cargando..."
          readOnly={true}
        />
        {error && (
          <p className="rich-text-editor-error">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rich-text-editor">
      {label && (
        <label className="rich-text-editor-label" htmlFor="rich-text-editor">
          {label}
        </label>
      )}
      <div className={styles.editorWrapper}>
        <CKEditorComponent
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      {error && (
        <p className="rich-text-editor-error">{error}</p>
      )}
    </div>
  )
}

export default RichTextEditor