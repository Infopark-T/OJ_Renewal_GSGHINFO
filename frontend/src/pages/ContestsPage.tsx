import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Trophy, Clock, Users, Plus, Calendar } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  upcoming: { label: '예정', color: 'bg-yellow-100 text-yellow-700' },
  running:  { label: '진행 중', color: 'bg-green-100 text-green-700' },
  ended:    { label: '종료', color: 'bg-gray-100 text-gray-500' },
}

function CreateContestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
    contest_type: 'ACM', is_public: true, problem_ids_raw: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (body: any) => api.post('/contests', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contests'] }); onClose() },
    onError: (e: any) => setError(e.response?.data?.detail ?? '오류가 발생했습니다'),
  })

  const handleSubmit = () => {
    const problem_ids = form.problem_ids_raw
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
    if (!form.title.trim()) { setError('대회 제목을 입력하세요'); return }
    if (!form.start_time || !form.end_time) { setError('시작/종료 시간을 입력하세요'); return }
    if (problem_ids.length === 0) { setError('문제 번호를 입력하세요'); return }
    setError('')
    mutation.mutate({ ...form, problem_ids, is_public: form.is_public })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-800 mb-4 text-lg">대회 생성</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">대회 이름 *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="예: 2025 봄 알고리즘 대회"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="선택 사항"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간 *</label>
              <input type="datetime-local" value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간 *</label>
              <input type="datetime-local" value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대회 방식</label>
              <select value={form.contest_type} onChange={(e) => setForm((f) => ({ ...f, contest_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="ACM">ACM (패널티)</option>
                <option value="OI">OI (점수)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공개 여부</label>
              <select value={form.is_public ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.value === '1' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="1">공개</option>
                <option value="0">비공개</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              문제 번호 *
              <span className="text-gray-400 font-normal ml-1.5 text-xs">쉼표 또는 공백으로 구분</span>
            </label>
            <input value={form.problem_ids_raw} onChange={(e) => setForm((f) => ({ ...f, problem_ids_raw: e.target.value }))}
              placeholder="예: 1001, 1002, 1003"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {mutation.isPending ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContestsPage() {
  const { user } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: () => api.get('/contests').then((r) => r.data),
  })

  const contests = data?.contests ?? []

  const grouped = {
    running:  contests.filter((c: any) => c.status === 'running'),
    upcoming: contests.filter((c: any) => c.status === 'upcoming'),
    ended:    contests.filter((c: any) => c.status === 'ended'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={22} className="text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-800">대회</h1>
        </div>
        {(user?.is_admin || user?.is_teacher) && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
            <Plus size={14} /> 대회 생성
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-400 py-16 text-center">불러오는 중...</div>
      ) : contests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
          등록된 대회가 없습니다
        </div>
      ) : (
        <>
          {(['running', 'upcoming', 'ended'] as const).map((status) => (
            grouped[status].length > 0 && (
              <div key={status} className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {status === 'running' ? '진행 중' : status === 'upcoming' ? '예정' : '종료된 대회'}
                </h2>
                {grouped[status].map((c: any) => <ContestCard key={c.id} contest={c} />)}
              </div>
            )
          ))}
        </>
      )}

      {showCreate && <CreateContestModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function ContestCard({ contest: c }: { contest: any }) {
  const start = new Date(c.start_time)
  const end = new Date(c.end_time)
  const { label, color } = STATUS_LABEL[c.status] ?? STATUS_LABEL.ended

  return (
    <Link to={`/contests/${c.id}`}
      className="block bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{c.contest_type}</span>
            {!c.is_public && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">비공개</span>}
          </div>
          <h3 className="font-bold text-gray-800 text-lg">{c.title}</h3>
          {c.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{c.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' ~ '}
              {end.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1"><Trophy size={12} /> 문제 {c.problem_count}개</span>
            <span className="flex items-center gap-1"><Users size={12} /> {c.participant_count}명 참가</span>
          </div>
        </div>
        {c.status === 'running' && (
          <ContestTimer end={new Date(c.end_time)} />
        )}
      </div>
    </Link>
  )
}

function ContestTimer({ end }: { end: Date }) {
  const [now, setNow] = useState(new Date())
  const diff = Math.max(0, end.getTime() - now.getTime())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  // 1초마다 업데이트
  useState(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  })

  return (
    <div className="text-right shrink-0">
      <div className="text-xs text-gray-400 mb-0.5">남은 시간</div>
      <div className="font-mono font-bold text-green-600 text-lg">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
    </div>
  )
}
