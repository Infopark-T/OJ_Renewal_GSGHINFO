import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import {
  Search, ShieldCheck, ShieldOff, UserCheck, UserX, KeyRound,
  GraduationCap, Trash2, Upload, Download, ChevronUp, ChevronDown,
  Users, BookOpen, CheckSquare, Square,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

type Tab = 'student' | 'staff'
type SortKey = 'user_id' | 'nick' | 'grade' | 'class_num' | 'student_num' | 'submit' | 'reg_time'

function SortIcon({ col, sortBy, sortOrder }: { col: SortKey; sortBy: SortKey; sortOrder: string }) {
  if (sortBy !== col) return <ChevronUp size={12} className="text-gray-300 opacity-60" />
  return sortOrder === 'asc'
    ? <ChevronUp size={12} className="text-primary-500" />
    : <ChevronDown size={12} className="text-primary-500" />
}

export default function AdminUsersPage() {
  const { user: me } = useAuthStore()
  const qc = useQueryClient()

  // ── 탭 & 필터 ──────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('student')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [showDefunct, setShowDefunct] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('grade')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  // ── 선택 상태 ──────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<'deactivate' | 'permanent' | null>(null)

  // ── 모달 상태 ──────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [importClassId, setImportClassId] = useState('')

  // ── 정렬 토글 ──────────────────────────────────────────────────
  const handleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
    setSelected(new Set())
  }

  const resetFilters = () => {
    setSearch(''); setSearchInput('')
    setGrade(''); setClassNum('')
    setPage(1)
    setSelected(new Set())
  }

  // ── Queries ────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', tab, page, search, grade, classNum, showDefunct, sortBy, sortOrder],
    queryFn: () =>
      api.get('/admin/users', {
        params: {
          page,
          page_size: 30,
          search: search || undefined,
          show_defunct: showDefunct,
          role: tab,
          grade: grade ? Number(grade) : undefined,
          class_num: classNum ? Number(classNum) : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
      }).then((r) => r.data),
  })

  const { data: classesList } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: () => api.get('/classes/mine').then((r) => r.data),
  })

  // ── Mutations ──────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    setSelected(new Set())
  }

  const defunctMutation      = useMutation({ mutationFn: (uid: string) => api.patch(`/admin/users/${uid}/defunct`), onSuccess: invalidate })
  const adminMutation        = useMutation({ mutationFn: (uid: string) => api.patch(`/admin/users/${uid}/admin`), onSuccess: invalidate })
  const teacherMutation      = useMutation({ mutationFn: (uid: string) => api.patch(`/admin/users/${uid}/teacher`), onSuccess: invalidate })
  const deleteMutation       = useMutation({ mutationFn: (uid: string) => api.delete(`/admin/users/${uid}`), onSuccess: invalidate })
  const permanentDeleteMutation = useMutation({ mutationFn: (uid: string) => api.delete(`/admin/users/${uid}/permanent`), onSuccess: invalidate })
  const resetPwMutation      = useMutation({
    mutationFn: ({ uid, password }: { uid: string; password: string }) => api.patch(`/admin/users/${uid}/password`, { password }),
    onSuccess: () => { setResetTarget(null); setNewPw('') },
  })
  const bulkDeleteMutation = useMutation({
    mutationFn: ({ ids, permanent }: { ids: string[]; permanent: boolean }) =>
      api.delete('/admin/users', {
        params: { permanent },
        data: { user_ids: ids },
      }).then((r) => r.data),
    onSuccess: () => { setBulkConfirm(null); invalidate() },
  })

  // ── 선택 헬퍼 ──────────────────────────────────────────────────
  const currentUserIds: string[] = useMemo(
    () => (data?.users ?? []).map((u: any) => u.user_id),
    [data],
  )
  // 삭제 가능한 행만 선택 대상 (자기 자신, 교사/관리자 제외 — 학생 탭 기준)
  const selectableIds: string[] = useMemo(
    () => (data?.users ?? [])
      .filter((u: any) => u.user_id !== me?.user_id && (me?.is_admin || (!u.is_admin && !u.is_teacher)))
      .map((u: any) => u.user_id),
    [data, me],
  )
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const someSelected = selectableIds.some((id) => selected.has(id))

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev)
        selectableIds.forEach((id) => next.delete(id))
        return next
      }
      return new Set([...prev, ...selectableIds])
    })

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const params = importClassId ? `?class_id=${importClassId}` : ''
      return api.post(`/admin/users/bulk-import${params}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: (data) => { setImportResult(data); setImportFile(null); invalidate() },
  })

  const downloadTemplate = async () => {
    const res = await api.get('/admin/users/import-template', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = 'user_import_template.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = data ? Math.ceil(data.total / 30) : 1

  // ── 정렬 헤더 셀 ──────────────────────────────────────────────
  const Th = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-xs font-medium text-gray-400 cursor-pointer select-none hover:text-gray-600 ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-0.5">
        {label} <SortIcon col={col} sortBy={sortBy} sortOrder={sortOrder} />
      </span>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">사용자 관리</h1>
        <button
          onClick={() => { setShowImport(true); setImportResult(null); setImportClassId('') }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Upload size={15} /> 일괄 등록
        </button>
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setTab('student'); setPage(1); setSortBy('grade'); setSortOrder('asc') }}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-colors font-medium ${
            tab === 'student' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={14} /> 학생
        </button>
        <button
          onClick={() => { setTab('staff'); setPage(1); setSortBy('user_id'); setSortOrder('asc') }}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-colors font-medium ${
            tab === 'staff' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={14} /> 교사/관리자
        </button>
      </div>

      {/* ── 필터 바 ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="아이디 · 이름 · 학교"
            className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button type="submit" className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Search size={15} className="text-gray-500" />
          </button>
        </form>

        {tab === 'student' && (
          <>
            <select
              value={grade}
              onChange={(e) => { setGrade(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">학년 전체</option>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={classNum}
              onChange={(e) => { setClassNum(e.target.value); setPage(1) }}
              placeholder="반"
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </>
        )}

        {(search || grade || classNum) && (
          <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600 px-2">
            필터 초기화
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-400">총 {data?.total ?? 0}명</span>
          <button
            onClick={() => { setShowDefunct((v) => !v); setPage(1) }}
            className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
              showDefunct ? 'bg-gray-700 text-white border-gray-700' : 'border-gray-200 hover:bg-gray-50 text-gray-500'
            }`}
          >
            비활성 {showDefunct ? '숨기기' : '보기'}
          </button>
        </div>
      </div>

      {/* ── 선택 액션 바 ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl text-sm">
          <span className="font-medium text-primary-700">{selected.size}명 선택됨</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setBulkConfirm('deactivate')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <UserX size={14} /> 비활성화
            </button>
            {me?.is_admin && (
              <button
                onClick={() => setBulkConfirm('permanent')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> 영구 삭제
              </button>
            )}
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 테이블 ── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">불러오는 중...</div>
        ) : data?.users.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                {/* 전체 선택 체크박스 */}
                <th className="pl-4 pr-1 py-3 w-8">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-primary-500 transition-colors">
                    {allSelected
                      ? <CheckSquare size={15} className="text-primary-500" />
                      : someSelected
                      ? <CheckSquare size={15} className="text-primary-300" />
                      : <Square size={15} />}
                  </button>
                </th>
                <Th col="user_id" label="아이디" className="pl-2" />
                <Th col="nick" label="이름/별명" />
                <th className="px-3 py-3 text-xs font-medium text-gray-400">학교</th>
                {tab === 'student' && (
                  <>
                    <Th col="grade" label="학년" />
                    <Th col="class_num" label="반" />
                    <Th col="student_num" label="번호" />
                  </>
                )}
                {tab === 'staff' && (
                  <th className="px-3 py-3 text-xs font-medium text-gray-400">권한</th>
                )}
                <Th col="submit" label="제출/정답" className="text-right" />
                <th className="px-3 py-3 text-xs font-medium text-gray-400 text-center">상태</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-400 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u: any) => {
                const isSelectable = u.user_id !== me?.user_id && (me?.is_admin || (!u.is_admin && !u.is_teacher))
                const isChecked = selected.has(u.user_id)
                return (
                <tr
                  key={u.user_id}
                  className={`border-b border-gray-50 transition-colors ${isChecked ? 'bg-primary-50' : 'hover:bg-gray-50'} ${u.defunct === 'Y' ? 'opacity-50' : ''}`}
                >
                  <td className="pl-4 pr-1 py-3">
                    {isSelectable ? (
                      <button onClick={() => toggleOne(u.user_id)} className="text-gray-400 hover:text-primary-500 transition-colors">
                        {isChecked
                          ? <CheckSquare size={15} className="text-primary-500" />
                          : <Square size={15} />}
                      </button>
                    ) : (
                      <span className="w-[15px] inline-block" />
                    )}
                  </td>
                  <td className="pl-2 pr-3 py-3 font-mono text-xs text-gray-600">{u.user_id}</td>
                  <td className="px-3 py-3 font-medium text-gray-800">{u.nick}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{u.school || '—'}</td>

                  {tab === 'student' && (
                    <>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {u.grade ? `${u.grade}학년` : '—'}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {u.class_num ? `${u.class_num}반` : '—'}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {u.student_num ?? '—'}
                      </td>
                    </>
                  )}

                  {tab === 'staff' && (
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {u.is_admin && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">관리자</span>
                        )}
                        {!u.is_admin && u.is_teacher && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">교사</span>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="px-3 py-3 text-right text-gray-500 tabular-nums">
                    {u.submit} / <span className="text-green-600">{u.solved}</span>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.defunct === 'N' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {u.defunct === 'N' ? '활성' : '비활성'}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {/* 활성/비활성 토글 */}
                      <button
                        onClick={() => defunctMutation.mutate(u.user_id)}
                        title={u.defunct === 'N' ? '비활성화' : '활성화'}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {u.defunct === 'N' ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>

                      {/* 교사 토글 (교사/관리자 탭에서만) */}
                      {tab === 'staff' && (
                        <button
                          onClick={() => teacherMutation.mutate(u.user_id)}
                          title={u.is_teacher && !u.is_admin ? '교사 해제' : '교사 지정'}
                          disabled={u.is_admin}
                          className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
                            u.is_teacher && !u.is_admin
                              ? 'text-blue-500 hover:bg-blue-50'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          }`}
                        >
                          <GraduationCap size={14} />
                        </button>
                      )}

                      {/* 관리자 토글 (교사/관리자 탭에서만) */}
                      {tab === 'staff' && (
                        <button
                          onClick={() => adminMutation.mutate(u.user_id)}
                          title={u.is_admin ? '관리자 해제' : '관리자 지정'}
                          className={`p-1.5 rounded transition-colors ${
                            u.is_admin
                              ? 'text-purple-500 hover:bg-purple-50'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          }`}
                        >
                          {u.is_admin ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                        </button>
                      )}

                      {/* 비밀번호 초기화 */}
                      <button
                        onClick={() => { setResetTarget(u.user_id); setNewPw('') }}
                        title="비밀번호 초기화"
                        className="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors"
                      >
                        <KeyRound size={14} />
                      </button>

                      {/* 삭제 */}
                      {(me?.is_admin || (!u.is_admin && !u.is_teacher)) && u.user_id !== me?.user_id && (
                        u.defunct === 'Y' ? (
                          <button
                            onClick={() => {
                              if (confirm(`"${u.nick}" 계정을 완전히 삭제합니다. 복구 불가. 계속하시겠습니까?`))
                                permanentDeleteMutation.mutate(u.user_id)
                            }}
                            title="영구 삭제"
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`"${u.nick}" 계정을 비활성화하시겠습니까?`))
                                deleteMutation.mutate(u.user_id)
                            }}
                            title="비활성화"
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            이전
          </button>
          <span className="px-4 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      )}

      {/* ── 일괄 삭제 확인 모달 ── */}
      {bulkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-2">
              {bulkConfirm === 'permanent' ? '영구 삭제' : '비활성화'} 확인
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              선택한 <span className="font-semibold text-gray-800">{selected.size}명</span>의 계정을
              {bulkConfirm === 'permanent'
                ? ' 완전히 삭제합니다. 이 작업은 복구할 수 없습니다.'
                : ' 비활성화합니다.'}
            </p>
            {bulkConfirm === 'permanent' && (
              <p className="text-xs text-red-500 mt-1 mb-3">제출 내역, 학급 정보 등 모든 데이터가 삭제됩니다.</p>
            )}
            {bulkDeleteMutation.isError && (
              <p className="text-red-500 text-sm my-2">
                {(bulkDeleteMutation.error as any)?.response?.data?.detail ?? '오류가 발생했습니다'}
              </p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setBulkConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() =>
                  bulkDeleteMutation.mutate({
                    ids: [...selected],
                    permanent: bulkConfirm === 'permanent',
                  })
                }
                disabled={bulkDeleteMutation.isPending}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                  bulkConfirm === 'permanent'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {bulkDeleteMutation.isPending ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 비밀번호 초기화 모달 ── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">비밀번호 초기화</h3>
            <p className="text-sm text-gray-500 mb-4">{resetTarget}</p>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="새 비밀번호"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setResetTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={() => resetPwMutation.mutate({ uid: resetTarget, password: newPw })}
                disabled={newPw.length < 4 || resetPwMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 일괄 등록 모달 ── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-1">사용자 일괄 등록</h3>
            <p className="text-sm text-gray-500 mb-4">엑셀 파일로 여러 계정을 한 번에 등록합니다</p>

            {!importResult ? (
              <div className="space-y-4">
                <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
                  <Download size={14} /> 양식 파일 다운로드 (.xlsx)
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    학급 배정 <span className="text-gray-400 font-normal">(선택)</span>
                  </label>
                  <select
                    value={importClassId}
                    onChange={(e) => setImportClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">학급 배정 안함</option>
                    {classesList?.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
                  onClick={() => document.getElementById('import-file-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImportFile(f) }}
                >
                  <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                  {importFile ? (
                    <p className="text-sm font-medium text-primary-600">{importFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">클릭하거나 파일을 드래그하세요</p>
                  )}
                  <input
                    id="import-file-input" type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {importMutation.isError && (
                  <p className="text-red-500 text-sm">
                    {(importMutation.error as any)?.response?.data?.detail ?? '오류가 발생했습니다'}
                  </p>
                )}

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
                  <button
                    onClick={() => importFile && importMutation.mutate(importFile)}
                    disabled={!importFile || importMutation.isPending}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {importMutation.isPending ? '처리 중...' : '등록하기'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                    <div className="text-xs text-green-500 mt-0.5">등록 성공</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">{importResult.skipped}</div>
                    <div className="text-xs text-red-400 mt-0.5">건너뜀</div>
                  </div>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 max-h-36 overflow-y-auto">
                    <p className="text-xs font-medium text-gray-500 mb-2">건너뜀 내역</p>
                    {importResult.errors.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-gray-500">{e.row}행 {e.user_id ? `(${e.user_id})` : ''} — {e.reason}</p>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">확인</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
