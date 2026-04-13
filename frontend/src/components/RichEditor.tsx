import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useRef, useEffect } from 'react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { api } from '../lib/api'

const COLORS = [
  '#000000', '#374151', '#6B7280', '#DC2626', '#EA580C',
  '#CA8A04', '#16A34A', '#2563EB', '#7C3AED', '#DB2777',
  '#ffffff',
]
const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32']

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichEditor({ value, onChange, placeholder = '내용을 입력하세요...', minHeight = '200px' }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // 외부에서 value가 처음 채워질 때(수정 페이지 로드) 에디터 내용 동기화
  useEffect(() => {
    if (!editor || !value) return
    const current = editor.getHTML()
    if (current === value) return
    // 사용자가 편집 중이 아닐 때만 덮어쓰기 (포커스 없을 때)
    if (!editor.isFocused) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  if (!editor) return null

  const handleImageUpload = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      editor.chain().focus().setImage({ src: res.data.url }).run()
    } catch {
      alert('이미지 업로드에 실패했습니다.')
    }
  }

  const ToolBtn = ({ onClick, active, title, children }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode
  }) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick() }} title={title}
      className={`px-2 py-1 rounded text-sm transition-colors ${active ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {children}
    </button>
  )

  const Divider = () => <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">

        {/* 제목 스타일 */}
        <select
          onChange={(e) => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run()
          }}
          value={
            editor.isActive('heading', { level: 1 }) ? '1' :
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' : 'p'
          }
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
        >
          <option value="p">본문</option>
          <option value="1">제목 1</option>
          <option value="2">제목 2</option>
          <option value="3">제목 3</option>
        </select>

        {/* 글자 크기 */}
        <select
          onChange={(e) => {
            const v = e.target.value
            if (v === 'default') (editor.chain().focus() as any).unsetFontSize().run()
            else (editor.chain().focus() as any).setFontSize(v + 'px').run()
          }}
          defaultValue="default"
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none ml-1"
        >
          <option value="default">크기</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
        </select>

        <Divider />

        {/* 서식 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선"><s>S</s></ToolBtn>

        <Divider />

        {/* 글자 색상 */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {COLORS.map((c) => (
            <button key={c} type="button" title={c}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c).run() }}
              className="w-4 h-4 rounded-sm border border-gray-300 hover:scale-125 transition-transform shrink-0"
              style={{ backgroundColor: c }}
            />
          ))}
          <button type="button" title="색상 초기화"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run() }}
            className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
        </div>

        <Divider />

        {/* 정렬 */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬"><AlignRight size={14} /></ToolBtn>

        <Divider />

        {/* 리스트 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 기호">• 목록</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">1. 목록</ToolBtn>

        <Divider />

        {/* 코드 / 인용 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="코드 블록">{'{ }'}</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용문">"인용"</ToolBtn>

        <Divider />

        {/* 이미지 업로드 */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); e.target.value = '' }} />
        <ToolBtn onClick={() => fileInputRef.current?.click()} title="이미지 파일 첨부">📎 이미지</ToolBtn>
        <ToolBtn onClick={() => {
          const url = prompt('이미지 URL을 입력하세요')
          if (url) editor.chain().focus().setImage({ src: url }).run()
        }} title="이미지 URL 삽입">🔗 URL</ToolBtn>
      </div>

      {/* 에디터 본문 */}
      <EditorContent
        editor={editor}
        className="tiptap-wrapper px-4 py-3"
        style={{ minHeight }}
      />
    </div>
  )
}
