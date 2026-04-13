import { useState, useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'

const LANGUAGE_MAP: Record<number, string> = {
  0: 'c',
  1: 'cpp',
  2: 'pascal',
  3: 'java',
  4: 'ruby',
  6: 'python',
  7: 'php',
  8: 'perl',
  9: 'csharp',
  15: 'lua',
  16: 'javascript',
  17: 'go',
  18: 'sql',
}

const MIN_HEIGHT = 300

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: number
  fontSize?: number
}

export default function CodeEditor({ value, onChange, language, fontSize = 20 }: CodeEditorProps) {
  const [height, setHeight] = useState(MIN_HEIGHT)
  const editorRef = useRef<any>(null)

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    // 초기 높이 설정
    const contentHeight = Math.max(MIN_HEIGHT, editor.getContentHeight())
    setHeight(contentHeight)
    // 콘텐츠 크기 변경 시 높이 업데이트
    editor.onDidContentSizeChange(() => {
      const newHeight = Math.max(MIN_HEIGHT, editor.getContentHeight())
      setHeight(newHeight)
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height }}>
      <Editor
        height={height}
        language={LANGUAGE_MAP[language] ?? 'cpp'}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          fontSize,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          scrollbar: { vertical: 'hidden', handleMouseWheel: false },
          tabSize: 4,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          overviewRulerLanes: 0,
        }}
      />
    </div>
  )
}
