import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Plus, Users, Copy, Check, LogIn } from 'lucide-react'

export default function ClassesPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [joinForm, setJoinForm] = useState({ invite_code: '', grade: '', class_num: '', student_num: '' })
  const [copied, setCopied] = useState<number | null>(null)

  const { data: classes, isLoading } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => api.get('/classes/mine').then((r) => r.data),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/classes', createForm).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-classes'] })
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
    },
  })

  const joinMutation = useMutation({
    mutationFn: () =>
      api.post('/classes/join', {
        invite_code: joinForm.invite_code.trim(),
        grade: joinForm.grade ? Number(joinForm.grade) : null,
        class_num: joinForm.class_num ? Number(joinForm.class_num) : null,
        student_num: joinForm.student_num ? Number(joinForm.student_num) : null,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-classes'] })
      setShowJoin(false)
      setJoinForm({ invite_code: '', grade: '', class_num: '', student_num: '' })
    },
  })

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">내 학급</h1>
        <div className="flex gap-2">
          {(user?.is_admin || user?.is_teacher) && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={15} /> 학급 만들기
            </button>
          )}
          <button
            onClick={() => setShowJoin(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogIn size={15} /> 학급 참여
          </button>
        </div>
      </div>

      {isLoading && <div className="text-gray-400 text-sm">불러오는 중...</div>}

      {classes?.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Users size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {user?.is_admin ? '아직 만든 학급이 없습니다.' : '참여한 학급이 없습니다.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes?.map((cls: any) => (
          <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  to={`/classes/${cls.id}`}
                  className="font-semibold text-gray-800 hover:text-primary-600 transition-colors"
                >
                  {cls.name}
                </Link>
                {cls.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cls.description}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                cls.my_role === 'teacher' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {cls.my_role === 'teacher' ? '담임' : '학생'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users size={14} />
              <span>{cls.member_count}명</span>
            </div>

            {cls.my_role === 'teacher' && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400">초대코드</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-700 tracking-wider">{cls.invite_code}</span>
                  <button
                    onClick={() => copyCode(cls.id, cls.invite_code)}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    {copied === cls.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <Link
              to={`/classes/${cls.id}`}
              className="text-center text-sm text-primary-600 hover:text-primary-700 font-medium mt-auto"
            >
              학급 보기 →
            </Link>
          </div>
        ))}
      </div>

      {/* 학급 만들기 모달 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">학급 만들기</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학급 이름 *</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="예: 2학년 3반 정보수업"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="선택 사항"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {createMutation.isError && (
                <p className="text-red-500 text-sm">
                  {(createMutation.error as any)?.response?.data?.detail ?? '오류가 발생했습니다'}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!createForm.name || createMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학급 참여 모달 */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">학급 참여</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">초대 코드 *</label>
                <input
                  value={joinForm.invite_code}
                  onChange={(e) => setJoinForm((f) => ({ ...f, invite_code: e.target.value }))}
                  placeholder="선생님께 받은 코드"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase tracking-wider"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { field: 'grade', label: '학년' },
                  { field: 'class_num', label: '반' },
                  { field: 'student_num', label: '번호' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="number"
                      min="1"
                      value={(joinForm as any)[field]}
                      onChange={(e) => setJoinForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ))}
              </div>
              {joinMutation.isError && (
                <p className="text-red-500 text-sm">
                  {(joinMutation.error as any)?.response?.data?.detail ?? '코드를 확인해주세요'}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={() => joinMutation.mutate()}
                disabled={!joinForm.invite_code || joinMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                참여하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
