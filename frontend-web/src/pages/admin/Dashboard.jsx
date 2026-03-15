import { Link } from 'react-router-dom';

const CARDS = [
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
    to: '/admin/teaching-schedule',
    emoji: 'TS',
    color: 'bg-pink-100',
    title: 'Teaching Schedule',
    desc: 'View lecturer teaching schedules',
  },
];

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">Dashboard Admin</h1>
        <p className="text-slate-600">Quick access to management modules.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARDS.map(({ to, emoji, color, title, desc }) => (
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
  );
}
