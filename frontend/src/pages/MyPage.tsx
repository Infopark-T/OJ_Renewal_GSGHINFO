import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { User, Lock, Activity, CheckCircle, TrendingUp } from 'lucide-react'
import SourceCodeModal from '../components/SourceCodeModal'
import { DifficultyBadge } from '../components/DifficultyBadge'

// ─── 결과 색상 ────────────────────────────────────────────────────────────────
const RESULT_COLORS: Record<string, string> = {
  'Accepted': 'text-green-600 bg-green-50',
  'Wrong Answer': 'text-red-600 bg-red-50',
  'Time Limit Exceeded': 'text-orange-600 bg-orange-50',
  'Memory Limit Exceeded': 'text-orange-600 bg-orange-50',
  'Runtime Error': 'text-purple-600 bg-purple-50',
  'Compile Error': 'text-yellow-600 bg-yellow-50',
  'Waiting': 'text-gray-500 bg-gray-50',
  'Judging': 'text-blue-600 bg-blue-50',
}

// ─── 활동 히트맵 ──────────────────────────────────────────────────────────────
function ActivityHeatmap({ activityData }: { activityData: Record<string, number> }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 오늘부터 52주(364일) 전 일요일부터 시작
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364)
  // 해당 주의 일요일로 맞춤
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: Date[][] = []
  let cur = new Date(startDate)
  while (cur <= today) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  const toKey = (d: Date) => d.toISOString().slice(0, 10)
  const maxCount = Math.max(1, ...Object.values(activityData))

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    const ratio = count / maxCount
    if (ratio < 0.25) return 'bg-green-200'
    if (ratio < 0.5) return 'bg-green-400'
    if (ratio < 0.75) return 'bg-green-500'
    return 'bg-green-600'
  }

  const totalDays = Object.keys(activityData).length
  const totalSubmits = Object.values(activityData).reduce((a, b) => a + b, 0)

  // 연속 스트릭 계산
  let streak = 0
  const check = new Date(today)
  while (true) {
    if (activityData[toKey(check)]) {
      streak++
      check.setDate(check.getDate() - 1)
    } else break
  }

  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAYS = ['일','월','화','수','목','금','토']

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">활동 현황</h3>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>최근 1년 <strong className="text-gray-600">{totalSubmits}회</strong> 제출</span>
          <span>활동 <strong className="text-gray-600">{totalDays}일</strong></span>
          {streak > 0 && <span className="text-orange-500 font-medium">🔥 {streak}일 연속</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* 요일 레이블 */}
          <div className="flex flex-col gap-1 mr-1 pt-5">
            {DAYS.map((d, i) => (
              <div key={d} className={`h-3 text-xs text-gray-300 leading-3 ${i % 2 === 1 ? '' : 'invisible'}`}>{d}</div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {/* 월 레이블 */}
            <div className="flex gap-1 mb-1 h-4">
              {weeks.map((week, wi) => {
                const firstOfMonth = week.find(d => d.getDate() === 1)
                return (
                  <div key={wi} className="w-3">
                    {firstOfMonth ? (
                      <span className="text-xs text-gray-400 whitespace-nowrap" style={{ fontSize: '10px' }}>
                        {MONTHS[firstOfMonth.getMonth()]}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* 히트맵 그리드 */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const key = toKey(day)
                    const count = activityData[key] ?? 0
                    const isFuture = day > today
                    return (
                      <div
                        key={key}
                        title={count > 0 ? `${key}: ${count}회 제출` : key}
                        className={`w-3 h-3 rounded-sm transition-colors ${isFuture ? 'bg-transparent' : getColor(count)}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-1 mt-2 justify-end">
          <span className="text-xs text-gray-400">적음</span>
          {['bg-gray-100','bg-green-200','bg-green-400','bg-green-500','bg-green-600'].map((c) => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-xs text-gray-400">많음</span>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function MyPage() {
  const { user, login, token } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'profile' | 'password' | 'activity' | 'submissions' | 'solved'>('activity')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [profileForm, setProfileForm] = useState({ nick: user?.nick ?? '', email: user?.email ?? '', school: user?.school ?? '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    enabled: !!user,
  })

  useEffect(() => {
    if (freshUser) {
      setProfileForm({ nick: freshUser.nick, email: freshUser.email ?? '', school: freshUser.school })
    }
  }, [freshUser])

  const { data: activityData = {} } = useQuery({
    queryKey: ['my-activity'],
    queryFn: () => api.get('/auth/me/activity').then((r) => r.data),
    enabled: tab === 'activity' && !!user,
  })

  const { data: submissionsData } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => api.get('/solutions', { params: { user_id: user?.user_id, page_size: 50 } }).then((r) => r.data),
    enabled: tab === 'submissions' && !!user,
  })

  const { data: solvedProblems } = useQuery({
    queryKey: ['my-solved-problems'],
    queryFn: () => api.get('/auth/me/solved-problems').then((r) => r.data),
    enabled: tab === 'solved' && !!user,
  })

  const profileMutation = useMutation({
    mutationFn: () => api.patch('/auth/me', profileForm).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      if (token) login(token, { ...user!, ...data })
    },
  })

  const pwMutation = useMutation({
    mutationFn: () => api.patch('/auth/me/password', { current_password: pwForm.current_password, new_password: pwForm.new_password }),
    onSuccess: () => {
      setPwSuccess(true)
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 3000)
    },
    onError: (e: any) => setPwError(e.response?.data?.detail ?? '오류가 발생했습니다'),
  })

  const handlePwSubmit = () => {
    setPwError('')
    if (pwForm.new_password !== pwForm.confirm) { setPwError('새 비밀번호가 일치하지 않습니다'); return }
    pwMutation.mutate()
  }

  const stats = freshUser ?? user
  const acceptRate = stats?.submit
    ? Math.round(((stats?.solved ?? 0) / stats.submit) * 100)
    : 0

  const tabs = [
    { id: 'activity', label: '활동', icon: TrendingUp },
    { id: 'solved', label: '해결한 문제', icon: CheckCircle },
    { id: 'submissions', label: '제출 내역', icon: Activity },
    { id: 'profile', label: '내 정보', icon: User },
    { id: 'password', label: '비밀번호 변경', icon: Lock },
  ] as const

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── 프로필 헤더 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-2xl shrink-0">
            {(stats?.nick || stats?.user_id || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{stats?.nick || stats?.user_id}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {stats?.user_id}
              {stats?.school ? ` · ${stats.school}` : ''}
              {stats?.is_teacher && <span className="ml-2 text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">선생님</span>}
              {stats?.is_admin && <span className="ml-1 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">관리자</span>}
            </p>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <div>
              <div className="text-2xl font-bold text-gray-700">{stats?.submit ?? 0}</div>
              <div className="text-xs text-gray-400 mt-0.5">제출</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats?.solved ?? 0}</div>
              <div className="text-xs text-gray-400 mt-0.5">해결</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{acceptRate}%</div>
              <div className="text-xs text-gray-400 mt-0.5">정답률</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm whitespace-nowrap transition-colors shrink-0 ${
                tab === id
                  ? 'border-b-2 border-primary-600 text-primary-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── 활동 히트맵 ── */}
          {tab === 'activity' && (
            <ActivityHeatmap activityData={activityData} />
          )}

          {/* ── 해결한 문제 ── */}
          {tab === 'solved' && (
            <div>
              {!solvedProblems && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
              {solvedProblems?.length === 0 && (
                <div className="text-gray-400 text-sm py-8 text-center">아직 해결한 문제가 없습니다.</div>
              )}
              {solvedProblems && solvedProblems.length > 0 && (
                <>
                  <div className="text-xs text-gray-400 mb-3">총 {solvedProblems.length}문제 해결</div>
                  <div className="grid gap-2">
                    {solvedProblems.map((p: any) => (
                      <Link
                        key={p.problem_id}
                        to={`/problems/${p.problem_id}`}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/50 transition-colors group"
                      >
                        <CheckCircle size={14} className="text-green-500 shrink-0" />
                        <span className="text-xs text-gray-400 font-mono w-12 shrink-0">#{p.problem_id}</span>
                        <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-green-700 truncate">{p.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.source && (
                            <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[100px]">{p.source}</span>
                          )}
                          {p.difficulty != null && <DifficultyBadge difficulty={p.difficulty} />}
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 제출 내역 ── */}
          {tab === 'submissions' && (
            <div>
              {!submissionsData && <div className="text-gray-400 text-sm py-4">불러오는 중...</div>}
              {submissionsData?.solutions?.length === 0 && (
                <div className="text-gray-400 text-sm py-8 text-center">제출 내역이 없습니다.</div>
              )}
              {submissionsData?.solutions?.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5">ID</th>
                        <th className="text-left px-3 py-2.5">문제</th>
                        <th className="text-left px-3 py-2.5">결과</th>
                        <th className="text-right px-3 py-2.5">시간</th>
                        <th className="text-left px-3 py-2.5">언어</th>
                        <th className="text-right px-4 py-2.5">제출시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsData.solutions.map((s: any) => (
                        <tr key={s.solution_id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => setSelectedId(s.solution_id)}
                              className="text-gray-400 hover:text-primary-600 hover:underline"
                            >
                              {s.solution_id}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <Link to={`/problems/${s.problem_id}`} className="text-primary-600 hover:underline font-medium">
                              #{s.problem_id}
                            </Link>
                            {s.problem_title && (
                              <span className="ml-1.5 text-gray-500 text-xs truncate">{s.problem_title}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESULT_COLORS[s.result_label] ?? 'text-gray-600 bg-gray-50'}`}>
                              {s.result_label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-500">{s.time}ms</td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs">{s.language_label}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                            {new Date(s.in_date).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── 내 정보 수정 ── */}
          {tab === 'profile' && (
            <div className="space-y-4 max-w-md">
              {[
                { key: 'nick', label: '닉네임', type: 'text' },
                { key: 'email', label: '이메일', type: 'email' },
                { key: 'school', label: '학교 / 소속', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(profileForm as any)[key]}
                    onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              {profileMutation.isSuccess && <p className="text-green-600 text-sm">저장되었습니다.</p>}
              <button
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
                className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {profileMutation.isPending ? '저장 중...' : '저장하기'}
              </button>
            </div>
          )}

          {/* ── 비밀번호 변경 ── */}
          {tab === 'password' && (
            <div className="space-y-4 max-w-md">
              {[
                { key: 'current_password', label: '현재 비밀번호' },
                { key: 'new_password', label: '새 비밀번호' },
                { key: 'confirm', label: '새 비밀번호 확인' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="password"
                    value={(pwForm as any)[key]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
              {pwSuccess && <p className="text-green-600 text-sm">비밀번호가 변경되었습니다.</p>}
              <button
                onClick={handlePwSubmit}
                disabled={!pwForm.current_password || !pwForm.new_password || pwMutation.isPending}
                className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {pwMutation.isPending ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          )}

        </div>
      </div>

      {selectedId && <SourceCodeModal solutionId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
