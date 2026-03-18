import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import gradesService from '../../services/gradesService';
import scheduleService from '../../services/scheduleService';

function getEnrollmentStatusLabel(status) {
  if (status === 'completed') return 'Da hoan thanh';
  if (status === 'enrolled') return 'Dang hoc';
  return status || '-';
}

export default function LecturerClassStudentsPage() {
  const navigate = useNavigate();
  const { classSectionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);

  const loadClassStudents = async () => {
    if (!classSectionId) {
      setError('Khong tim thay ID lop hoc.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [enrollmentsResponse, scheduleResponse] = await Promise.all([
        gradesService.getClassEnrollmentsForGrading(classSectionId),
        scheduleService.getTeachingSchedule({ includeAllClasses: true }),
      ]);

      const enrollments = Array.isArray(enrollmentsResponse?.data?.data)
        ? enrollmentsResponse.data.data
        : [];
      const assignedClasses = scheduleResponse?.data?.data?.classes || [];

      const targetClass = assignedClasses.find(
        (item) => String(item._id || item.id) === String(classSectionId),
      );

      if (!targetClass) {
        setStudents([]);
        setClassInfo(null);
        setError('Ban khong co quyen xem lop nay hoac lop khong ton tai.');
        return;
      }

      setStudents(enrollments);
      setClassInfo(targetClass);
    } catch (err) {
      setStudents([]);
      setClassInfo(null);
      setError(err?.response?.data?.message || 'Khong the tai danh sach sinh vien cua lop.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassStudents();
  }, [classSectionId]);

  const filteredStudents = useMemo(() => {
    const keyword = String(searchTerm || '').trim().toLowerCase();
    if (!keyword) return students;

    return students.filter((item) => {
      const student = item.student || {};
      return (
        String(student.studentCode || '').toLowerCase().includes(keyword) ||
        String(student.fullName || '').toLowerCase().includes(keyword) ||
        String(student.email || '').toLowerCase().includes(keyword)
      );
    });
  }, [students, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/lecturer')}
            className="mb-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Quay lai trang chu
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Chi tiet lop hoc</h1>
          <p className="mt-1 text-sm text-slate-600">Danh sach sinh vien da dang ky trong lop duoc phan cong.</p>
        </div>

        <div className="w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tim theo ma SV, ten, email..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {classInfo ? (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Ma lop</div>
              <div className="mt-1 font-semibold text-slate-900">{classInfo.classCode || '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Mon hoc</div>
              <div className="mt-1 font-semibold text-slate-900">{classInfo.subject?.subjectCode || '-'}</div>
              <div className="text-slate-500">{classInfo.subject?.subjectName || '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Hoc ky</div>
              <div className="mt-1 font-semibold text-slate-900">
                {classInfo.semester || '-'} / {classInfo.academicYear || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Si so hien tai</div>
              <div className="mt-1 font-semibold text-slate-900">
                {Number(classInfo.currentEnrollment || 0)}/{Number(classInfo.maxCapacity || 0)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Danh sach sinh vien</h2>
          <div className="text-sm text-slate-500">{filteredStudents.length} sinh vien</div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Dang tai danh sach sinh vien...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Ma sinh vien</th>
                  <th className="px-3 py-2">Ho va ten</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Trang thai</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((item, index) => (
                  <tr key={item._id} className="border-b border-slate-100">
                    <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {item.student?.studentCode || '-'}
                    </td>
                    <td className="px-3 py-3 text-slate-800">{item.student?.fullName || '-'}</td>
                    <td className="px-3 py-3 text-slate-700">{item.student?.email || '-'}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {getEnrollmentStatusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-500" colSpan={5}>
                      Khong tim thay sinh vien phu hop.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
