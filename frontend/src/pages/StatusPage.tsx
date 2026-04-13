import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import SourceCodeModal from '../components/SourceCodeModal'
import { Filter, X } from 'lucide-react'

const RESULT_COLORS: Record<string, string> = {
  'Accepted':              'text-green-600 bg-green-50',
  'Wrong Answer':          'text-red-600 bg-red-50',
  'Presentation Error':    'text-orange-400 bg-orange-50',
  'Time Limit Exceeded':   'text-orange-600 bg-orange-50',
  'Memory Limit Exceeded': 'text-orange-600 bg-orange-50',
  'Output Limit Exceeded': 'text-orange-600 bg-orange-50',
  'Runtime Error':         'text-purple-600 bg-purple-50',
  'Compile Error':         'text-yellow-600 bg-yellow-50',
  'Judging':               'text-blue-600 bg-blue-50 animate-pulse',
  'Compiling':             'text-blue-500 bg-blue-50 animate-pulse',
  'Running':               'text-blue-500 bg-blue-50 animate-pulse',
  'Waiting':               'text-gray-500 bg-gray-50',
}

// result code → label
const RESULT_OPTIONS = [
  { value: 4,  label: 'Accepted' },
  { value: 6,  label: 'Wrong Answer' },
  { value: 7,  label: 'Time Limit Exceeded' },
  { value: 8,  label: 'Memory Limit Exceeded' },
  { value: 10, label: 'Runtime Error' },
  { value: 11, label: 'Compile Error' },
  { value: 5,  label: 'Presentation Error' },
]

export default function StatusPage() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('solution_id')
  const { user } = useAuthStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 필터 상태
  const [problemInput, setProblemInput] = useState('')
  const [problemFilter, setProblemFilter] = useState<number | null>(null)
  const [resultFilter, setResultFilter] = useState<number | null>(null)
  const [mineOnly, setMineOnly] = useState(false)

  const hasFilter = problemFilter !== null || resultFilter !== null || mineOnly

  const { data, isLoading } = useQuery({
    queryKey: ['solutions', problemFilter, resultFilter, mineOnly],
    queryFn: () =>
      api.get('/solutions', {
        params: {
          page_size: 50,
          problem_id: problemFilter || undefined,
          result: resultFilter ?? undefined,
          user_id: mineOnly && user ? user.user_id : undefined,
        },
      }).then((r) => r.data),
    refetchInterval: 3000,
  })

  const applyProblemFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(problemInput)
    setProblemFilter(isNaN(n) ? null : n)
  }

  const clearAll = () => {
    setProblemInput('')
    setProblemFilter(null)
    setResultFilter(null)
    setMineOnly(false)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">채점 현황</h1>
        </div>

        {/* ── 필터 ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* 문제 번호 */}
            <form onSubmit={applyProblemFilter} className="flex gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">문제 번호</label>
                <input
                  value={problemInput}
                  onChange={(e) => setProblemInput(e.target.value)}
                  placeholder="예: 1001"
                  className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button type="submit"
                className="self-end px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
                <Filter size={14} />
              </button>
            </form>

            {/* 결과 필터 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">결과</label>
              <select
                value={resultFilter ?? ''}
                onChange={(e) => setResultFilter(e.target.value === '' ? null : Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">전체</option>
                {RESULT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* 내 제출만 */}
            {user && (
              <label className="flex items-center gap-2 self-end pb-2 cursor-pointer select-none">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm text-gray-600">내 제출만</span>
              </label>
            )}

            {/* 초기화 */}
            {hasFilter && (
              <button onClick={clearAll}
                className="self-end pb-2 flex items-center gap-1 text-sm text-red-400 hover:text-red-500 transition-colors">
                <X size={14} /> 초기화
              </button>
            )}
          </div>

          {/* 활성 필터 표시 */}
          {hasFilter && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
              <span className="text-xs text-gray-400">적용 중:</span>
              {problemFilter && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  문제 #{problemFilter}
                  <button onClick={() => { setProblemFilter(null); setProblemInput('') }}><X size={10} /></button>
                </span>
              )}
              {resultFilter !== null && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {RESULT_OPTIONS.find((o) => o.value === resultFilter)?.label}
                  <button onClick={() => setResultFilter(null)}><X size={10} /></button>
                </span>
              )}
              {mineOnly && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  내 제출
                  <button onClick={() => setMineOnly(false)}><X size={10} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── 테이블 ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">사용자</th>
                <th className="px-4 py-3 text-left">문제</th>
                <th className="px-4 py-3 text-left">결과</th>
                <th className="px-4 py-3 text-right">시간</th>
                <th className="px-4 py-3 text-right">메모리</th>
                <th className="px-4 py-3 text-left">언어</th>
                <th className="px-4 py-3 text-left">제출 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td></tr>
              )}
              {!isLoading && !data?.solutions?.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">결과가 없습니다</td></tr>
              )}
              {data?.solutions?.map((s: any) => {
                const colorClass = RESULT_COLORS[s.result_label] || 'text-gray-600 bg-gray-50'
                const isHighlighted = String(s.solution_id) === highlightId
                const canView = user && (s.user_id === user.user_id || user.is_admin)
                return (
                  <tr key={s.solution_id}
                    className={`hover:bg-gray-50 transition-colors ${isHighlighted ? 'bg-blue-50 hover:bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400">
                      {canView ? (
                        <button onClick={() => setSelectedId(s.solution_id)}
                          className="hover:text-primary-600 hover:underline transition-colors font-mono">
                          {s.solution_id}
                        </button>
                      ) : (
                        <span className="font-mono">{s.solution_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{s.nick || s.user_id}</td>
                    <td className="px-4 py-3">
                      <Link to={`/problems/${s.problem_id}`} className="text-primary-600 hover:underline font-mono">
                        {s.problem_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {s.result_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                      {s.time > 0 ? `${s.time} ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                      {s.memory > 0 ? `${s.memory} KB` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.language_label}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(s.in_date).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <SourceCodeModal solutionId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  )
}
