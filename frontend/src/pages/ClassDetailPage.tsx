import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Users, Copy, Check, Trash2, Pencil, ArrowLeft, Settings, RefreshCw,
  ClipboardList, Plus, Calendar, BookOpen, ChevronRight, Bell, Pin,
  FileText, Download, X, ChevronDown, ChevronUp, BarChart2, Search,
  UserPlus,
} from 'lucide-react'
import RichEditor from '../components/RichEditor'

// ─── 멤버 추가 피커 모달 ──────────────────────────────────────────────────────
function MemberPickerModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['member-picker', classId, search, grade, classNum],
    queryFn: () =>
      api.get(`/classes/${classId}/members/picker`, {
        params: { search: search || undefined, grade: grade || undefined, class_num: classNum || undefined, page_size: 50 },
      }).then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () =>
      api.post(`/classes/${classId}/members/bulk`, { user_ids: Array.from(selected) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', classId] })
      onClose()
    },
  })

  const users: any[] = data?.users ?? []

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set())
    else setSelected(new Set(users.map((u: any) => u.user_id)))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[580px] shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-lg">학생 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="아이디 / 이름 검색"
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <input
            value={grade} onChange={(e) => setGrade(e.target.value)}
            placeholder="학년" type="number" min="1"
            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            value={classNum} onChange={(e) => setClassNum(e.target.value)}
            placeholder="반" type="number" min="1"
            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
          {isLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === users.length && users.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left">아이디</th>
                  <th className="px-3 py-2.5 text-left">이름</th>
                  <th className="px-3 py-2.5 text-left">학년·반·번호</th>
                  <th className="px-3 py-2.5 text-left">학교</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr
                    key={u.user_id}
                    onClick={() => {
                      const next = new Set(selected)
                      if (next.has(u.user_id)) next.delete(u.user_id)
                      else next.add(u.user_id)
                      setSelected(next)
                    }}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-blue-50 ${selected.has(u.user_id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox" checked={selected.has(u.user_id)} readOnly
                        className="w-4 h-4 rounded accent-primary-600 pointer-events-none"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{u.user_id}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-700">{u.nick}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">
                      {u.grade && u.class_num && u.student_num
                        ? `${u.grade}학년 ${u.class_num}반 ${u.student_num}번`
                        : u.grade ? `${u.grade}학년 ${u.class_num ?? '-'}반 ${u.student_num ?? '-'}번`
                        : '미설정'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{u.school || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">{selected.size}명 선택됨</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
            <button
              onClick={() => addMutation.mutate()}
              disabled={selected.size === 0 || addMutation.isPending}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {addMutation.isPending ? '추가 중...' : `${selected.size}명 추가`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 멤버 탭 ─────────────────────────────────────────────────────────────────
function MembersTab({
  cls, isTeacher, classId,
  editMember, setEditMember, editForm, setEditForm,
}: {
  cls: any; isTeacher: boolean; classId: string
  editMember: any; setEditMember: (m: any) => void
  editForm: any; setEditForm: (f: any) => void
}) {
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)

  const removeMutation = useMutation({
    mutationFn: (uid: string) => api.delete(`/classes/${classId}/members/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class', classId] }),
  })

  const updateMemberMutation = useMutation({
    mutationFn: (uid: string) =>
      api.patch(`/classes/${classId}/members/${uid}`, {
        grade: editForm.grade ? Number(editForm.grade) : null,
        class_num: editForm.class_num ? Number(editForm.class_num) : null,
        student_num: editForm.student_num ? Number(editForm.student_num) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', classId] })
      setEditMember(null)
    },
  })

  const students = cls.members?.filter((m: any) => m.role === 'student') ?? []
  const teachers = cls.members?.filter((m: any) => m.role === 'teacher') ?? []

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            <UserPlus size={14} /> 학생 추가
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-700">학생 목록</h2>
          <span className="text-xs text-gray-400 ml-1">({students.length}명)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-2.5">학년·반·번호</th>
              <th className="text-left px-3 py-2.5">아이디</th>
              <th className="text-left px-3 py-2.5">이름</th>
              <th className="text-left px-3 py-2.5">학교</th>
              <th className="text-right px-3 py-2.5">제출</th>
              <th className="text-right px-3 py-2.5">해결</th>
              {isTeacher && <th className="text-center px-5 py-2.5">관리</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((m: any) => (
              <tr key={m.user_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">
                  {m.grade && m.class_num && m.student_num
                    ? `${m.grade}학년 ${m.class_num}반 ${m.student_num}번`
                    : m.grade ? `${m.grade}학년 ${m.class_num ?? '-'}반 ${m.student_num ?? '-'}번`
                    : <span className="text-gray-300">미설정</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-600">{m.user_id}</td>
                <td className="px-3 py-2.5 font-medium text-gray-700">{m.nick}</td>
                <td className="px-3 py-2.5 text-gray-500">{m.school || '-'}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{m.submit}</td>
                <td className="px-3 py-2.5 text-right text-green-600 font-medium">{m.solved}</td>
                {isTeacher && (
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => { setEditMember(m); setEditForm({ grade: m.grade ?? '', class_num: m.class_num ?? '', student_num: m.student_num ?? '' }) }}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`${m.nick} 학생을 학급에서 제거하시겠습니까?`)) removeMutation.mutate(m.user_id) }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={isTeacher ? 7 : 6} className="px-5 py-8 text-center text-gray-400">
                  아직 참여한 학생이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {teachers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">담임 선생님</h2>
          </div>
          <div className="px-5 py-3 flex gap-3">
            {teachers.map((t: any) => (
              <span key={t.user_id} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                {t.nick}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 학번 수정 모달 */}
      {editMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">학번 수정</h3>
            <p className="text-sm text-gray-500 mb-4">{editMember.nick}</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[{ field: 'grade', label: '학년' }, { field: 'class_num', label: '반' }, { field: 'student_num', label: '번호' }].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="number" min="1" value={(editForm as any)[field]}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditMember(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={() => updateMemberMutation.mutate(editMember.user_id)}
                disabled={updateMemberMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && <MemberPickerModal classId={classId} onClose={() => setShowPicker(false)} />}
    </div>
  )
}

// ─── 성적 현황 탭 ─────────────────────────────────────────────────────────────
function StatsTab({ classId }: { classId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['class-stats', classId],
    queryFn: () => api.get(`/classes/${classId}/stats`).then((r) => r.data),
  })

  if (isLoading) return <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>

  const members: any[] = data?.members ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <BarChart2 size={16} className="text-gray-400" />
        <h2 className="font-semibold text-gray-700">성적 현황</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-2.5">학년·반·번호</th>
            <th className="text-left px-3 py-2.5">이름</th>
            <th className="text-right px-3 py-2.5">제출</th>
            <th className="text-right px-3 py-2.5">정답</th>
            <th className="text-right px-3 py-2.5">해결</th>
            <th className="px-5 py-2.5 text-left" style={{ minWidth: 120 }}>정답률</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m: any) => {
            const rate = m.submit > 0 ? Math.round((m.accepted / m.submit) * 100) : 0
            return (
              <tr key={m.user_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">
                  {m.grade && m.class_num && m.student_num
                    ? `${m.grade}학년 ${m.class_num}반 ${m.student_num}번`
                    : m.grade ? `${m.grade}학년 ${m.class_num ?? '-'}반 ${m.student_num ?? '-'}번`
                    : <span className="text-gray-300">미설정</span>}
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-700">{m.nick}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{m.submit}</td>
                <td className="px-3 py-2.5 text-right text-blue-600">{m.accepted}</td>
                <td className="px-3 py-2.5 text-right text-green-600 font-medium">{m.solved}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{rate}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-gray-400">데이터가 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── 과제 탭 ─────────────────────────────────────────────────────────────────
function AssignmentsTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', problem_ids_raw: '' })
  const [createError, setCreateError] = useState('')

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: () => api.get(`/assignments/class/${classId}`).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/assignments', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', classId] })
      setShowCreate(false)
      setForm({ title: '', description: '', due_date: '', problem_ids_raw: '' })
      setCreateError('')
    },
    onError: (e: any) => setCreateError(e.response?.data?.detail ?? '오류가 발생했습니다'),
  })

  const deleteMutation = useMutation({
    mutationFn: (aid: number) => api.delete(`/assignments/${aid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments', classId] }),
  })

  const handleCreate = () => {
    const problem_ids = form.problem_ids_raw
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
    if (!form.title.trim()) { setCreateError('과제 제목을 입력하세요'); return }
    if (problem_ids.length === 0) { setCreateError('문제 번호를 입력하세요 (예: 1001, 1002)'); return }
    setCreateError('')
    createMutation.mutate({
      class_id: parseInt(classId),
      title: form.title,
      description: form.description,
      due_date: form.due_date || null,
      problem_ids,
    })
  }

  if (isLoading) return <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>

  return (
    <div className="space-y-3">
      {isTeacher && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            <Plus size={14} /> 과제 추가
          </button>
        </div>
      )}

      {(assignments as any[]).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
          {isTeacher ? '아직 등록된 과제가 없습니다. 과제를 추가해보세요!' : '아직 등록된 과제가 없습니다'}
        </div>
      ) : (
        <div className="space-y-2">
          {(assignments as any[]).map((a: any) => {
            const due = a.due_date ? new Date(a.due_date) : null
            const isOverdue = due && due < new Date()
            const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/assignments/${a.id}`} className="font-semibold text-gray-800 hover:text-primary-600 transition-colors">
                        {a.title}
                      </Link>
                      {due && !isOverdue && daysLeft !== null && daysLeft <= 3 && (
                        <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                          D-{daysLeft}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">마감</span>
                      )}
                    </div>
                    {a.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{a.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <BookOpen size={12} /> 문제 {a.problem_count}개
                      </span>
                      {due && (
                        <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                          <Calendar size={12} />
                          마감 {due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{a.my_solved}/{a.problem_count}</div>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${a.my_progress}%` }} />
                      </div>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={(e) => { e.preventDefault(); if (confirm(`"${a.title}" 과제를 삭제하시겠습니까?`)) deleteMutation.mutate(a.id) }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <Link to={`/assignments/${a.id}`} className="p-1.5 text-gray-300 hover:text-gray-500">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[460px] shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">과제 추가</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                <input
                  value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="예: 1주차 DP 연습"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="선택 사항"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  문제 번호 *
                  <span className="text-gray-400 font-normal ml-1.5 text-xs">쉼표 또는 공백으로 구분</span>
                </label>
                <input
                  value={form.problem_ids_raw} onChange={(e) => setForm((f) => ({ ...f, problem_ids_raw: e.target.value }))}
                  placeholder="예: 1001, 1002, 1003"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
                <input
                  type="datetime-local" value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {createError && <p className="text-red-500 text-sm">{createError}</p>}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => { setShowCreate(false); setCreateError('') }} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleCreate} disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {createMutation.isPending ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 학급 공지 탭 ─────────────────────────────────────────────────────────────
function ClassNoticeCard({ notice, canEdit, classId }: { notice: any; canEdit: boolean; classId: string }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState(notice.title)
  const [editContent, setEditContent] = useState(notice.content)
  const [editPinned, setEditPinned] = useState(notice.is_pinned)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/classes/${classId}/notices/${notice.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-notices', classId] }),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/classes/${classId}/notices/${notice.id}`, { title: editTitle, content: editContent, is_pinned: editPinned }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['class-notices', classId] }); setShowEdit(false) },
  })

  const dateStr = new Date(notice.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${notice.is_pinned ? 'border-red-100' : 'border-gray-100'}`}>
        <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
          {notice.is_pinned && <Pin size={13} className="text-red-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {notice.is_pinned && <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">공지</span>}
              <span className="font-semibold text-gray-800 truncate">{notice.title}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span>{notice.nick}</span>
              <span>{dateStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setShowEdit(true) }} className="p-1.5 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('삭제하시겠습니까?')) deleteMutation.mutate() }} className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </>
            )}
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </button>
        {expanded && (
          <div className="px-5 pb-5 border-t border-gray-50">
            <div className="pt-4 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: notice.content }} />
          </div>
        )}
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[720px] shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-lg">공지 수정</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
                <RichEditor value={editContent} onChange={setEditContent} minHeight="200px" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={editPinned} onChange={(e) => setEditPinned(e.target.checked)} className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm text-gray-700 flex items-center gap-1"><Pin size={13} className="text-red-400" /> 상단 고정</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => updateMutation.mutate()} disabled={!editTitle.trim() || !editContent.trim() || updateMutation.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {updateMutation.isPending ? '저장 중...' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ClassNoticesTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['class-notices', classId],
    queryFn: () => api.get(`/classes/${classId}/notices`).then((r) => Array.isArray(r.data) ? r.data : (r.data?.notices ?? [])),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post(`/classes/${classId}/notices`, { title, content, is_pinned: isPinned }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-notices', classId] })
      setShowCreate(false); setTitle(''); setContent(''); setIsPinned(false)
    },
  })

  const notices: any[] = Array.isArray(data) ? data : []

  return (
    <div className="space-y-3">
      {isTeacher && (
        <div className="flex justify-end">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            <Plus size={14} /> 공지 작성
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">등록된 공지가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {notices.map((n: any) => (
            <ClassNoticeCard key={n.id} notice={n} canEdit={isTeacher} classId={classId} />
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[720px] shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-lg">공지 작성</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
                <RichEditor value={content} onChange={setContent} placeholder="공지 내용을 입력하세요" minHeight="200px" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm text-gray-700 flex items-center gap-1"><Pin size={13} className="text-red-400" /> 상단 고정</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => createMutation.mutate()} disabled={!title.trim() || !content.trim() || createMutation.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {createMutation.isPending ? '저장 중...' : '작성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 파일 공유 탭 ─────────────────────────────────────────────────────────────
function FilesTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['class-files', classId],
    queryFn: () => api.get(`/classes/${classId}/files`).then((r) => Array.isArray(r.data) ? r.data : (r.data?.files ?? [])),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/classes/${classId}/files`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-files', classId] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? '업로드 실패'),
  })

  const deleteMutation = useMutation({
    mutationFn: (fid: number) => api.delete(`/classes/${classId}/files/${fid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-files', classId] }),
  })

  const files: any[] = Array.isArray(data) ? data : []

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    e.target.value = ''
  }

  const openPdf = async (file: any) => {
    try {
      const res = await api.get(`/classes/${classId}/files/${file.id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setPdfName(file.original_name)
    } catch {
      alert('파일을 열 수 없습니다.')
    }
  }

  const closePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null); setPdfName('')
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isPdf = (mime: string) => mime === 'application/pdf'

  return (
    <div className="space-y-3">
      {isTeacher && (
        <div className="flex justify-end">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> {uploadMutation.isPending ? '업로드 중...' : '파일 올리기'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">공유된 파일이 없습니다</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-2.5">파일명</th>
                <th className="text-left px-3 py-2.5">크기</th>
                <th className="text-left px-3 py-2.5">업로드</th>
                <th className="text-left px-3 py-2.5">날짜</th>
                <th className="text-center px-5 py-2.5">작업</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f: any) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-700 truncate max-w-xs">{f.original_name}</span>
                      {isPdf(f.mime_type) && (
                        <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">PDF</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{formatSize(f.file_size)}</td>
                  <td className="px-3 py-3 text-gray-500">{f.uploaded_by}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{new Date(f.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {isPdf(f.mime_type) && (
                        <button
                          onClick={() => openPdf(f)}
                          className="px-2.5 py-1 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
                        >
                          열기
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const res = await api.get(`/classes/${classId}/files/${f.id}/download`, { responseType: 'blob' })
                          const url = URL.createObjectURL(new Blob([res.data]))
                          const a = document.createElement('a')
                          a.href = url; a.download = f.original_name; a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="다운로드"
                      >
                        <Download size={14} />
                      </button>
                      {isTeacher && (
                        <button
                          onClick={() => { if (confirm('파일을 삭제하시겠습니까?')) deleteMutation.mutate(f.id) }}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PDF 뷰어 모달 */}
      {pdfUrl && (
        <div className="fixed inset-0 bg-black/60 flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-red-500" />
              <span className="font-medium text-gray-700 text-sm truncate max-w-lg">{pdfName}</span>
            </div>
            <button onClick={closePdf} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe src={pdfUrl} className="w-full h-full" title={pdfName} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
type TabKey = 'members' | 'stats' | 'assignments' | 'notices' | 'files'

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabKey>('members')
  const [copied, setCopied] = useState(false)
  const [editMember, setEditMember] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ grade: '', class_num: '', student_num: '' })
  const [showEditClass, setShowEditClass] = useState(false)
  const [editClassForm, setEditClassForm] = useState({ name: '', description: '', invite_code: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => api.get(`/classes/${id}`).then((r) => r.data),
  })

  const updateClassMutation = useMutation({
    mutationFn: (data: { name: string; description: string; invite_code: string }) =>
      api.patch(`/classes/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class', id] })
      qc.invalidateQueries({ queryKey: ['my-classes'] })
      setShowEditClass(false)
    },
  })

  const deleteClassMutation = useMutation({
    mutationFn: () => api.delete(`/classes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-classes'] }); navigate('/classes') },
  })

  const copyCode = () => {
    navigator.clipboard.writeText(cls.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openEditClass = () => {
    setEditClassForm({ name: cls.name, description: cls.description || '', invite_code: cls.invite_code })
    setShowEditClass(true)
  }

  if (isLoading) return <div className="text-gray-400 py-16 text-center">불러오는 중...</div>
  if (!cls) return <div className="text-gray-400 py-16 text-center">학급을 찾을 수 없습니다</div>

  const isTeacher = cls.my_role === 'teacher'
  const students = cls.members?.filter((m: any) => m.role === 'student') ?? []

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'members', label: '멤버', icon: <Users size={14} /> },
    { key: 'stats', label: '성적 현황', icon: <BarChart2 size={14} /> },
    { key: 'assignments', label: '과제', icon: <ClipboardList size={14} /> },
    { key: 'notices', label: '학급 공지', icon: <Bell size={14} /> },
    { key: 'files', label: '파일 공유', icon: <FileText size={14} /> },
  ]

  return (
    <div className="space-y-6">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3">
        <Link to="/classes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{cls.name}</h1>
          {cls.description && <p className="text-sm text-gray-500 mt-0.5">{cls.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && (
            <div onClick={copyCode} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-xs text-gray-400">초대코드</span>
              <span className="font-mono font-bold text-gray-700 tracking-widest">{cls.invite_code}</span>
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
            </div>
          )}
          {isTeacher && (
            <button onClick={openEditClass} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Settings size={14} /> 설정
            </button>
          )}
        </div>
      </div>

      {/* ── 요약 통계 ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-700">{students.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">학생</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {students.reduce((s: number, m: any) => s + (m.submit || 0), 0)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">전체 제출</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {students.reduce((s: number, m: any) => s + (m.solved || 0), 0)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">전체 해결</div>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      {activeTab === 'members' && (
        <MembersTab
          cls={cls} isTeacher={isTeacher} classId={id!}
          editMember={editMember} setEditMember={setEditMember}
          editForm={editForm} setEditForm={setEditForm}
        />
      )}
      {activeTab === 'stats' && <StatsTab classId={id!} />}
      {activeTab === 'assignments' && <AssignmentsTab classId={id!} isTeacher={isTeacher} />}
      {activeTab === 'notices' && <ClassNoticesTab classId={id!} isTeacher={isTeacher} />}
      {activeTab === 'files' && <FilesTab classId={id!} isTeacher={isTeacher} />}

      {/* ── 학급 설정 모달 ── */}
      {showEditClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[420px] shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">학급 설정</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학급 이름 *</label>
                <input
                  value={editClassForm.name} onChange={(e) => setEditClassForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  value={editClassForm.description} onChange={(e) => setEditClassForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="선택 사항"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  초대 코드
                  <span className="text-gray-400 font-normal ml-1.5 text-xs">영문 대문자·숫자, 4~10자</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={editClassForm.invite_code}
                    onChange={(e) => setEditClassForm((f) => ({ ...f, invite_code: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                      const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
                      setEditClassForm((f) => ({ ...f, invite_code: code }))
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
                    title="랜덤 생성"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              {updateClassMutation.isError && (
                <p className="text-red-500 text-sm">
                  {(updateClassMutation.error as any)?.response?.data?.detail ?? '오류가 발생했습니다'}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={() => { setShowEditClass(false); setShowDeleteConfirm(true) }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} /> 학급 삭제
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowEditClass(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
                <button
                  onClick={() => updateClassMutation.mutate(editClassForm)}
                  disabled={!editClassForm.name || !editClassForm.invite_code || updateClassMutation.isPending}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateClassMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 학급 삭제 확인 모달 ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-2">학급 삭제</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">"{cls.name}"</span> 학급을 삭제하시겠습니까?
            </p>
            <p className="text-xs text-gray-400 mb-4">학급은 보관 처리되며, 학생 계정은 유지됩니다.</p>
            {deleteClassMutation.isError && <p className="text-red-500 text-sm mb-3">오류가 발생했습니다</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={() => deleteClassMutation.mutate()}
                disabled={deleteClassMutation.isPending}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleteClassMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
