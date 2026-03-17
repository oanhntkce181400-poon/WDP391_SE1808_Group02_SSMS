import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function TeacherLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header mode="teacher" />
      <main>
        <Outlet />
      </main>
    </div>
  );
}