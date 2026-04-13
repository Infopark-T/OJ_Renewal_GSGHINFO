import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { ArrowLeft, Trophy, Users, Clock, Calendar, BookOpen, BarChart2, Settings, Plus, TimerReset } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  upcoming: { label: '예정', color: 'bg-yellow-100 text-yellow-700' },
  running:  { label: '진행 중', color: 'bg-green-100 text-green-700' },
  paused:   { label: '일시중지', color: 'bg-orange-100 text-orange-700' },
  ended:    { label: '종료', color: 'bg-gray-100 text-gray-500' },
}

function Scoreboard({ contestId, isRunning }: { contestId: string; isRunning: boolean }) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['scoreboard', contestId],
    queryFn: () => api.get(`/contests/${contestId}/scoreboard`).then((r) => r.data),
    refetchInterval: isRunning ? 15000 : false,  // 진행 중: 15초, 종료 후: 갱신 없음
  })

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt))
  }, [dataUpdatedAt])

  if (isLoading) return <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>
  if (!data || data.rows.length === 0)
    return <div className="py-12 text-center text-gray-400 text-sm">아직 참가자가 없습니다</div>

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
            <th className="text-center px-4 py-3 w-10">#</th>
            <th className="text-left px-3 py-3">참가자</th>
            {data.problems.map((p: any) => (
              <th key={p.problem_id} className="text-center px-3 py-3 w-14">
                <Link to={`/contests/${contestId}/problems/${p.problem_id}`} className="hover:text-primary-600 font-bold">
                  {p.alias}
                </Link>
              </th>
            ))}
            <th className="text-center px-3 py-3 w-16">해결</th>
            <th className="text-center px-3 py-3 w-20">패널티</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any) => (
            <tr key={row.user_id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="text-center px-4 py-3 font-bold text-gray-500">
                {row.rank <= 3 ? (
                  <span className={row.rank === 1 ? 'text-yellow-500' : row.rank === 2 ? 'text-gray-400' : 'text-orange-400'}>
                    {row.rank}
                  </span>
                ) : row.rank}
              </td>
              <td className="px-3 py-3 font-medium text-gray-700">{row.nick}</td>
              {row.problems.map((cell: any) => (
                <td key={cell.alias} className="text-center px-3 py-3">
                  {cell.ac ? (
                    <div>
                      <div className="text-green-600 font-bold text-xs">
                        {Math.floor(cell.ac_time / 60)}:{String(cell.ac_time % 60).padStart(2, '0')}
                      </div>
                      {cell.wrong > 0 && (
                        <div className="text-red-400 text-xs">-{cell.wrong}</div>
                      )}
                    </div>
                  ) : cell.wrong > 0 ? (
                    <span className="text-red-400 text-xs font-medium">({cell.wrong})</span>
                  ) : (
                    <span className="text-gray-200">—</span>
                  )}
                </td>
              ))}
              <td className="text-center px-3 py-3 font-bold text-blue-600">{row.solved}</td>
              <td className="text-center px-3 py-3 text-gray-500 font-mono text-xs">
                {row.penalty > 0 ? row.penalty : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isRunning && (
        <div className="px-5 py-2 text-right text-xs text-gray-400 border-t border-gray-50">
          마지막 갱신: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          <span className="ml-2 text-gray-300">(15초마다 자동 갱신)</span>
        </div>
      )}
    </div>
  )
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'problems' | 'scoreboard'>('problems')
  const [showManage, setShowManage] = useState(false)
  const [extendMinutes, setExtendMinutes] = useState('30')
  const [addProblemId, setAddProblemId] = useState('')
  const [manageError, setManageError] = useState('')
  const [manageOk, setManageOk] = useState('')

  const { data: contest, isLoading } = useQuery({
    queryKey: ['contest', id],
    queryFn: () => api.get(`/contests/${id}`).then((r) => r.data),
  })

  const registerMutation = useMutation({
    mutationFn: () => api.post(`/contests/${id}/register`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contest', id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contests/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contests'] }); navigate('/contests') },
  })

  const pauseMutation = useMutation({
    mutationFn: () => api.post(`/contests/${id}/pause`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contest', id] }); setManageOk('대회가 일시중지되었습니다'); setManageError(''); setTimeout(() => setManageOk(''), 3000) },
    onError: (e: any) => { setManageError(e.response?.data?.detail ?? '오류'); setManageOk('') },
  })

  const resumeMutation = useMutation({
    mutationFn: () => api.post(`/contests/${id}/resume`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contest', id] }); setManageOk('대회가 재개되었습니다'); setManageError(''); setTimeout(() => setManageOk(''), 3000) },
    onError: (e: any) => { setManageError(e.response?.data?.detail ?? '오류'); setManageOk('') },
  })

  const extendMutation = useMutation({
    mutationFn: (minutes: number) => api.patch(`/contests/${id}`, { extend_minutes: minutes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contest', id] })
      setManageOk('종료 시간이 연장되었습니다')
      setManageError('')
      setTimeout(() => setManageOk(''), 3000)
    },
    onError: (e: any) => { setManageError(e.response?.data?.detail ?? '오류가 발생했습니다'); setManageOk('') },
  })

  const addProblemMutation = useMutation({
    mutationFn: (problemId: number) => api.post(`/contests/${id}/problems`, { problem_id: problemId }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['contest', id] })
      setManageOk(`문제 ${data.problem_id}번(${data.alias})이 추가되었습니다`)
      setManageError('')
      setAddProblemId('')
      setTimeout(() => setManageOk(''), 3000)
    },
    onError: (e: any) => { setManageError(e.response?.data?.detail ?? '오류가 발생했습니다'); setManageOk('') },
  })

  const handleExtend = () => {
    const mins = parseInt(extendMinutes)
    if (isNaN(mins) || mins <= 0) { setManageError('연장 시간을 올바르게 입력하세요'); return }
    extendMutation.mutate(mins)
  }

  const handleAddProblem = () => {
    const pid = parseInt(addProblemId)
    if (isNaN(pid) || pid <= 0) { setManageError('문제 번호를 올바르게 입력하세요'); return }
    addProblemMutation.mutate(pid)
  }

  if (isLoading) return <div className="text-gray-400 py-16 text-center">불러오는 중...</div>
  if (!contest) return <div className="text-gray-400 py-16 text-center">대회를 찾을 수 없습니다</div>

  const { label, color } = STATUS_LABEL[contest.status] ?? STATUS_LABEL.ended
  const start = new Date(contest.start_time)
  const end = new Date(contest.end_time)
  const isAdmin = user?.is_admin
  const isOwner = user?.user_id === contest.created_by || isAdmin
  const canRegister = user && !contest.registered && contest.status !== 'ended'

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3">
        <Link to="/contests" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{contest.contest_type}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{contest.title}</h1>
          {contest.description && <p className="text-sm text-gray-500 mt-0.5">{contest.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canRegister && (
            <button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {registerMutation.isPending ? '등록 중...' : '참가 등록'}
            </button>
          )}
          {contest.registered && contest.status !== 'ended' && (
            <span className="px-3 py-2 bg-green-50 text-green-700 text-sm rounded-lg font-medium">참가 중</span>
          )}
          {isOwner && contest.status !== 'ended' && (
            <button
              onClick={() => { setShowManage((v) => !v); setManageError(''); setManageOk('') }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${showManage ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Settings size={14} /> 관리
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => { if (confirm('대회를 삭제하시겠습니까?')) deleteMutation.mutate() }}
              className="px-3 py-2 border border-gray-200 text-sm text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* ── 운영 패널 (오너/관리자 전용) ── */}
      {isOwner && showManage && contest.status !== 'ended' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
              <Settings size={14} /> 대회 운영 관리
            </div>
            {/* 일시중지 / 재개 */}
            {contest.status === 'running' && (
              <button
                onClick={() => { if (confirm('대회를 일시중지하시겠습니까? 참가자의 제출이 차단됩니다.')) pauseMutation.mutate() }}
                disabled={pauseMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                ⏸ 일시중지
              </button>
            )}
            {contest.status === 'paused' && (
              <button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                ▶ 재개 (멈춘 시간 자동 연장)
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* 시간 연장 */}
            <div className="bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                <TimerReset size={13} className="text-orange-500" /> 시간 연장
              </div>
              <div className="text-xs text-gray-400 mb-2">
                현재 종료: {end.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number" min="1" value={extendMinutes}
                    onChange={(e) => setExtendMinutes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">분</span>
                </div>
                <button
                  onClick={handleExtend}
                  disabled={extendMutation.isPending}
                  className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
                >
                  연장
                </button>
              </div>
            </div>

            {/* 문제 추가 */}
            <div className="bg-white rounded-lg border border-amber-100 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                <Plus size={13} className="text-blue-500" /> 문제 추가
              </div>
              <div className="text-xs text-gray-400 mb-2">
                현재 {contest.problems?.length ?? 0}문제
                {contest.problems?.length > 0 && ` (${contest.problems.map((p: any) => p.alias).join(', ')})`}
              </div>
              <div className="flex gap-2">
                <input
                  type="number" min="1" value={addProblemId}
                  onChange={(e) => setAddProblemId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProblem()}
                  placeholder="문제 번호"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={handleAddProblem}
                  disabled={addProblemMutation.isPending}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>
          </div>

          {manageError && <p className="text-xs text-red-500">{manageError}</p>}
          {manageOk && <p className="text-xs text-green-600 font-medium">{manageOk}</p>}
        </div>
      )}

      {/* ── 메타 정보 ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <Calendar size={18} className="text-blue-400 shrink-0" />
          <div>
            <div className="text-xs text-gray-400">시작</div>
            <div className="text-sm font-medium text-gray-700">
              {start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <Clock size={18} className="text-orange-400 shrink-0" />
          <div>
            <div className="text-xs text-gray-400">종료</div>
            <div className="text-sm font-medium text-gray-700">
              {end.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <Users size={18} className="text-green-400 shrink-0" />
          <div>
            <div className="text-xs text-gray-400">참가자</div>
            <div className="text-sm font-bold text-gray-700">{contest.participant_count}명</div>
          </div>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'problems', label: '문제', icon: <BookOpen size={14} /> },
          { key: 'scoreboard', label: '순위표', icon: <BarChart2 size={14} /> },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── 문제 탭 ── */}
      {activeTab === 'problems' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {contest.status === 'upcoming' && !contest.registered ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              대회 시작 전입니다. 참가 등록 후 문제를 볼 수 있습니다.
            </div>
          ) : contest.problems?.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">문제가 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                  <th className="text-center px-5 py-3 w-12">번호</th>
                  <th className="text-left px-3 py-3">문제</th>
                  <th className="text-right px-5 py-3">문제 ID</th>
                </tr>
              </thead>
              <tbody>
                {contest.problems?.map((p: any) => (
                  <tr key={p.problem_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="text-center px-5 py-3 font-bold text-gray-600 text-base">{p.alias}</td>
                    <td className="px-3 py-3">
                      <Link
                        to={`/contests/${id}/problems/${p.problem_id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="text-right px-5 py-3 text-gray-400 font-mono text-xs">#{p.problem_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── 순위표 탭 ── */}
      {activeTab === 'scoreboard' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-yellow-500" />
              <span className="font-semibold text-gray-700">순위표</span>
            </div>
            {contest.status === 'running' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                실시간 갱신 중
              </span>
            )}
          </div>
          <Scoreboard contestId={id!} isRunning={contest.status === 'running'} />
        </div>
      )}
    </div>
  )
}
