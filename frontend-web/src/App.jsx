import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SocketTestPage from './pages/SocketTestPage';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import SubjectManagement from './pages/admin/SubjectManagement';
import SubjectPrerequisites from './pages/admin/SubjectPrerequisites';
import CurriculumManagement from './pages/admin/CurriculumManagement';
import RoomManagement from './pages/admin/RoomManagement';
import TimeslotManagement from './pages/admin/TimeslotManagement';
import MajorManagement from './pages/admin/MajorManagement';
import CurriculumList from './components/features/CurriculumList';
import TuitionFeeManagement from './pages/admin/TuitionFeeManagement';
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
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="prerequisites/:subjectId" element={<SubjectPrerequisites />} />
        <Route path="rooms" element={<RoomManagement />} />
        <Route path="timeslots" element={<TimeslotManagement />} />
        <Route path="curriculum" element={<CurriculumList />} />
        <Route path="curriculum/:curriculumId/setup" element={<CurriculumManagement />} />
        <Route path="tuition-fees" element={<TuitionFeeManagement />} />
        <Route path="majors" element={<MajorManagement />} />
      </Route>

      {/* Socket Test Page */}
      <Route
        path="/socket-test"
        element={
          <ProtectedRoute>
            <SocketTestPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy dashboard route - redirect to admin */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    authService
      .me()
      .then(() => {
        if (isMounted) setStatus('authenticated');
      })
      .catch(() => {
        if (isMounted) setStatus('unauthenticated');
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
          Checking session...
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
