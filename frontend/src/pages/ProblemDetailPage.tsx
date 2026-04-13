import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Clock, Cpu, Send, Pencil, CheckCircle, BarChart2, MessageSquare, Reply, Trash2, ChevronLeft, ChevronRight, RotateCcw, ListOrdered, ExternalLink, Loader2, ALargeSmall, Play, Terminal } from 'lucide-react'
import CodeEditor from '../components/CodeEditor'
import { DifficultyBadge } from '../components/DifficultyBadge'

const RESULT_STYLE: Record<number, { label: string; bg: string; text: string }> = {
  4:  { label: 'Accepted',              bg: 'bg-green-50',  text: 'text-green-700' },
  6:  { label: 'Wrong Answer',          bg: 'bg-red-50',    text: 'text-red-700'   },
  7:  { label: 'Time Limit Exceeded',   bg: 'bg-orange-50', text: 'text-orange-700'},
  8:  { label: 'Memory Limit Exceeded', bg: 'bg-yellow-50', text: 'text-yellow-700'},
  10: { label: 'Runtime Error',         bg: 'bg-purple-50', text: 'text-purple-700'},
  11: { label: 'Compile Error',         bg: 'bg-gray-100',  text: 'text-gray-700'  },
  5:  { label: 'Presentation Error',    bg: 'bg-blue-50',   text: 'text-blue-700'  },
}
const JUDGING_RESULTS = new Set([0, 1, 2, 3])  // Waiting, Judging, Compiling, Running

// ─── 댓글 섹션 컴포넌트 ───────────────────────────────────────────────────────
function CommentsSection({ problemId, user }: { problemId: string; user: any }) {
  const qc = useQueryClient()
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; nick: string } | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['comments', problemId],
    queryFn: () => api.get(`/problems/${problemId}/comments`).then((r) => r.data),
  })

  const postMutation = useMutation({
    mutationFn: (body: any) => api.post(`/problems/${problemId}/comments`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', problemId] })
      setContent('')
      setReplyTo(null)
      setReplyContent('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (cid: number) => api.delete(`/problems/${problemId}/comments/${cid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', problemId] }),
  })

  const comments = data?.comments ?? []
  const total = data?.total ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-400" />
        <h2 className="font-semibold text-gray-700">질문 및 댓글</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{total}</span>
      </div>

      {/* 댓글 목록 */}
      <div className="divide-y divide-gray-50">
        {isLoading && <div className="py-6 text-center text-gray-400 text-sm">불러오는 중...</div>}
        {!isLoading && comments.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">첫 번째 댓글을 작성해보세요!</div>
        )}
        {comments.map((c: any) => (
          <div key={c.id} className="px-5 py-4">
            {/* 루트 댓글 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
                {c.nick?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-700">{c.nick}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  {user && (
                    <button onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, nick: c.nick })}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors">
                      <Reply size={12} /> 답글
                    </button>
                  )}
                  {user && (c.user_id === user.user_id || user.is_admin) && (
                    <button onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(c.id) }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={12} /> 삭제
                    </button>
                  )}
                </div>

                {/* 답글 입력창 */}
                {replyTo?.id === c.id && (
                  <div className="mt-3 flex gap-2">
                    <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`@${c.nick}에게 답글 달기`} rows={2}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => postMutation.mutate({ content: replyContent, parent_id: c.id })}
                        disabled={!replyContent.trim() || postMutation.isPending}
                        className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                        등록
                      </button>
                      <button onClick={() => setReplyTo(null)}
                        className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg hover:bg-gray-50 transition-colors">
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* 대댓글 */}
                {c.replies?.length > 0 && (
                  <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
                    {c.replies.map((r: any) => (
                      <div key={r.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold shrink-0">
                          {r.nick?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-gray-700">{r.nick}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                          {user && (r.user_id === user.user_id || user.is_admin) && (
                            <button onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(r.id) }}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors mt-1">
                              <Trash2 size={11} /> 삭제
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 댓글 작성 */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
        {user ? (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user.nick?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="질문이나 의견을 남겨보세요" rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white" />
              <button onClick={() => postMutation.mutate({ content })}
                disabled={!content.trim() || postMutation.isPending}
                className="self-end px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {postMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center">
            댓글을 작성하려면 <a href="/login" className="text-primary-600 hover:underline">로그인</a>이 필요합니다.
          </p>
        )}
      </div>
    </div>
  )
}

const LANGUAGES = [
  { value: 6,  label: 'Python' },
  { value: 0,  label: 'C' },
  { value: 1,  label: 'C++' },
  { value: 3,  label: 'Java' },
  { value: 16, label: 'JavaScript' },
]

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [language, setLanguage] = useState(6)
  const [code, setCode] = useState('')
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('editor-font-size')
    return saved ? Number(saved) : 20
  })
  const [solutionId, setSolutionId] = useState<number | null>(null)
  const [judgeResult, setJudgeResult] = useState<any>(null)
  const [pollStatus, setPollStatus] = useState<string>('')
  const [stdin, setStdin] = useState('')
  const [runResult, setRunResult] = useState<{ stdout: string; stderr: string; exit_code: number; compile_stderr: string } | null>(null)

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => api.get(`/problems/${id}`).then((r) => r.data),
  })

  const { data: adjacent } = useQuery({
    queryKey: ['adjacent', id],
    queryFn: () => api.get(`/problems/${id}/adjacent`).then((r) => r.data),
    enabled: !!id,
  })

  // 채점 결과 폴링 (useEffect + setInterval)
  useEffect(() => {
    if (!solutionId || judgeResult) return
    const STATUS_LABELS: Record<number, string> = { 0: '대기 중', 1: '채점 중', 2: '컴파일 중', 3: '실행 중' }
    let cancelled = false

    const poll = async () => {
      try {
        const res = await api.get(`/solutions/${solutionId}`)
        if (cancelled) return
        const data = res.data
        setPollStatus(STATUS_LABELS[data.result] ?? '')
        if (!JUDGING_RESULTS.has(data.result)) {
          setJudgeResult(data)
        }
      } catch {}
    }

    poll()
    const timer = setInterval(poll, 1500)
    return () => { cancelled = true; clearInterval(timer) }
  }, [solutionId, judgeResult])

  // 문제가 바뀌면 결과 초기화
  useEffect(() => {
    setSolutionId(null)
    setJudgeResult(null)
    setPollStatus('')
    setCode('')
    setRunResult(null)
    setStdin('')
  }, [id])

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/solutions/submit', {
        problem_id: Number(id),
        language,
        source_code: code,
      }),
    onSuccess: (res) => {
      setSolutionId(res.data.solution_id)
      setJudgeResult(null)
    },
  })

  const runMutation = useMutation({
    mutationFn: () =>
      api.post('/run', { language, source_code: code, stdin }),
    onSuccess: (res) => setRunResult(res.data),
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">불러오는 중...</div>
  if (!problem) return <div className="text-center py-16 text-gray-400">문제를 찾을 수 없습니다</div>

  const isJudging = solutionId !== null && judgeResult === null
  const resultStyle = judgeResult ? (RESULT_STYLE[judgeResult.result] ?? { label: judgeResult.result_label, bg: 'bg-gray-50', text: 'text-gray-700' }) : null

  return (
    <div className="space-y-5">
      {/* 이전/다음 문제 네비게이션 */}
      <div className="flex items-center justify-between">
        <div>
          {adjacent?.prev ? (
            <Link to={`/problems/${adjacent.prev.problem_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
              <ChevronLeft size={16} />
              <span className="hidden sm:inline truncate max-w-[160px]">{adjacent.prev.problem_id}. {adjacent.prev.title}</span>
              <span className="sm:hidden">이전</span>
            </Link>
          ) : <div />}
        </div>
        <Link to="/problems" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <ListOrdered size={14} /> 문제 목록
        </Link>
        <div>
          {adjacent?.next ? (
            <Link to={`/problems/${adjacent.next.problem_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
              <span className="hidden sm:inline truncate max-w-[160px]">{adjacent.next.problem_id}. {adjacent.next.title}</span>
              <span className="sm:hidden">다음</span>
              <ChevronRight size={16} />
            </Link>
          ) : <div />}
        </div>
      </div>

      {/* ── 스플릿 레이아웃: xl(1280px+)에서 좌우 2단 분할 ── */}
      <div className="xl:grid xl:grid-cols-2 xl:gap-5 xl:items-start space-y-5 xl:space-y-0">

      {/* 좌: 문제 설명 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {problem.problem_id}. {problem.title}
          </h1>
          <div className="flex items-center gap-3">
            {(user?.is_admin || user?.is_teacher) && (
              <Link
                to={`/problems/${id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
              >
                <Pencil size={14} />
                수정
              </Link>
            )}
            <div className="flex gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {problem.time_limit}초
              </span>
              <span className="flex items-center gap-1">
                <Cpu size={14} />
                {problem.memory_limit}MB
              </span>
              <span className="flex items-center gap-1">
                <BarChart2 size={14} />
                제출 {problem.submit}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} />
                정답 {problem.accepted}
                {problem.submit > 0 && (
                  <span className="text-gray-400 ml-0.5">
                    ({Math.round((problem.accepted / problem.submit) * 100)}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 난이도 + 태그 */}
        {(problem.difficulty || problem.tags?.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <DifficultyBadge level={problem.difficulty} />
            {problem.tags?.map((t: any) => (
              <span key={t.slug} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="prose max-w-none space-y-4 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-gray-800 text-base mb-2">문제</h3>
            <div dangerouslySetInnerHTML={{ __html: problem.description || '' }} />
          </section>
          {problem.input && (
            <section>
              <h3 className="font-semibold text-gray-800 text-base mb-2">입력</h3>
              <div dangerouslySetInnerHTML={{ __html: problem.input }} />
            </section>
          )}
          {problem.output && (
            <section>
              <h3 className="font-semibold text-gray-800 text-base mb-2">출력</h3>
              <div dangerouslySetInnerHTML={{ __html: problem.output }} />
            </section>
          )}
          {(problem.sample_input || problem.sample_output) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-base mb-2">예제 입력</h3>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto border border-gray-100">
                  {problem.sample_input}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-base mb-2">예제 출력</h3>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto border border-gray-100">
                  {problem.sample_output}
                </pre>
              </div>
            </div>
          )}
          {problem.hint && (
            <section>
              <h3 className="font-semibold text-gray-800 text-base mb-2">힌트</h3>
              <div dangerouslySetInnerHTML={{ __html: problem.hint }} />
            </section>
          )}
        </div>
      </div>
      {/* 좌측 끝 */}

      {/* 우: 에디터 + 제출 — xl에서 sticky로 고정 */}
      <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:rounded-xl">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">코드 제출</h2>
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* 언어 토글 */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLanguage(l.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      language === l.value
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* 글자 크기 조절 */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <ALargeSmall size={15} className="text-gray-400 shrink-0" />
                {[16, 18, 20, 22, 24].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setFontSize(size)
                      localStorage.setItem('editor-font-size', String(size))
                    }}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      fontSize === size
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              fontSize={fontSize}
            />

            {/* ── 테스트 실행 패널 ─────────────────────────── */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Terminal size={14} />
                  테스트 실행
                </div>
                <button
                  onClick={() => { runMutation.mutate(); setRunResult(null) }}
                  disabled={!code.trim() || runMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {runMutation.isPending
                    ? <><Loader2 size={13} className="animate-spin" /> 실행 중...</>
                    : <><Play size={13} /> 실행</>}
                </button>
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {/* stdin */}
                <div className="p-3">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">표준 입력 (stdin)</p>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="입력값을 여기에 작성하세요&#10;예: 1 2"
                    rows={5}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y bg-white"
                  />
                </div>

                {/* stdout / stderr */}
                <div className="p-3">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">실행 결과</p>
                  {runMutation.isError && (
                    <div className="h-[calc(5*1.5rem+1rem)] flex items-center justify-center text-xs text-red-500 bg-red-50 rounded-lg px-3">
                      {(runMutation.error as any)?.response?.data?.detail ?? '실행 오류가 발생했습니다.'}
                    </div>
                  )}
                  {!runMutation.isError && (
                    <pre className={`h-[calc(5*1.5rem+1rem)] overflow-auto text-xs font-mono rounded-lg p-2.5 whitespace-pre-wrap ${
                      runResult
                        ? runResult.stderr || runResult.compile_stderr
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-900 text-green-400'
                        : 'bg-gray-50 text-gray-400'
                    }`}>
                      {runMutation.isPending
                        ? '실행 중...'
                        : runResult
                          ? (runResult.compile_stderr || runResult.stderr
                              ? (runResult.compile_stderr || '') + (runResult.stderr || '')
                              : runResult.stdout || '(출력 없음)')
                          : '▶ 실행 버튼을 눌러 코드를 실행하세요'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
            {/* ──────────────────────────────────────────────── */}

            <div className="flex items-center gap-3">
              <button
                onClick={() => submitMutation.mutate()}
                disabled={!code.trim() || submitMutation.isPending || isJudging}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Send size={16} />
                {submitMutation.isPending ? '제출 중...' : '제출하기'}
              </button>
            </div>
            {submitMutation.isError && (
              <p className="text-red-500 text-sm">제출 중 오류가 발생했습니다.</p>
            )}

            {/* 채점 중 */}
            {isJudging && (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Loader2 size={18} className="text-blue-500 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-700">채점 중...</p>
                  <p className="text-xs text-blue-500">{pollStatus || '제출 완료'}</p>
                </div>
              </div>
            )}

            {/* 채점 결과 */}
            {judgeResult && resultStyle && (
              <div className={`rounded-xl border px-5 py-4 ${judgeResult.result === 4 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {judgeResult.result === 4
                      ? <CheckCircle size={20} className="text-green-600" />
                      : <span className="text-lg">✗</span>}
                    <span className={`text-base font-bold ${resultStyle.text}`}>
                      {resultStyle.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setJudgeResult(null); setSolutionId(null) }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white transition-colors"
                      title="결과 닫기 / 다시 제출"
                    >
                      <RotateCcw size={13} /> 다시 시도
                    </button>
                    <Link to={`/status?solution_id=${judgeResult.solution_id}`}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 px-2 py-1 rounded hover:bg-white transition-colors">
                      <ExternalLink size={13} /> 상세 보기
                    </Link>
                  </div>
                </div>
                <div className="flex gap-6 text-xs text-gray-500">
                  {judgeResult.time > 0 && <span><Clock size={11} className="inline mr-1" />{judgeResult.time}ms</span>}
                  {judgeResult.memory > 0 && <span><Cpu size={11} className="inline mr-1" />{judgeResult.memory}KB</span>}
                </div>
                {judgeResult.result === 4 && adjacent?.next && (
                  <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium">정답입니다! 다음 문제로 이동할까요?</span>
                    <Link to={`/problems/${adjacent.next.problem_id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors">
                      {adjacent.next.problem_id}. {adjacent.next.title}
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            코드를 제출하려면{' '}
            <a href="/login" className="text-primary-600 hover:underline">로그인</a>
            이 필요합니다.
          </p>
        )}
      </div>
      </div>
      {/* 우측 끝 */}

      </div>
      {/* 스플릿 그리드 끝 */}

      {/* 하단 이전/다음 네비게이션 */}
      {(adjacent?.prev || adjacent?.next) && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            {adjacent?.prev && (
              <Link to={`/problems/${adjacent.prev.problem_id}`}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary-200 hover:bg-primary-50 transition-all group">
                <ChevronLeft size={18} className="text-gray-400 group-hover:text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">이전 문제</p>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 truncate">
                    {adjacent.prev.problem_id}. {adjacent.prev.title}
                  </p>
                </div>
              </Link>
            )}
          </div>
          <div className="flex-1">
            {adjacent?.next && (
              <Link to={`/problems/${adjacent.next.problem_id}`}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary-200 hover:bg-primary-50 transition-all group text-right justify-end">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">다음 문제</p>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 truncate">
                    {adjacent.next.problem_id}. {adjacent.next.title}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-primary-500 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      )}

      <CommentsSection problemId={id!} user={user} />
    </div>
  )
}
