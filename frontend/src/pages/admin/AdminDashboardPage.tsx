import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Users, BookOpen, Send, TrendingUp } from 'lucide-react'

const RESULT_COLORS: Record<number, string> = {
  4: 'text-green-600',
  6: 'text-red-500',
  7: 'text-orange-500',
  8: 'text-orange-500',
  10: 'text-red-400',
  11: 'text-yellow-600',
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    refetchInterval: 10000,
  })

  if (isLoading) return <div className="text-gray-400">불러오는 중...</div>

  const statCards = [
    { label: '전체 사용자', value: data.total_users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: '전체 문제', value: data.total_problems, icon: BookOpen, color: 'bg-purple-50 text-purple-600' },
    { label: '전체 제출', value: data.total_submissions, icon: Send, color: 'bg-gray-50 text-gray-600' },
    { label: '오늘 제출', value: data.today_submissions, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">대시보드</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">최근 제출</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-50">
              <th className="text-left px-5 py-2.5">ID</th>
              <th className="text-left px-3 py-2.5">사용자</th>
              <th className="text-left px-3 py-2.5">문제</th>
              <th className="text-left px-3 py-2.5">언어</th>
              <th className="text-left px-3 py-2.5">결과</th>
              <th className="text-left px-3 py-2.5">시간</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_submissions.map((s: any) => (
              <tr key={s.solution_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-2.5 text-gray-400">{s.solution_id}</td>
                <td className="px-3 py-2.5 font-medium text-gray-700">{s.user_id}</td>
                <td className="px-3 py-2.5 text-gray-600">P{s.problem_id}</td>
                <td className="px-3 py-2.5 text-gray-500">{s.language}</td>
                <td className={`px-3 py-2.5 font-medium ${RESULT_COLORS[s.result_code] ?? 'text-gray-600'}`}>
                  {s.result}
                </td>
                <td className="px-3 py-2.5 text-gray-400 text-xs">
                  {s.in_date ? new Date(s.in_date).toLocaleTimeString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
