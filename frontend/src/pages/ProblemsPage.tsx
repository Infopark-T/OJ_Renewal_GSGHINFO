import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Search, CheckCircle2, Clock, Cpu, PlusCircle, Tag, X } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { DifficultyBadge } from '../components/DifficultyBadge'

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '브론즈', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  2: { label: '실버',   color: 'bg-slate-50 text-slate-600 border-slate-200' },
  3: { label: '골드',   color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  4: { label: '플래티넘', color: 'bg-teal-50 text-teal-600 border-teal-200' },
  5: { label: '다이아', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
}

export default function ProblemsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [tagSlug, setTagSlug] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const { user } = useAuthStore()

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then((r) => r.data),
  })
  const tags: any[] = tagsData ?? []

  const { data: categoriesData } = useQuery({
    queryKey: ['problem-categories'],
    queryFn: () => api.get('/problems/categories').then((r) => r.data),
  })
  const categories: string[] = categoriesData?.categories ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['problems', page, search, difficulty, tagSlug, category],
    queryFn: () =>
      api.get('/problems', {
        params: {
          page,
          page_size: 20,
          search: search || undefined,
          difficulty: difficulty || undefined,
          tag_slug: tagSlug || undefined,
          category: category || undefined,
        },
      }).then((r) => r.data),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const setFilter = (key: 'difficulty' | 'tag' | 'category', value: any) => {
    setPage(1)
    if (key === 'difficulty') setDifficulty(difficulty === value ? null : value)
    if (key === 'tag') setTagSlug(tagSlug === value ? null : value)
    if (key === 'category') setCategory(category === value ? null : value)
  }

  const hasFilter = difficulty !== null || tagSlug !== null || search !== '' || category !== null

  return (
    <div className="space-y-4">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">문제 목록</h1>
        <div className="flex items-center gap-3">
          {(user?.is_admin || user?.is_teacher) && (
            <Link to="/problems/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
              <PlusCircle size={15} /> 문제 등록
            </Link>
          )}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="문제 검색..."
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48" />
            <button type="submit" className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* ── 필터 영역 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* 난이도 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium w-12 shrink-0">난이도</span>
          {[1, 2, 3, 4, 5].map((d) => {
            const { label, color } = DIFFICULTY_LABELS[d]
            const active = difficulty === d
            return (
              <button key={d} onClick={() => setFilter('difficulty', d)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  active ? `${color} font-bold ring-1 ring-current` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                {'★'.repeat(d)} {label}
              </button>
            )
          })}
        </div>

        {/* 카테고리 필터 */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium w-12 shrink-0">출처</span>
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter('category', c)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  category === c
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* 태그 필터 */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium w-12 shrink-0">태그</span>
            {tags.map((t: any) => (
              <button key={t.slug} onClick={() => setFilter('tag', t.slug)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  tagSlug === t.slug
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* 활성 필터 초기화 */}
        {hasFilter && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
            <span className="text-xs text-gray-400">적용 중:</span>
            {search && (
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                "{search}" <button onClick={() => { setSearch(''); setSearchInput('') }}><X size={10} /></button>
              </span>
            )}
            {difficulty && (
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {DIFFICULTY_LABELS[difficulty].label} <button onClick={() => setDifficulty(null)}><X size={10} /></button>
              </span>
            )}
            {category && (
              <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                {category} <button onClick={() => setCategory(null)}><X size={10} /></button>
              </span>
            )}
            {tagSlug && (
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                #{tagSlug} <button onClick={() => setTagSlug(null)}><X size={10} /></button>
              </span>
            )}
            <button onClick={() => { setSearch(''); setSearchInput(''); setDifficulty(null); setTagSlug(null); setCategory(null); setPage(1) }}
              className="text-xs text-red-400 hover:text-red-500 ml-1">
              전체 초기화
            </button>
          </div>
        )}
      </div>

      {/* ── 문제 테이블 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left w-16">#</th>
              <th className="px-4 py-3 text-left">제목</th>
              <th className="px-4 py-3 text-left w-24">난이도</th>
              <th className="px-4 py-3 text-right w-24">
                <Clock size={13} className="inline mr-1" />제한
              </th>
              <th className="px-4 py-3 text-right w-24">
                <Cpu size={13} className="inline mr-1" />메모리
              </th>
              <th className="px-4 py-3 text-right w-24">제출</th>
              <th className="px-4 py-3 text-right w-24">정답률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td></tr>
            )}
            {!isLoading && !data?.problems?.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">문제가 없습니다</td></tr>
            )}
            {data?.problems?.map((p: any) => (
              <tr key={p.problem_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">
                  <div className="flex items-center gap-2">
                    {p.solved_by_me
                      ? <CheckCircle2 size={14} className="text-green-500" />
                      : <span className="w-[14px]" />}
                    {p.problem_id}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/problems/${p.problem_id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                      {p.title}
                    </Link>
                    {p.source && (
                      <button onClick={() => setFilter('category', p.source)}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                          category === p.source
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-purple-50 hover:text-purple-600'
                        }`}>
                        {p.source}
                      </button>
                    )}
                    {p.tags?.map((t: any) => (
                      <button key={t.slug} onClick={() => setFilter('tag', t.slug)}
                        className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                        {t.name}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <DifficultyBadge level={p.difficulty} />
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{p.time_limit}s</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.memory_limit}MB</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.submit}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${p.submit > 0 && p.accepted / p.submit >= 0.5 ? 'text-green-600' : 'text-orange-500'}`}>
                    {p.submit > 0 ? `${Math.round((p.accepted / p.submit) * 100)}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 페이지네이션 ── */}
      {data && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>전체 {data.total}문제</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              이전
            </button>
            <span className="px-3 py-1.5">{page} / {Math.max(1, Math.ceil(data.total / 20))}</span>
            <button disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
