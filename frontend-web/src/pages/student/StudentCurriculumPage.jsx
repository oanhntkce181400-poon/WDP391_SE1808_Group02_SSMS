// StudentCurriculumPage - Trang xem khung chương trình của sinh viên
import { useState, useEffect } from 'react';
import studentService from '../../services/studentService';

export default function StudentCurriculumPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCurriculum = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await studentService.getMyCurriculum();
        setData(res.data?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được khung chương trình.');
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculum();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Lỗi</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const { studentInfo, curriculum, currentCurriculumSemester, activeSystemSemester } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📖 Khung chương trình của tôi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Thông tin khung chương trình và tiến độ học tập theo khung chương trình
        </p>
      </div>

      {/* Khối 1: Thông tin sinh viên */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Thông tin của bạn
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Mã SV</dt>
            <dd className="font-medium text-slate-900">{studentInfo?.studentCode || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Họ tên</dt>
            <dd className="font-medium text-slate-900">{studentInfo?.fullName || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Năm nhập học</dt>
            <dd className="font-medium text-slate-900">{studentInfo?.enrollmentYear || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Ngành</dt>
            <dd className="font-medium text-slate-900">{studentInfo?.majorCode || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Khối 2: Tiến độ học tập theo khung chương trình */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Tiến độ học tập theo khung chương trình
        </h2>
        {currentCurriculumSemester ? (
          <div className="mt-3 space-y-2">
            <p className="text-lg font-bold text-slate-900">
              {currentCurriculumSemester.semesterLabel}
            </p>
            <p className="text-sm text-slate-600">
              Năm học: <strong>{currentCurriculumSemester.academicYear}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Thuộc khung: <strong>{curriculum?.code || '—'}</strong> · Tiến độ: {currentCurriculumSemester.progress}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Chưa xác định được học kỳ. Vui lòng liên hệ phòng Đào tạo để cập nhật.
          </p>
        )}
      </div>

      {/* Khối 3: Kỳ hệ thống đang mở đăng ký */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-800">
          Kỳ hệ thống đang mở đăng ký
        </h2>
        {activeSystemSemester ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-slate-700">
              {activeSystemSemester.name}
            </p>
            <p className="text-sm text-slate-600">
              Năm học: {activeSystemSemester.academicYear}
            </p>
            <p className="text-xs text-slate-500">
              Đây là kỳ hệ thống để đăng ký học phần, học lại, học vượt
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Chưa có kỳ hệ thống đang mở đăng ký
          </p>
        )}
      </div>

      {/* Khối 4: Khung chương trình áp dụng */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Khung chương trình áp dụng
        </h2>
        {curriculum ? (
          <div className="mt-4 space-y-2">
            <p className="text-lg font-semibold text-slate-900">{curriculum.name}</p>
            <p className="text-sm text-slate-600">
              Mã: <span className="font-medium">{curriculum.code}</span>
              {curriculum.academicYear && (
                <> · Áp dụng: {curriculum.academicYear}</>
              )}
            </p>
            {curriculum.major && (
              <p className="text-sm text-slate-600">Ngành: {curriculum.major}</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Chưa có khung chương trình phù hợp với năm nhập học và ngành của bạn.
          </p>
        )}
      </div>
    </div>
  );
}
