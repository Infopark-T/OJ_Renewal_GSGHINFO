import { Link } from 'react-router-dom'
import { BookOpen, Activity, Trophy, Users, Bell, Pin, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function HomePage() {
  const { user } = useAuthStore()

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    enabled: !!user,
  })

  const { data: noticesData } = useQuery({
    queryKey: ['notices', 1],
    queryFn: () => api.get('/notices', { params: { page: 1, page_size: 5 } }).then((r) => r.data),
  })

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          {user ? `안녕하세요, ${user.nick || user.user_id}님!` : '프로그래밍 학습 플랫폼'}
        </h1>
        <p className="text-primary-100 mb-6">
          문제를 풀고, 실력을 키우고, 함께 성장하세요.
        </p>
        <div className="flex gap-3">
          <Link
            to="/problems"
            className="px-5 py-2.5 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            문제 풀기
          </Link>
          {!user && (
            <Link
              to="/register"
              className="px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium border border-primary-400 hover:bg-primary-400 transition-colors"
            >
              시작하기
            </Link>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {user && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '제출', value: freshUser?.submit ?? user.submit, icon: Activity, color: 'text-blue-500' },
            { label: '해결', value: freshUser?.solved ?? user.solved, icon: Trophy, color: 'text-green-500' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className={`${item.color} mb-2`}>
                <item.icon size={20} />
              </div>
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 공지사항 미리보기 */}
      {noticesData?.notices?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-primary-500" />
              <span className="font-semibold text-gray-700 text-sm">공지사항</span>
            </div>
            <Link to="/notices" className="text-xs text-gray-400 hover:text-primary-600 flex items-center gap-0.5">
              전체보기 <ChevronRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {noticesData.notices.map((n: any) => (
              <li key={n.id}>
                <Link to="/notices"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  {n.is_pinned && <Pin size={12} className="text-red-400 shrink-0" />}
                  {n.is_pinned && (
                    <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">공지</span>
                  )}
                  <span className="flex-1 text-sm text-gray-700 truncate">{n.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/problems"
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
        >
          <BookOpen className="text-primary-500 mb-3 group-hover:scale-110 transition-transform" size={28} />
          <h3 className="font-semibold text-gray-800 mb-1">문제 목록</h3>
          <p className="text-sm text-gray-500">다양한 알고리즘 문제를 풀어보세요</p>
        </Link>
        <Link
          to="/status"
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
        >
          <Activity className="text-green-500 mb-3 group-hover:scale-110 transition-transform" size={28} />
          <h3 className="font-semibold text-gray-800 mb-1">채점 현황</h3>
          <p className="text-sm text-gray-500">실시간 채점 결과를 확인하세요</p>
        </Link>
        <Link
          to="/classes"
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
        >
          <Users className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" size={28} />
          <h3 className="font-semibold text-gray-800 mb-1">내 학급</h3>
          <p className="text-sm text-gray-500">학급에 참여하거나 관리하세요</p>
        </Link>
      </div>
    </div>
  )
}
