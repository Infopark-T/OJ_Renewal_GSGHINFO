import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

const RESULT_COLORS: Record<number, string> = {
  4: 'text-green-600',
  6: 'text-red-500',
  7: 'text-orange-500',
  8: 'text-orange-500',
  9: 'text-orange-400',
  10: 'text-red-400',
  11: 'text-yellow-600',
}

const RESULTS = [
  { value: '', label: '전체' },
  { value: '4', label: 'Accepted' },
  { value: '6', label: 'Wrong Answer' },
  { value: '7', label: 'Time Limit' },
  { value: '8', label: 'Memory Limit' },
  { value: '10', label: 'Runtime Error' },
  { value: '11', label: 'Compile Error' },
]

export default function AdminSubmissionsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ user_id: '', problem_id: '', result: '', language: '' })
  const [applied, setApplied] = useState({ user_id: '', problem_id: '', result: '', language: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-submissions', page, applied],
    queryFn: () =>
      api.get('/admin/submissions', {
        params: {
          page,
          page_size: 30,
          user_id: applied.user_id || undefined,
          problem_id: applied.problem_id ? Number(applied.problem_id) : undefined,
          result: applied.result !== '' ? Number(applied.result) : undefined,
          language: applied.language !== '' ? Number(applied.language) : undefined,
        },
      }).then((r) => r.data),
    refetchInterval: 5000,
  })

  const handleApply = () => {
    setApplied({ ...filters })
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / 30) : 1

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">제출 현황</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={filters.user_id}
          onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
          placeholder="사용자 ID"
          className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          value={filters.problem_id}
          onChange={(e) => setFilters((f) => ({ ...f, problem_id: e.target.value }))}
          placeholder="문제 번호"
          type="number"
          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={filters.result}
          onChange={(e) => setFilters((f) => ({ ...f, result: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {RESULTS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          필터 적용
        </button>
        <button
          onClick={() => { setFilters({ user_id: '', problem_id: '', result: '', language: '' }); setApplied({ user_id: '', problem_id: '', result: '', language: '' }); setPage(1) }}
          className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          초기화
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-3 py-3">사용자</th>
                <th className="text-left px-3 py-3">문제</th>
                <th className="text-left px-3 py-3">언어</th>
                <th className="text-left px-3 py-3">결과</th>
                <th className="text-right px-3 py-3">시간(ms)</th>
                <th className="text-right px-3 py-3">메모리(KB)</th>
                <th className="text-right px-5 py-3">제출시간</th>
              </tr>
            </thead>
            <tbody>
              {data?.submissions.map((s: any) => (
                <tr key={s.solution_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-gray-400">{s.solution_id}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-700">{s.user_id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.problem_id}</td>
                  <td className="px-3 py-2.5 text-gray-500">{s.language}</td>
                  <td className={`px-3 py-2.5 font-medium ${RESULT_COLORS[s.result_code] ?? 'text-gray-600'}`}>
                    {s.result}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{s.time ?? '-'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{s.memory ?? '-'}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400 text-xs">
                    {s.in_date ? new Date(s.in_date).toLocaleString('ko-KR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">총 {data?.total}개</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              이전
            </button>
            <span className="px-3 py-1.5 text-gray-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
