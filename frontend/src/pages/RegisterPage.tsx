import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Code2, ChevronDown, ChevronUp } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ user_id: '', password: '', nick: '', email: '', school: '' })
  const [classForm, setClassForm] = useState({ invite_code: '', grade: '', class_num: '', student_num: '' })
  const [showClass, setShowClass] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/register', form)
      // 초대코드가 있으면 학급 자동 참여
      if (classForm.invite_code.trim()) {
        try {
          await api.post(
            '/classes/join',
            {
              invite_code: classForm.invite_code.trim(),
              grade: classForm.grade ? Number(classForm.grade) : null,
              class_num: classForm.class_num ? Number(classForm.class_num) : null,
              student_num: classForm.student_num ? Number(classForm.student_num) : null,
            },
            { headers: { Authorization: `Bearer ${res.data.access_token}` } },
          )
        } catch {
          // 초대코드 실패는 무시하고 가입은 완료
        }
      }
      return res.data
    },
    onSuccess: (data) => {
      login(data.access_token, data.user)
      navigate('/')
    },
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))
  const updateClass = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setClassForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-xl mb-3">
            <Code2 className="text-primary-600" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">회원가입</h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          {[
            { field: 'user_id', label: '아이디', type: 'text', required: true },
            { field: 'password', label: '비밀번호', type: 'password', required: true },
            { field: 'nick', label: '닉네임', type: 'text', required: false },
            { field: 'email', label: '이메일', type: 'email', required: false },
            { field: 'school', label: '학교/소속', type: 'text', required: false },
          ].map(({ field, label, type, required }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type={type}
                value={(form as any)[field]}
                onChange={update(field)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required={required}
              />
            </div>
          ))}

          {/* 학급 참여 (선택) */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowClass((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>학급 참여 <span className="text-gray-400 text-xs">(선택)</span></span>
              {showClass ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showClass && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">초대 코드</label>
                  <input
                    type="text"
                    value={classForm.invite_code}
                    onChange={updateClass('invite_code')}
                    placeholder="선생님께 받은 코드 입력"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: 'grade', label: '학년' },
                    { field: 'class_num', label: '반' },
                    { field: 'student_num', label: '번호' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input
                        type="number"
                        min="1"
                        value={(classForm as any)[field]}
                        onChange={updateClass(field)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {mutation.isError && (
            <p className="text-red-500 text-sm text-center">
              {(mutation.error as any)?.response?.data?.detail ?? '이미 사용 중인 아이디입니다.'}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? '처리 중...' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">로그인</Link>
        </p>
      </div>
    </div>
  )
}
