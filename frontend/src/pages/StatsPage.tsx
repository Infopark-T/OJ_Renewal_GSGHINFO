import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Users, BookOpen, Send, CheckCircle, TrendingUp, BarChart2, Code2, Flame } from 'lucide-react'

// 색상 팔레트
const RESULT_COLORS: Record<string, string> = {
  Accepted: 'bg-green-500',
  'Wrong Answer': 'bg-red-400',
  'Time Limit Exceeded': 'bg-orange-400',
  'Memory Limit Exceeded': 'bg-yellow-400',
  'Runtime Error': 'bg-purple-400',
  'Compile Error': 'bg-gray-400',
  'Presentation Error': 'bg-blue-300',
  Waiting: 'bg-gray-300',
  Judging: 'bg-blue-400',
}

const LANG_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-400', 'bg-orange-400', 'bg-teal-500', 'bg-pink-400']

function StatCard({ icon, label, value, sub, color = 'text-primary-600' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} opacity-80`}>{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function BarChartRow({ label, value, max, color, right }: {
  label: string; value: number; max: number; color: string; right?: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-28 text-xs text-gray-600 truncate shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-500 w-12 text-right shrink-0">{right ?? value.toLocaleString()}</div>
    </div>
  )
}

export default function StatsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    retry: false,
  })

  if (!user) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="mb-3">통계를 보려면 로그인이 필요합니다.</p>
        <button onClick={() => navigate('/login')} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
          로그인
        </button>
      </div>
    )
  }

  if (isLoading) return <div className="text-center py-16 text-gray-400">불러오는 중...</div>
  if (isError) return <div className="text-center py-16 text-gray-400">통계 데이터를 불러올 수 없습니다. (권한이 필요합니다)</div>

  const { summary, daily_submissions, result_distribution, language_distribution, hot_problems, active_users } = data

  const maxDaily = Math.max(...daily_submissions.map((d: any) => d.submissions), 1)
  const maxResult = result_distribution[0]?.count ?? 1
  const maxLang = language_distribution[0]?.count ?? 1
  const maxHot = hot_problems[0]?.submit ?? 1

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <BarChart2 size={22} className="text-primary-600" />
        <h1 className="text-xl font-bold text-gray-800">통계 대시보드</h1>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="전체 사용자" value={summary.total_users} color="text-blue-500" />
        <StatCard icon={<BookOpen size={20} />} label="전체 문제" value={summary.total_problems} color="text-green-500" />
        <StatCard icon={<Send size={20} />} label="전체 제출" value={summary.total_submissions}
          sub={`오늘 ${summary.today_submissions}건`} color="text-orange-500" />
        <StatCard icon={<CheckCircle size={20} />} label="정답 수" value={summary.total_accepted}
          sub={`정답률 ${summary.accept_rate}%`} color="text-primary-600" />
      </div>

      {/* 7일 제출 추이 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-700">최근 7일 제출 현황</h2>
        </div>
        <div className="space-y-1">
          {daily_submissions.map((d: any) => (
            <div key={d.date} className="flex items-center gap-3 py-1">
              <div className="w-20 text-xs text-gray-500 shrink-0">
                {new Date(d.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                <div
                  className="bg-primary-200 h-5 rounded-full absolute"
                  style={{ width: `${Math.max(2, Math.round((d.submissions / maxDaily) * 100))}%` }}
                />
                <div
                  className="bg-green-400 h-5 rounded-full absolute"
                  style={{ width: `${Math.max(d.accepted > 0 ? 1 : 0, Math.round((d.accepted / maxDaily) * 100))}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 w-24 shrink-0 text-right">
                <span className="text-gray-700 font-medium">{d.submissions}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-green-600">{d.accepted} AC</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-200 inline-block" />전체 제출</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" />정답</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 결과 분포 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-700">결과 분포</h2>
          </div>
          <div>
            {result_distribution.map((r: any) => (
              <BarChartRow
                key={r.code}
                label={r.result}
                value={r.count}
                max={maxResult}
                color={RESULT_COLORS[r.result] ?? 'bg-gray-400'}
              />
            ))}
          </div>
        </div>

        {/* 언어 분포 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Code2 size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-700">언어 분포</h2>
          </div>
          <div>
            {language_distribution.map((l: any, i: number) => (
              <BarChartRow
                key={l.code}
                label={l.language}
                value={l.count}
                max={maxLang}
                color={LANG_COLORS[i % LANG_COLORS.length]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 인기 문제 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-700">인기 문제 TOP 10</h2>
          </div>
          <div className="space-y-2">
            {hot_problems.map((p: any, i: number) => (
              <div key={p.problem_id} className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-100 text-yellow-600' :
                  i === 1 ? 'bg-gray-100 text-gray-500' :
                  i === 2 ? 'bg-orange-100 text-orange-500' : 'text-gray-400'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <a href={`/problems/${p.problem_id}`} className="text-sm text-gray-700 hover:text-primary-600 truncate block">
                    {p.problem_id}. {p.title}
                  </a>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="bg-primary-400 h-1.5 rounded-full"
                      style={{ width: `${Math.max(2, Math.round((p.submit / maxHot) * 100))}%` }} />
                  </div>
                </div>
                <div className="text-xs text-gray-400 shrink-0 text-right">
                  <div>{p.submit} 제출</div>
                  <div className="text-green-600">{p.ac_rate}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 활발한 유저 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-700">최근 7일 활발한 유저</h2>
          </div>
          {active_users.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터가 없습니다</p>
          ) : (
            <div>
              {active_users.map((u: any, i: number) => (
                <BarChartRow
                  key={u.user_id}
                  label={u.user_id}
                  value={u.submissions}
                  max={active_users[0].submissions}
                  color={LANG_COLORS[i % LANG_COLORS.length]}
                  right={`${u.submissions}회`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
