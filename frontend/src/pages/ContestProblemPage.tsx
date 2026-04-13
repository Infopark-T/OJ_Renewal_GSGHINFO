import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Clock, Cpu, Send, CheckCircle, BarChart2, ChevronLeft, ChevronRight,
  RotateCcw, ExternalLink, Loader2, ALargeSmall, Trophy, ArrowLeft,
} from 'lucide-react'
import CodeEditor from '../components/CodeEditor'
import { DifficultyBadge } from '../components/DifficultyBadge'

const RESULT_STYLE: Record<number, { label: string; bg: string; text: string }> = {
  4:  { label: 'Accepted',              bg: 'bg-green-50',  text: 'text-green-700'  },
  6:  { label: 'Wrong Answer',          bg: 'bg-red-50',    text: 'text-red-700'    },
  7:  { label: 'Time Limit Exceeded',   bg: 'bg-orange-50', text: 'text-orange-700' },
  8:  { label: 'Memory Limit Exceeded', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  10: { label: 'Runtime Error',         bg: 'bg-purple-50', text: 'text-purple-700' },
  11: { label: 'Compile Error',         bg: 'bg-gray-100',  text: 'text-gray-700'   },
  5:  { label: 'Presentation Error',    bg: 'bg-blue-50',   text: 'text-blue-700'   },
}
const JUDGING_RESULTS = new Set([0, 1, 2, 3])

const LANGUAGES = [
  { value: 6,  label: 'Python' },
  { value: 0,  label: 'C' },
  { value: 1,  label: 'C++' },
  { value: 3,  label: 'Java' },
  { value: 16, label: 'JavaScript' },
]

// ─── 대회 타이머 ──────────────────────────────────────────────────────────────
function ContestTimer({ endTime, paused }: { endTime: string; paused: boolean }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const end = new Date(endTime).getTime()
    const update = () => setRemaining(Math.max(0, end - Date.now()))
    update()
    if (paused) return  // 일시중지 중엔 갱신 안 함
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [endTime, paused])

  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  const isUrgent = remaining < 10 * 60 * 1000 && remaining > 0

  if (remaining === 0) return <span className="text-xs font-mono text-gray-400">종료됨</span>

  if (paused) return (
    <span className="text-sm font-mono font-bold text-orange-500 animate-pulse">
      ⏸ {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )

  return (
    <span className={`text-sm font-mono font-bold tabular-nums ${isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

export default function ContestProblemPage() {
  const { contestId, problemId } = useParams<{ contestId: string; problemId: string }>()
  const { user } = useAuthStore()

  const [language, setLanguage] = useState(6)
  const [code, setCode] = useState('')
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('editor-font-size')
    return saved ? Number(saved) : 20
  })
  const [solutionId, setSolutionId] = useState<number | null>(null)
  const [judgeResult, setJudgeResult] = useState<any>(null)
  const [pollStatus, setPollStatus] = useState<string>('')

  // 대회 정보 (15초마다 갱신 — 일시중지 상태 반영)
  const { data: contest } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: () => api.get(`/contests/${contestId}`).then((r) => r.data),
    refetchInterval: 15000,
  })

  // 문제 정보
  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: () => api.get(`/problems/${problemId}`).then((r) => r.data),
  })

  // 문제 변경 시 초기화
  useEffect(() => {
    setSolutionId(null)
    setJudgeResult(null)
    setPollStatus('')
    setCode('')
  }, [problemId])

  // 채점 결과 폴링
  useEffect(() => {
    if (!solutionId || judgeResult) return
    const STATUS_LABELS: Record<number, string> = { 0: '대기 중', 1: '채점 중', 2: '컴파일 중', 3: '실행 중' }
    let cancelled = false

    const poll = async () => {
      try {
        const res = await api.get(`/solutions/${solutionId}`)
        if (cancelled) return
        setPollStatus(STATUS_LABELS[res.data.result] ?? '')
        if (!JUDGING_RESULTS.has(res.data.result)) setJudgeResult(res.data)
      } catch {}
    }

    poll()
    const timer = setInterval(poll, 1500)
    return () => { cancelled = true; clearInterval(timer) }
  }, [solutionId, judgeResult])

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/solutions/submit', {
        problem_id: Number(problemId),
        language,
        source_code: code,
        contest_id: Number(contestId),
      }),
    onSuccess: (res) => {
      setSolutionId(res.data.solution_id)
      setJudgeResult(null)
    },
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">불러오는 중...</div>
  if (!problem) return <div className="text-center py-16 text-gray-400">문제를 찾을 수 없습니다</div>

  const isJudging = solutionId !== null && judgeResult === null
  const resultStyle = judgeResult
    ? (RESULT_STYLE[judgeResult.result] ?? { label: judgeResult.result_label, bg: 'bg-gray-50', text: 'text-gray-700' })
    : null

  // 현재 문제의 대회 내 alias와 prev/next 계산
  const problems: any[] = contest?.problems ?? []
  const currentIdx = problems.findIndex((p: any) => p.problem_id === Number(problemId))
  const currentAlias = currentIdx >= 0 ? problems[currentIdx].alias : '?'
  const prevProblem = currentIdx > 0 ? problems[currentIdx - 1] : null
  const nextProblem = currentIdx >= 0 && currentIdx < problems.length - 1 ? problems[currentIdx + 1] : null

  const isPaused = !!contest?.paused_at
  const contestStatus = contest?.status ?? null

  return (
    <div className="space-y-5">
      {/* ── 일시중지 배너 ── */}
      {isPaused && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 text-orange-700 text-sm font-medium">
          <span className="text-lg">⏸</span>
          대회가 일시중지되었습니다. 운영자의 재개를 기다려 주세요. 제출이 일시적으로 차단됩니다.
        </div>
      )}

      {/* ── 대회 헤더 바 ── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
        <div className="flex items-center gap-3">
          <Link to={`/contests/${contestId}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-yellow-500" />
            <span className="font-semibold text-gray-700 text-sm truncate max-w-[240px]">
              {contest?.title ?? '대회'}
            </span>
          </div>
          {contestStatus === 'running' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">진행 중</span>
          )}
          {contestStatus === 'paused' && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium animate-pulse">일시중지</span>
          )}
          {contestStatus === 'ended' && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">종료됨</span>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* 대회 내 문제 이동 */}
          <div className="flex items-center gap-1">
            {prevProblem && (
              <Link
                to={`/contests/${contestId}/problems/${prevProblem.problem_id}`}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded transition-colors"
              >
                <ChevronLeft size={14} />
                {prevProblem.alias}
              </Link>
            )}
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded font-bold text-sm">
              {currentAlias}
            </span>
            {nextProblem && (
              <Link
                to={`/contests/${contestId}/problems/${nextProblem.problem_id}`}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded transition-colors"
              >
                {nextProblem.alias}
                <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* 타이머 */}
          {contest?.end_time && (contestStatus === 'running' || contestStatus === 'paused') && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${isPaused ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <Clock size={13} className={isPaused ? 'text-orange-400' : 'text-gray-400'} />
              <ContestTimer endTime={contest.end_time} paused={isPaused} />
            </div>
          )}
        </div>
      </div>

      {/* ── 문제 본문 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {currentAlias}. {problem.title}
          </h1>
          <div className="flex gap-4 text-sm text-gray-500 shrink-0">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {problem.time_limit}초
            </span>
            <span className="flex items-center gap-1">
              <Cpu size={14} /> {problem.memory_limit}MB
            </span>
            <span className="flex items-center gap-1">
              <BarChart2 size={14} /> 제출 {problem.submit}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle size={14} /> 정답 {problem.accepted}
            </span>
          </div>
        </div>

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
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto border border-gray-100">{problem.sample_input}</pre>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-base mb-2">예제 출력</h3>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto border border-gray-100">{problem.sample_output}</pre>
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

      {/* ── 코드 제출 ── */}
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
                      language === l.value ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              {/* 글자 크기 */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <ALargeSmall size={15} className="text-gray-400 shrink-0" />
                {[16, 18, 20, 22, 24].map((size) => (
                  <button
                    key={size}
                    onClick={() => { setFontSize(size); localStorage.setItem('editor-font-size', String(size)) }}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      fontSize === size ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <CodeEditor value={code} onChange={setCode} language={language} fontSize={fontSize} />

            {isPaused ? (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm font-medium">
                ⏸ 대회 일시중지 중 — 제출이 차단되었습니다
              </div>
            ) : (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={!code.trim() || submitMutation.isPending || isJudging}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Send size={16} />
                {submitMutation.isPending ? '제출 중...' : '제출하기'}
              </button>
            )}
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
                    <span className={`text-base font-bold ${resultStyle.text}`}>{resultStyle.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setJudgeResult(null); setSolutionId(null) }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white transition-colors"
                    >
                      <RotateCcw size={13} /> 다시 시도
                    </button>
                    <Link
                      to={`/status?solution_id=${judgeResult.solution_id}`}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 px-2 py-1 rounded hover:bg-white transition-colors"
                    >
                      <ExternalLink size={13} /> 상세 보기
                    </Link>
                  </div>
                </div>
                <div className="flex gap-6 text-xs text-gray-500">
                  {judgeResult.time > 0 && <span><Clock size={11} className="inline mr-1" />{judgeResult.time}ms</span>}
                  {judgeResult.memory > 0 && <span><Cpu size={11} className="inline mr-1" />{judgeResult.memory}KB</span>}
                </div>
                {judgeResult.result === 4 && nextProblem && (
                  <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium">정답! 다음 문제로 이동할까요?</span>
                    <Link
                      to={`/contests/${contestId}/problems/${nextProblem.problem_id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
                    >
                      {nextProblem.alias}. {nextProblem.title}
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            코드를 제출하려면 <a href="/login" className="text-primary-600 hover:underline">로그인</a>이 필요합니다.
          </p>
        )}
      </div>
    </div>
  )
}
