'use client'

import React, { useMemo } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import { ClassicEditor, EventInfo } from 'ckeditor5'
import DOMPurify from 'dompurify'

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

  const onEditorChange = (event: EventInfo<string, unknown>, editor: ClassicEditor) => {
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
        editor={ClassicEditor}
        config={{ toolbar: toolbarConfig }}
        data={editorData}
        onChange={onEditorChange}
        disabled={disabled}
      />

      {error && (
        <p className="rich-text-editor-error">{error}</p>
      )}
    </div>
  )
}

export default RichTextEditor