import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import HomePage from './pages/HomePage'
import ProblemsPage from './pages/ProblemsPage'
import ProblemDetailPage from './pages/ProblemDetailPage'
import ProblemCreatePage from './pages/ProblemCreatePage'
import ProblemEditPage from './pages/ProblemEditPage'
import StatusPage from './pages/StatusPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyPage from './pages/MyPage'
import ClassesPage from './pages/ClassesPage'
import ClassDetailPage from './pages/ClassDetailPage'
import AssignmentDetailPage from './pages/AssignmentDetailPage'
import ContestsPage from './pages/ContestsPage'
import ContestDetailPage from './pages/ContestDetailPage'
import ContestProblemPage from './pages/ContestProblemPage'
import RankingPage from './pages/RankingPage'
import NoticesPage from './pages/NoticesPage'
import StatsPage from './pages/StatsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProblemsPage from './pages/admin/AdminProblemsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="problems" element={<ProblemsPage />} />
          <Route path="problems/new" element={<ProblemCreatePage />} />
          <Route path="problems/:id" element={<ProblemDetailPage />} />
          <Route path="problems/:id/edit" element={<ProblemEditPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="me" element={<MyPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="classes/:id" element={<ClassDetailPage />} />
          <Route path="assignments/:id" element={<AssignmentDetailPage />} />
          <Route path="contests" element={<ContestsPage />} />
          <Route path="contests/:id" element={<ContestDetailPage />} />
          <Route path="contests/:contestId/problems/:problemId" element={<ContestProblemPage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="problems" element={<AdminProblemsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
