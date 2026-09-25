'use client'

import * as React from 'react'
import clsx from 'clsx'

interface RichTextEditorProps {
  value?: string | null
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const toolbarButtons = [
  { tag: 'Bold', command: 'bold', shortcut: 'Ctrl+B' },
  { tag: 'Italic', command: 'italic', shortcut: 'Ctrl+I' },
  { tag: 'Center', command: 'justifyCenter', shortcut: null },
  { tag: 'Link', command: 'createLink', shortcut: 'Ctrl+K' },
  { tag: 'Image', command: 'insertImage', shortcut: 'Ctrl+G' },
  { tag: 'Video', command: 'insertVideo', shortcut: null },
]

export function RichTextEditor({ value, onChange, disabled = false, placeholder = 'Escribe tu contenido...' }: RichTextEditorProps) {
  const [content, setContent] = React.useState(value)

  const handleChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const value = e.target.innerHTML
    setContent(value || '')
    onChange?.(value || '')
  }

  const executeCommand = (command: string, value?: string) => {
    if (disabled) return
    try {
      document.execCommand(command, false, value || '')
      setContent(content => {
        const div = document.createElement('div')
        div.innerHTML = content || ''
        return div.innerHTML
      })
    } catch {
      // Command failed (e.g., createLink without valid URL)
    }
  }

  const insertImage = () => {
    const url = prompt('URL de la imagen:')
    if (url) executeCommand('insertImage', url)
  }

  const insertVideo = () => {
    const url = prompt('URL del video (YouTube/Vimeo):')
    if (url) {
      const videoHtml = `<div class="video-container"><iframe width="560" height="315" src="${url}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      executeCommand('insertHTML', videoHtml)
    }
  }

  const toggleJustifyCenter = () => {
    if (disabled) return
    const selection = document.getSelection()
    if (!selection || !selection.rangeCount) return
    
    const node = selection.anchorNode
    if (!node) return
    
    if (node.nodeType === 3) { // Text node
      const text = node.parentNode as HTMLElement | null
      if (!text) return
      if (text.style.textAlign === 'center') {
        text.style.textAlign = ''
      } else {
        text.style.textAlign = 'center'
      }
    }
  }

  return (
    <div className="rich-text-editor border rounded-lg p-4 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:border-primary disabled:opacity-50 disabled:cursor-not-allowed" 
         contentEditable={!disabled}
         onInput={handleChange}
         onFocus={e => e.target.classList.add('outline-none')}
         onBlur={e => e.target.classList.remove('outline-none')}>
      <div className="flex gap-2 mb-3 flex-wrap">
{toolbarButtons.map(({ tag, command, shortcut }) => {
          const onClickHandler = () => {
            if (command === 'justifyCenter') {
              toggleJustifyCenter()
            } else if (command === 'insertImage') {
              insertImage()
            } else if (command === 'insertVideo') {
              insertVideo()
            } else if (command !== 'justifyCenter') {
              executeCommand(command)
            }
          }
          return (
            <button
              key={tag}
              onClick={onClickHandler}
              disabled={disabled}
              className={clsx(
                'inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span>{tag}</span>
              {shortcut && (
                <span className="ml-1 text-xs opacity-60">{shortcut}</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="rich-text-content">{content || placeholder}</div>
    </div>
  )
}