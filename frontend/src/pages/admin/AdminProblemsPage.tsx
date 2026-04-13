import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Pencil, Trash2, Plus, Search, Upload, Download } from 'lucide-react'

export default function AdminProblemsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [importResult, setImportResult] = useState<{ imported: number; problems: any[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-problems', page, search],
    queryFn: () =>
      api.get('/admin/problems', { params: { page, page_size: 20, search: search || undefined } }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, permanent }: { id: number; permanent: boolean }) =>
      api.delete(`/problems/${id}`, { params: { permanent } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-problems'] }),
  })

  const handleExport = async (problemId: number, title: string) => {
    const res = await api.get(`/admin/problems/${problemId}/export`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `problem_${problemId}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/admin/problems/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res.data)
      qc.invalidateQueries({ queryKey: ['admin-problems'] })
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? 'XML 가져오기 실패')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">문제 관리</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-50"
          >
            <Upload size={15} />
            {importing ? '가져오는 중...' : 'XML 가져오기'}
          </button>
          <Link
            to="/problems/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={15} />
            문제 등록
          </Link>
        </div>
      </div>

      {/* 가져오기 결과 */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
          <div className="font-semibold text-green-700 mb-2">
            총 {importResult.imported}개 문제를 성공적으로 가져왔습니다.
          </div>
          <div className="space-y-1">
            {importResult.problems.map((p: any) => (
              <div key={p.problem_id} className="text-green-600">
                #{p.problem_id} {p.title}
                {p.test_count > 0 && <span className="text-gray-500 ml-2">(테스트 케이스 {p.test_count}개)</span>}
              </div>
            ))}
          </div>
          <button onClick={() => setImportResult(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
            닫기
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="문제 ID 또는 제목 검색"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button type="submit" className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Search size={16} className="text-gray-500" />
        </button>
      </form>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-3 py-3">제목</th>
                <th className="text-right px-3 py-3">제출</th>
                <th className="text-right px-3 py-3">정답</th>
                <th className="text-right px-3 py-3">정답률</th>
                <th className="text-center px-3 py-3">상태</th>
                <th className="text-center px-5 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {data?.problems.map((p: any) => (
                <tr key={p.problem_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400">{p.problem_id}</td>
                  <td className="px-3 py-3 font-medium text-gray-700">{p.title}</td>
                  <td className="px-3 py-3 text-right text-gray-500">{p.submit}</td>
                  <td className="px-3 py-3 text-right text-green-600">{p.accepted}</td>
                  <td className="px-3 py-3 text-right text-gray-500">
                    {p.submit > 0 ? `${Math.round((p.accepted / p.submit) * 100)}%` : '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.defunct === 'N' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {p.defunct === 'N' ? '공개' : '숨김'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/problems/${p.problem_id}/edit`}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="수정"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => handleExport(p.problem_id, p.title)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        title="XML 내보내기"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${p.title}" 문제를 숨김 처리하시겠습니까?\n(완전 삭제는 🗑 버튼을 사용하세요)`)) {
                            deleteMutation.mutate({ id: p.problem_id, permanent: false })
                          }
                        }}
                        className="p-1.5 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors"
                        title="숨김 처리"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${p.title}" 문제를 완전히 삭제하시겠습니까?\n\n⚠️ 테스트 케이스 파일까지 영구 삭제되며 복구할 수 없습니다.`)) {
                            deleteMutation.mutate({ id: p.problem_id, permanent: true })
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="완전 삭제"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
