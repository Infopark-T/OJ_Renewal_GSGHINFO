import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Medal, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-lg">{MEDAL[rank]}</span>
  return <span className="text-sm font-bold text-gray-500">{rank}</span>
}

// ─── 전체 랭킹 ───────────────────────────────────────────────────────────────
function GlobalRanking({ myUserId }: { myUserId?: string }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['ranking', page, search],
    queryFn: () =>
      api.get('/ranking', { params: { page, page_size: PAGE_SIZE, search: search || undefined } })
        .then((r) => r.data),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="아이디 또는 이름 검색"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          검색
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
            초기화
          </button>
        )}
      </form>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : !data?.rows.length ? (
          <div className="py-12 text-center text-gray-400 text-sm">결과가 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                <th className="text-center px-5 py-3 w-14">순위</th>
                <th className="text-left px-3 py-3">아이디</th>
                <th className="text-left px-3 py-3">이름</th>
                <th className="text-left px-3 py-3">학교</th>
                <th className="text-right px-5 py-3">해결</th>
                <th className="text-right px-5 py-3">제출</th>
                <th className="text-right px-5 py-3">정답률</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row: any) => (
                <tr
                  key={row.user_id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    row.user_id === myUserId ? 'bg-blue-50 hover:bg-blue-50' : ''
                  }`}
                >
                  <td className="text-center px-5 py-3">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs">
                    {row.user_id}
                    {row.user_id === myUserId && (
                      <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-sans">나</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-700">{row.nick}</td>
                  <td className="px-3 py-3 text-gray-500">{row.school || '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-green-600">{row.solved}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{row.submit}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{row.ratio}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number
              if (totalPages <= 7) p = i + 1
              else if (page <= 4) p = i + 1
              else if (page >= totalPages - 3) p = totalPages - 6 + i
              else p = page - 3 + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm rounded-lg transition-colors ${
                    page === p
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {data && (
        <p className="text-center text-xs text-gray-400">전체 {data.total.toLocaleString()}명</p>
      )}
    </div>
  )
}

// ─── 학급 랭킹 ───────────────────────────────────────────────────────────────
function ClassRanking({ myUserId }: { myUserId?: string }) {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)

  const { data: myClasses, isLoading: classesLoading } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => api.get('/classes/mine').then((r) => r.data),
  })

  const { data: rankData, isLoading: rankLoading } = useQuery({
    queryKey: ['class-ranking', selectedClassId],
    queryFn: () => api.get(`/ranking/class/${selectedClassId}`).then((r) => r.data),
    enabled: selectedClassId !== null,
  })

  if (classesLoading) return <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>

  if (!myClasses?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
        참여 중인 학급이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 학급 선택 */}
      <div className="flex flex-wrap gap-2">
        {myClasses.map((cls: any) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedClassId === cls.id
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users size={13} />
            {cls.name}
          </button>
        ))}
      </div>

      {/* 랭킹 테이블 */}
      {!selectedClassId ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
          학급을 선택하세요
        </div>
      ) : rankLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">{rankData?.class_name} 랭킹</h3>
          </div>
          {!rankData?.rows.length ? (
            <div className="py-8 text-center text-gray-400 text-sm">학급 멤버가 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                  <th className="text-center px-5 py-3 w-14">순위</th>
                  <th className="text-left px-3 py-3">학번</th>
                  <th className="text-left px-3 py-3">이름</th>
                  <th className="text-right px-5 py-3">해결</th>
                  <th className="text-right px-5 py-3">제출</th>
                  <th className="text-right px-5 py-3">정답률</th>
                </tr>
              </thead>
              <tbody>
                {rankData.rows.map((row: any) => (
                  <tr
                    key={row.user_id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      row.user_id === myUserId ? 'bg-blue-50 hover:bg-blue-50' : ''
                    }`}
                  >
                    <td className="text-center px-5 py-3">
                      <RankBadge rank={row.rank} />
                    </td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs">
                      {row.role === 'teacher' ? (
                        <span className="text-purple-600 font-sans font-medium">교사</span>
                      ) : (
                        `${row.grade ?? '-'}학년 ${row.class_num ?? '-'}반 ${row.student_num ?? '-'}번`
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-700">
                      {row.nick}
                      {row.user_id === myUserId && (
                        <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">나</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-green-600">{row.solved}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{row.submit}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{row.ratio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function RankingPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'global' | 'class'>('global')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Medal size={22} className="text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-800">랭킹</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'global', label: '전체 랭킹' },
          { key: 'class',  label: '학급 랭킹' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'global' && <GlobalRanking myUserId={user?.user_id} />}
      {activeTab === 'class' && (
        user ? (
          <ClassRanking myUserId={user.user_id} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
            학급 랭킹을 보려면 로그인하세요
          </div>
        )
      )}
    </div>
  )
}
