import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Code2 } from 'lucide-react'

export default function LoginPage() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/login', { user_id: userId, password }).then((r) => r.data),
    onSuccess: (data) => {
      login(data.access_token, data.user)
      navigate('/')
    },
  })

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-50 rounded-xl mb-3">
            <Code2 className="text-primary-600" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">로그인</h1>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {mutation.isError && (
            <p className="text-red-500 text-sm text-center">아이디 또는 비밀번호가 올바르지 않습니다.</p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-primary-600 hover:underline font-medium">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
