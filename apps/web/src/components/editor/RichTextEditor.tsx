'use client'

import React, { useMemo } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import DOMPurify from 'dompurify'
import 'ckeditor5/ckeditor5.css'

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
  ['Undo', 'Redo'],
  ['|',
    'Heading', 'Paragraph', '|', 'Bold', 'Italic', 'Underline', 'Strikethrough',
  ],
  ['|', 'Link', '|', 'BulletedList', 'NumberedList'],
  ['|', 'Alignment'],
  ['|', 'Blockquote'],
  ['|', 'InsertTable'],
]

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  error,
  label,
}: RichTextEditorProps) {
  const editorData = useMemo(() => value ?? '', [value])

  const onEditorChange = (event: any, editor: ClassicEditor) => {
    const data = DOMPurify.sanitize(editor.getData() ?? '')
    onChange?.(data)
  }

  return (
    <div className="rich-text-editor">
      {label && (
        <label className="rich-text-editor-label" htmlFor="rich-text-editor">
          {label}
        </label>
      )}

      @ts-ignore
      <CKEditor
        editor={ClassicEditor as any}
        config={{ toolbar: toolbarConfig }}
        data={editorData}
        onChange={onEditorChange as any}
        disabled={disabled}
      />

      {error && (
        <p className="rich-text-editor-error">{error}</p>
      )}
    </div>
  )
}

export default RichTextEditor