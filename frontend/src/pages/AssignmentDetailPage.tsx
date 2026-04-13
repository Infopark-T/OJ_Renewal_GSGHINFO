import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  ArrowLeft, Calendar, BookOpen, CheckCircle2, Circle,
  Users, LayoutGrid, List,
} from 'lucide-react'

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  )
}

function StudentNum({ grade, classNum, studentNum }: { grade: any; classNum: any; studentNum: any }) {
  if (grade && classNum && studentNum) return <span>{grade}학년 {classNum}반 {studentNum}번</span>
  if (grade) return <span>{grade}학년 {classNum ?? '-'}반 {studentNum ?? '-'}번</span>
  return <span className="text-gray-300">미설정</span>
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [teacherView, setTeacherView] = useState<'list' | 'matrix'>('list')

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => api.get(`/assignments/${id}`).then((r) => r.data),
  })

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['assignment-progress', id],
    queryFn: () => api.get(`/assignments/${id}/progress`).then((r) => r.data),
    enabled: !!(user?.is_teacher || user?.is_admin),
  })

  if (isLoading) return <div className="text-gray-400 py-16 text-center">불러오는 중...</div>
  if (!assignment) return <div className="text-gray-400 py-16 text-center">과제를 찾을 수 없습니다</div>

  const now = new Date()
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
  const isOverdue = dueDate && dueDate < now
  const isDone = assignment.my_progress === 100
  const solvedSet = new Set<number>(assignment.my_solved_problems ?? [])
  const isTeacher = user?.is_teacher || user?.is_admin

  // 마감까지 남은 일수
  const daysLeft = dueDate && !isOverdue
    ? Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3">
        <Link to={`/classes/${assignment.class_id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{assignment.title}</h1>
          {assignment.description && (
            <p className="text-sm text-gray-500 mt-0.5">{assignment.description}</p>
          )}
        </div>
      </div>

      {/* ── 메타 정보 ── */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <BookOpen size={14} />
          <span>문제 {assignment.problem_count}개</span>
        </div>
        {dueDate && (
          <div className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'text-red-500' : daysLeft !== null && daysLeft <= 3 ? 'text-orange-500' : 'text-gray-500'}`}>
            <Calendar size={14} />
            <span>마감 {dueDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {isOverdue && <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">마감됨</span>}
            {!isOverdue && daysLeft !== null && daysLeft <= 3 && (
              <span className="text-xs bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-medium">D-{daysLeft}</span>
            )}
          </div>
        )}
      </div>

      {/* ── 내 진행률 (학생용) ── */}
      {!isTeacher && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">내 진행 현황</h2>
            <span className={`text-sm font-bold ${isDone ? 'text-green-600' : 'text-blue-600'}`}>
              {assignment.my_solved}/{assignment.problem_count} ({assignment.my_progress}%)
            </span>
          </div>
          <ProgressBar value={assignment.my_progress} />
          {isDone && <p className="text-green-600 text-sm mt-2 font-medium">모든 문제를 완료했습니다!</p>}
        </div>
      )}

      {/* ── 문제 목록 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">문제 목록</h2>
          {!isTeacher && (
            <span className="text-xs text-gray-400">{solvedSet.size}/{assignment.problem_count} 해결</span>
          )}
        </div>
        <ul className="divide-y divide-gray-50">
          {assignment.problems.map((p: any, idx: number) => {
            const solved = solvedSet.has(p.problem_id)
            return (
              <li key={p.problem_id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${solved ? 'bg-green-50/30' : ''}`}>
                <span className="text-gray-300 text-sm w-5 text-right shrink-0">{idx + 1}</span>
                {!isTeacher && (
                  solved
                    ? <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    : <Circle size={15} className="text-gray-200 shrink-0" />
                )}
                <Link
                  to={`/problems/${p.problem_id}`}
                  className={`flex-1 font-medium text-sm hover:underline ${solved ? 'text-green-700' : 'text-blue-600'}`}
                >
                  {p.title}
                </Link>
                <span className="text-xs text-gray-400 font-mono shrink-0">#{p.problem_id}</span>
                {solved && !isTeacher && (
                  <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium shrink-0">해결</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── 학생 진행 현황 (교사/어드민 전용) ── */}
      {isTeacher && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gray-400" />
              <span className="font-semibold text-gray-700">학생 진행 현황</span>
              {progress && (
                <span className="text-xs text-gray-400">
                  ({progress.students.filter((s: any) => s.progress === 100).length}/{progress.students.length}명 완료)
                </span>
              )}
            </div>
            {/* 보기 전환 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setTeacherView('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${teacherView === 'list' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={12} /> 목록
              </button>
              <button
                onClick={() => setTeacherView('matrix')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${teacherView === 'matrix' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={12} /> 매트릭스
              </button>
            </div>
          </div>

          {progressLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : progress ? (
            teacherView === 'list' ? (
              /* ── 목록 뷰 ── */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-2.5">학번</th>
                      <th className="text-left px-3 py-2.5">이름</th>
                      <th className="text-left px-3 py-2.5 min-w-[180px]">진행률</th>
                      <th className="text-right px-5 py-2.5">해결</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.students.map((s: any) => (
                      <tr key={s.user_id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-gray-500 text-xs font-mono">
                          <StudentNum grade={s.grade} classNum={s.class_num} studentNum={s.student_num} />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-700">{s.nick}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar value={s.progress} /></div>
                            <span className="text-xs text-gray-400 w-8 text-right">{s.progress}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <span className={s.solved_count === s.total_count ? 'text-green-600 font-bold' : 'text-gray-600'}>
                            {s.solved_count}/{s.total_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {progress.students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-gray-400">학생이 없습니다</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── 매트릭스 뷰 ── */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-2.5 sticky left-0 bg-gray-50 z-10 min-w-[120px]">이름</th>
                      {progress.problems.map((p: any, i: number) => (
                        <th key={p.problem_id} className="px-2 py-2.5 text-center min-w-[60px]">
                          <Link
                            to={`/problems/${p.problem_id}`}
                            className="text-blue-500 hover:underline font-mono"
                            title={p.title}
                          >
                            #{p.problem_id}
                          </Link>
                          <div className="text-gray-300 font-normal truncate max-w-[56px] text-center" title={p.title}>
                            {i + 1}번
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-center">합계</th>
                    </tr>
                    {/* 문제별 해결 학생 수 */}
                    <tr className="text-xs bg-blue-50/50 border-b border-gray-100">
                      <td className="px-5 py-1.5 text-gray-400 sticky left-0 bg-blue-50/50">해결 학생 수</td>
                      {progress.problems.map((p: any) => {
                        const cnt = progress.students.filter((s: any) => s.solved_problems.includes(p.problem_id)).length
                        const total = progress.students.length
                        return (
                          <td key={p.problem_id} className="px-2 py-1.5 text-center">
                            <span className={`text-xs font-medium ${cnt === total ? 'text-green-600' : cnt === 0 ? 'text-gray-300' : 'text-blue-600'}`}>
                              {cnt}/{total}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {progress.students.map((s: any) => {
                      const solvedSet = new Set<number>(s.solved_problems)
                      return (
                        <tr key={s.user_id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-5 py-2 sticky left-0 bg-white hover:bg-gray-50 z-10">
                            <div className="font-medium text-gray-700 text-sm">{s.nick}</div>
                            <div className="text-xs text-gray-400 font-mono">
                              <StudentNum grade={s.grade} classNum={s.class_num} studentNum={s.student_num} />
                            </div>
                          </td>
                          {progress.problems.map((p: any) => (
                            <td key={p.problem_id} className="px-2 py-2 text-center">
                              {solvedSet.has(p.problem_id)
                                ? <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                                : <Circle size={16} className="text-gray-200 mx-auto" />}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold ${s.solved_count === s.total_count ? 'text-green-600' : 'text-gray-500'}`}>
                              {s.solved_count}/{s.total_count}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  )
}
