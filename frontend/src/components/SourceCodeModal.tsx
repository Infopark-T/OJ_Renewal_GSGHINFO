import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { X, Clock, Cpu, FileCode, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Editor from '@monaco-editor/react'

const LANGUAGE_MAP: Record<string, string> = {
  'C': 'c', 'C++': 'cpp', 'Java': 'java', 'Python 3': 'python',
  'Go': 'go', 'JavaScript': 'javascript', 'PHP': 'php', 'Ruby': 'ruby',
  'C#': 'csharp', 'Lua': 'lua', 'SQL': 'sql',
}

const RESULT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'Accepted':               { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  'Wrong Answer':           { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  'Presentation Error':     { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'Time Limit Exceeded':    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Memory Limit Exceeded':  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Output Limit Exceeded':  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Runtime Error':          { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Compile Error':          { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Judging':                { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  'Compiling':              { bg: 'bg-blue-50',   text: 'text-blue-500',   border: 'border-blue-200' },
  'Running':                { bg: 'bg-blue-50',   text: 'text-blue-500',   border: 'border-blue-200' },
  'Waiting':                { bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200' },
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg">
      <span className="text-gray-400">{icon}</span>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-semibold text-gray-700">{value}</div>
      </div>
    </div>
  )
}

interface Props {
  solutionId: number
  onClose: () => void
}

export default function SourceCodeModal({ solutionId, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['solution', solutionId],
    queryFn: () => api.get(`/solutions/${solutionId}`).then((r) => r.data),
  })

  const style = data ? (RESULT_STYLE[data.result_label] ?? RESULT_STYLE['Waiting']) : null
  const isJudging = data && ['Judging', 'Compiling', 'Running', 'Waiting'].includes(data.result_label)
  const isCE = data?.result_label === 'Compile Error'
  const isAC = data?.result_label === 'Accepted'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">제출 #{solutionId}</span>
            {data && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${style?.bg} ${style?.text} ${style?.border} ${isJudging ? 'animate-pulse' : ''}`}>
                {isAC && <CheckCircle2 size={13} className="inline mr-1" />}
                {data.result_label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">불러오는 중...</div>
          )}
          {isError && (
            <div className="flex items-center justify-center h-48 gap-2 text-red-400 text-sm">
              <AlertTriangle size={16} />
              코드를 불러올 수 없습니다. (본인 제출만 열람 가능)
            </div>
          )}

          {data && (
            <div className="space-y-4 p-5">
              {/* 통계 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox icon={<Clock size={15} />} label="실행 시간"
                  value={data.time > 0 ? `${data.time} ms` : '—'} />
                <StatBox icon={<Cpu size={15} />} label="메모리"
                  value={data.memory > 0 ? `${data.memory} KB` : '—'} />
                <StatBox icon={<FileCode size={15} />} label="코드 길이"
                  value={`${data.code_length} B`} />
                <StatBox icon={<span className="text-xs font-mono font-bold">{'{}'}</span>} label="언어"
                  value={data.language_label} />
              </div>

              {/* 컴파일 에러 메시지 */}
              {isCE && data.compile_error && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700">컴파일 에러</span>
                  </div>
                  <pre className="bg-gray-900 text-yellow-300 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {data.compile_error}
                  </pre>
                </div>
              )}

              {/* 소스 코드 */}
              {data.source_code !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">소스 코드</span>
                    <span className="text-xs text-gray-400">{data.language_label}</span>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <Editor
                      height="400px"
                      language={LANGUAGE_MAP[data.language_label] ?? 'cpp'}
                      value={data.source_code}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                        lineNumbers: 'on',
                        renderLineHighlight: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
