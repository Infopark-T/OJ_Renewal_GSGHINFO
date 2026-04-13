import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { LayoutDashboard, BookOpen, Users, Activity } from 'lucide-react'

const navItems = [
  { to: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/admin/problems', label: '문제 관리', icon: BookOpen, end: false },
  { to: '/admin/users', label: '사용자 관리', icon: Users, end: false },
  { to: '/admin/submissions', label: '제출 현황', icon: Activity, end: false },
]

export default function AdminLayout() {
  const { user } = useAuthStore()

  if (!user?.is_admin) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-[calc(100vh-112px)] gap-0">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-gray-50 py-4">
        <p className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">관리자 콘솔</p>
        <nav className="space-y-0.5 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 p-6 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
