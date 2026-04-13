import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Bell, Pin, Plus, Trash2, Pencil, ChevronDown, ChevronUp, X } from 'lucide-react'
import RichEditor from '../components/RichEditor'

// ─── 공지 작성/수정 모달 ──────────────────────────────────────────────────────
function NoticeFormModal({
  initial,
  onClose,
}: {
  initial?: { id: number; title: string; content: string; is_pinned: boolean }
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? api.patch(`/notices/${initial!.id}`, { title, content, is_pinned: isPinned }).then((r) => r.data)
        : api.post('/notices', { title, content, is_pinned: isPinned }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      onClose()
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? '오류가 발생했습니다'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[720px] shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-lg">{isEdit ? '공지 수정' : '공지 작성'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
            <RichEditor
              value={content}
              onChange={setContent}
              placeholder="공지 내용을 입력하세요"
              minHeight="200px"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-600" />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <Pin size={13} className="text-red-400" /> 상단 고정
            </span>
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={() => mutation.mutate()} disabled={!title.trim() || !content.trim() || mutation.isPending}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {mutation.isPending ? '저장 중...' : isEdit ? '수정' : '작성'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 공지 카드 ────────────────────────────────────────────────────────────────
function NoticeCard({
  notice,
  canEdit,
  onEdit,
}: {
  notice: any
  canEdit: boolean
  onEdit: (n: any) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/notices/${notice.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  })

  const date = new Date(notice.created_at)
  const dateStr = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
      notice.is_pinned ? 'border-red-100' : 'border-gray-100'
    }`}>
      {/* 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        {notice.is_pinned && <Pin size={13} className="text-red-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {notice.is_pinned && (
              <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">공지</span>
            )}
            <span className="font-semibold text-gray-800 truncate">{notice.title}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span>{notice.author_nick}</span>
            <span>{dateStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(notice) }}
                className="p-1.5 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('삭제하시겠습니까?')) deleteMutation.mutate() }}
                className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* 본문 */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="pt-4 prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: notice.content }} />
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function NoticesPage() {
  const { user } = useAuthStore()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const PAGE_SIZE = 15

  const { data, isLoading } = useQuery({
    queryKey: ['notices', page],
    queryFn: () => api.get('/notices', { params: { page, page_size: PAGE_SIZE } }).then((r) => r.data),
  })

  const canWrite = user?.is_admin || user?.is_teacher
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={22} className="text-primary-500" />
          <h1 className="text-2xl font-bold text-gray-800">공지사항</h1>
        </div>
        {canWrite && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            <Plus size={14} /> 공지 작성
          </button>
        )}
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : !data?.notices?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400 text-sm">
          등록된 공지사항이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {data.notices.map((n: any) => (
            <NoticeCard key={n.id} notice={n} canEdit={canWrite}
              onEdit={(n) => setEditTarget(n)} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            이전
          </button>
          <span className="px-3 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            다음
          </button>
        </div>
      )}

      {/* 모달 */}
      {showForm && <NoticeFormModal onClose={() => setShowForm(false)} />}
      {editTarget && (
        <NoticeFormModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
