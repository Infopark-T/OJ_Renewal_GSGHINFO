import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { Code2, BookOpen, Activity, Users, LogIn, LogOut, UserPlus, Settings, Trophy, Medal, Bell, BarChart2 } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary-600">
            <Code2 size={22} />
            <span>HustOJ</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <BookOpen size={16} />
              문제
            </Link>
            <Link
              to="/status"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Activity size={16} />
              채점 현황
            </Link>
            <Link
              to="/notices"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Bell size={16} />
              공지
            </Link>
            <Link
              to="/ranking"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Medal size={16} />
              랭킹
            </Link>
            <Link
              to="/contests"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Trophy size={16} />
              대회
            </Link>
            <Link
              to="/classes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Users size={16} />
              내 학급
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/me"
                  className="text-sm text-gray-700 font-medium hover:text-primary-600 transition-colors"
                >
                  {user.nick || user.user_id}
                </Link>
                {(user.is_admin || user.is_teacher) && (
                  <Link
                    to="/stats"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <BarChart2 size={16} />
                    통계
                  </Link>
                )}
                {user.is_admin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <Settings size={16} />
                    관리자
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <LogIn size={16} />
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <UserPlus size={16} />
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1920px] mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-400">
        HustOJ — 프로그래밍 학습 플랫폼
      </footer>
    </div>
  )
}
