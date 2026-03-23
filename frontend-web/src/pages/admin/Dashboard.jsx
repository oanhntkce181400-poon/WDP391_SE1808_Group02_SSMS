import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';

/*
 * Quick links stay static because they reflect navigation structure, while the
 * analytics cards are fetched live from the backend. Keeping both on one page
 * gives admins an overview plus a fast way into operational modules.
 */
const MODULE_CARDS = [
  {
    to: '/admin/classes',
    emoji: 'CL',
    color: 'bg-indigo-100',
    title: 'Class Management',
    desc: 'Create and manage class sections',
  },
  {
    to: '/admin/lecturers',
    emoji: 'LE',
    color: 'bg-teal-100',
    title: 'Lecturer Management',
    desc: 'Manage lecturer profiles',
  },
  {
    to: '/admin/subjects',
    emoji: 'SB',
    color: 'bg-blue-100',
    title: 'Subject Management',
    desc: 'Manage subjects and prerequisites',
  },
  {
    to: '/admin/curriculum-list',
    emoji: 'CU',
    color: 'bg-green-100',
    title: 'Curriculum',
    desc: 'Manage curriculum structure',
  },
  {
    to: '/admin/semesters',
    emoji: 'SM',
    color: 'bg-amber-100',
    title: 'Semester Management',
    desc: 'Configure school semesters',
  },
  {
    to: '/admin/registration-periods',
    emoji: 'RP',
    color: 'bg-cyan-100',
    title: 'Registration Periods',
    desc: 'Control registration windows',
  },
  {
    to: '/admin/auto-enrollment',
    emoji: 'AE',
    color: 'bg-emerald-100',
    title: 'Auto Enrollment',
    desc: 'Run and monitor automatic enrollment',
  },
  {
    to: '/admin/wishlist',
    emoji: 'WL',
    color: 'bg-orange-100',
    title: 'Wishlist Approval',
    desc: 'Review and approve retake requests',
  },
  {
    to: '/admin/teaching-schedule',
    emoji: 'TS',
    color: 'bg-pink-100',
    title: 'Teaching Schedule',
    desc: 'View lecturer teaching schedules',
  },
];

const EMPTY_STATS = {
  totalStudents: 0,
  totalClasses: 0,
  registeredStudents: 0,
  totalEnrollments: 0,
  registrationRate: 0,
  capacityUtilization: 0,
  currentSemester: null,
  generatedAt: null,
};

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN');
}

export default function Dashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadStats() {
    try {
      setLoading(true);
      setError('');

      // The page trusts the backend to define which semester is "current" and how metrics are aggregated.
      const response = await dashboardService.getStats();
      setStats({ ...EMPTY_STATS, ...(response.data?.data || {}) });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError(err.response?.data?.message || 'Unable to load dashboard analytics.');
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load once on first render; manual refresh is available through the button above the cards.
    loadStats();
  }, []);

  // Each card intentionally answers a different admin question: scale, class load, and registration health.
  const statCards = [
    {
      label: 'Total Students',
      value: stats.totalStudents,
      helper: `${stats.registeredStudents} students registered`,
      tone: 'from-blue-600 to-cyan-500',
    },
    {
      label: 'Total Classes',
      value: stats.totalClasses,
      helper: `${stats.totalEnrollments} enrollments recorded`,
      tone: 'from-emerald-600 to-teal-500',
    },
    {
      label: 'Registration Rate',
      value: formatPercent(stats.registrationRate),
      helper: `Capacity used: ${formatPercent(stats.capacityUtilization)}`,
      tone: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-800">Dashboard Admin</h1>
          <p className="text-slate-600">
            {stats.currentSemester?.name || 'Latest semester overview'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Last updated: {loading ? 'Loading...' : formatDateTime(stats.generatedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Refresh Analytics
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl bg-gradient-to-br ${card.tone} p-5 text-white shadow-lg shadow-slate-200`}
          >
            <p className="text-sm font-medium text-white/80">{card.label}</p>
            <div className="mt-3 text-4xl font-bold tracking-tight">
              {loading ? '...' : card.value}
            </div>
            <p className="mt-2 text-sm text-white/85">{loading ? 'Loading analytics...' : card.helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Quick Access</h2>
          <p className="text-sm text-slate-500">Open the management modules you use most often.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULE_CARDS.map(({ to, emoji, color, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-lg border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${color} transition-transform group-hover:scale-110`}
                >
                  {emoji}
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight text-slate-800">{title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
