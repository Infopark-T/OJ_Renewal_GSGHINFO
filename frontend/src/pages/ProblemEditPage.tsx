import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { DifficultyPicker } from '../components/DifficultyBadge'
import RichEditor from '../components/RichEditor'

interface TestCase {
  input: string
  output: string
}

export default function ProblemEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => api.get(`/problems/${id}`).then((r) => r.data),
  })

  const { data: tcData } = useQuery({
    queryKey: ['problem-testcases', id],
    queryFn: () => api.get(`/problems/${id}/testcases`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then((r) => r.data),
  })
  const tags: any[] = tagsData ?? []

  const [form, setForm] = useState({
    title: '',
    description: '',
    input: '',
    output: '',
    sample_input: '',
    sample_output: '',
    hint: '',
    source: '',
    time_limit: '1',
    memory_limit: '128',
  })
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '' }])
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])

  useEffect(() => {
    if (problem) {
      setForm({
        title: problem.title ?? '',
        description: problem.description ?? '',
        input: problem.input ?? '',
        output: problem.output ?? '',
        sample_input: problem.sample_input ?? '',
        sample_output: problem.sample_output ?? '',
        hint: problem.hint ?? '',
        source: problem.source ?? '',
        time_limit: String(problem.time_limit ?? '1'),
        memory_limit: String(problem.memory_limit ?? '128'),
      })
      setDifficulty(problem.difficulty ?? null)
      setSelectedTagIds(problem.tags?.map((t: any) => t.id) ?? [])
    }
  }, [problem])

  useEffect(() => {
    if (tcData?.test_cases?.length > 0) {
      setTestCases(tcData.test_cases)
    }
  }, [tcData])

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/problems/${id}`, {
        ...form,
        time_limit: parseFloat(form.time_limit),
        memory_limit: parseInt(form.memory_limit),
        difficulty,
        tag_ids: selectedTagIds,
        test_cases: testCases.filter((tc) => tc.input.trim() || tc.output.trim()),
      }).then((r) => r.data),
    onSuccess: () => navigate(`/problems/${id}`),
  })

  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const updateTestCase = (idx: number, field: 'input' | 'output', value: string) =>
    setTestCases((prev) => prev.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc))

  const addTestCase = () => setTestCases((prev) => [...prev, { input: '', output: '' }])
  const removeTestCase = (idx: number) => setTestCases((prev) => prev.filter((_, i) => i !== idx))

  if (isLoading) return <div className="text-center py-16 text-gray-400">불러오는 중...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Edit className="text-primary-600" size={22} />
        <h1 className="text-2xl font-bold text-gray-800">문제 수정 — {id}번</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={update('title')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시간 제한 (초)</label>
            <input type="number" value={form.time_limit} onChange={update('time_limit')} step="0.5" min="0.5"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모리 제한 (MB)</label>
            <input type="number" value={form.memory_limit} onChange={update('memory_limit')} min="16"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">출처</label>
            <input type="text" value={form.source} onChange={update('source')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        {/* 난이도 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">난이도</label>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </div>

        {/* 태그 */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t: any) => (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    selectedTagIds.includes(t.id)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {[
          { field: 'description', label: '문제 설명', required: true },
          { field: 'input', label: '입력 설명', required: false },
          { field: 'output', label: '출력 설명', required: false },
        ].map(({ field, label, required }) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <RichEditor
              value={(form as any)[field]}
              onChange={(html) => setForm((f) => ({ ...f, [field]: html }))}
              placeholder={`${label}을 입력하세요`}
              minHeight="160px"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          {[
            { field: 'sample_input', label: '예제 입력 (화면 표시용)' },
            { field: 'sample_output', label: '예제 출력 (화면 표시용)' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <textarea value={(form as any)[field]} onChange={update(field)} rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y" />
            </div>
          ))}
        </div>

        {/* 채점용 테스트케이스 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-medium text-gray-700">채점용 테스트케이스</label>
              <p className="text-xs text-gray-400 mt-0.5">기존 테스트케이스를 불러왔습니다. 수정 후 저장하세요.</p>
            </div>
            <button type="button" onClick={addTestCase}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Plus size={14} /> 케이스 추가
            </button>
          </div>
          <div className="space-y-3">
            {testCases.map((tc, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">테스트케이스 {idx + 1}</span>
                  {testCases.length > 1 && (
                    <button type="button" onClick={() => removeTestCase(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['input', 'output'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1">{field === 'input' ? '입력' : '출력'}</label>
                      <textarea value={tc[field]} onChange={(e) => updateTestCase(idx, field, e.target.value)} rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">힌트</label>
          <RichEditor
            value={form.hint}
            onChange={(html) => setForm((f) => ({ ...f, hint: html }))}
            placeholder="힌트를 입력하세요 (선택사항)"
            minHeight="120px"
          />
        </div>

        {mutation.isError && (
          <p className="text-red-500 text-sm">
            {(mutation.error as any)?.response?.data?.detail ?? '수정 중 오류가 발생했습니다.'}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            <Edit size={16} />
            {mutation.isPending ? '저장 중...' : '저장하기'}
          </button>
          <button onClick={() => navigate(`/problems/${id}`)}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
