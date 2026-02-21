import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import StudentProfilePage from './pages/StudentProfilePage';
import SocketTestPage from './pages/SocketTestPage';
import AdminLayout from './components/layout/AdminLayout';
import StudentLayout from './components/layout/StudentLayout';
import Dashboard from './pages/admin/Dashboard';
import SubjectManagement from './pages/admin/SubjectManagement';
import SubjectPrerequisites from './pages/admin/SubjectPrerequisites';
import CurriculumManagement from './pages/admin/CurriculumManagement';
import UserListPage from './pages/UserListPage';
import GeneralSettingsPage from './pages/admin/GeneralSettingsPage';
import MajorManagement from './pages/admin/MajorManagement';
import StudentHome from './pages/student/StudentHome';
import ExamSchedulePage from './pages/student/ExamSchedulePage';
import RoomManagement from './pages/admin/RoomManagement';
import TimeslotManagement from './pages/admin/TimeslotManagement';
import TuitionFeeManagement from './pages/admin/TuitionFeeManagement';
import ErrorLogsPage from './pages/admin/ErrorLogsPage';
import CurriculumList from './components/features/CurriculumList';
import ActorsManagementPage from './pages/admin/ActorsManagementPage';
import authService from './services/authService';
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin routes with layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="prerequisites/:subjectId" element={<SubjectPrerequisites />} />
        <Route path="curriculum" element={<CurriculumManagement />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="settings" element={<GeneralSettingsPage />} />
        <Route path="majors" element={<MajorManagement />} />
        <Route path="rooms" element={<RoomManagement />} />
        <Route path="timeslots" element={<TimeslotManagement />} />
        <Route path="curriculum-list" element={<CurriculumList />} />
        <Route path="curriculum/:curriculumId/setup" element={<CurriculumManagement />} />
        <Route path="tuition-fees" element={<TuitionFeeManagement />} />
        <Route path="error-logs" element={<ErrorLogsPage />} />
        <Route path="actors" element={<ActorsManagementPage />} />
      </Route>

      {/* Student routes with layout */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentHome />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="exams" element={<ExamSchedulePage />} />
      </Route>

      {/* Legacy dashboard route - redirect to admin */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/actors"
        element={
          <ProtectedRoute>
            <ActorsManagementPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    authService
      .me()
      .then((response) => {
        if (isMounted) {
          setUser(response.data.user);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (isMounted) setStatus("unauthenticated");
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          Checking session...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on user's role
    if (user.role === 'student') {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return children;
}
