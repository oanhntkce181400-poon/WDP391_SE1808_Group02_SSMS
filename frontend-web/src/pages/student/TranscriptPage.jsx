import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import transcriptService from '../../services/transcriptService';

function parsePreviewPayload(res) {
  if (!res) return null;
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  return res;
}

function safeNum(v, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmt1(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}

function fmt2(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

const TranscriptPage = () => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [semesterRange, setSemesterRange] = useState({ from: null, to: null });

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const response = await transcriptService.getPreview(semesterRange);
      const payload = parsePreviewPayload(response);
      setPreview(payload);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải bảng điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await transcriptService.downloadTranscript(semesterRange);
      toast.success('Tải bảng điểm thành công!');
    } catch (err) {
      toast.error('Không thể tải bảng điểm PDF');
    } finally {
      setDownloading(false);
    }
  };

  const getGPAColor = (gpa) => {
    const n = safeNum(gpa, -1);
    if (n < 0) return 'text-gray-600';
    if (n >= 3.5) return 'text-green-600';
    if (n >= 2.5) return 'text-blue-600';
    if (n >= 2.0) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <button 
            onClick={fetchPreview} 
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold mb-2">Bảng Điểm</h1>
        <p className="text-indigo-100">Xem và tải bảng điểm chính thức</p>
      </div>

      {/* Student Info Card */}
      <div className="mx-4 -mt-4 bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600">
              {preview?.studentInfo?.name?.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{preview?.studentInfo?.name}</h2>
            <p className="text-gray-500">{preview?.studentInfo?.studentCode}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Ngành</p>
            <p className="font-semibold">{preview?.studentInfo?.major}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Khóa</p>
            <p className="font-semibold">K{preview?.studentInfo?.cohort}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">Số tín chỉ</p>
            <p className="font-semibold">{preview?.summary?.totalCredits}</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <p className="text-sm text-indigo-600">GPA Tích lũy (thang 4)</p>
            <p className={`text-2xl font-bold ${getGPAColor(preview?.summary?.cumulativeGPA)}`}>
              {preview?.summary?.cumulativeGPA ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* GPA Chart */}
      <div className="mx-4 mt-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3">GPA qua các học kỳ (thang 4)</h3>
          {preview?.semesters && Object.keys(preview.semesters).length > 0 ? (
            <div className="h-48 flex items-end gap-2 justify-around">
              {Object.values(preview.semesters).map((sem) => {
                const gpa = safeNum(sem.semesterGPA, 0);
                const height = Math.min(100, Math.max(0, (gpa / 4.0) * 100));
                const color =
                  gpa >= 3.0 ? 'bg-green-500' : gpa >= 2.0 ? 'bg-amber-500' : 'bg-red-500';

                return (
                  <div key={sem.semester} className="flex flex-col items-center flex-1 min-w-0">
                    <div className="w-full relative" style={{ height: '160px' }}>
                      <div
                        className={`absolute bottom-0 w-full rounded-t-lg ${color}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap">
                        {fmt1(gpa)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">HK{sem.semester}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              Chưa có học phần đã chốt điểm để hiển thị biểu đồ. Khi có điểm tổng kết đã được xác nhận, biểu đồ sẽ hiện tại đây.
            </p>
          )}
        </div>
      </div>

      {/* Semester Details */}
      <div className="mx-4 mt-6 space-y-4">
        {preview?.semesters && Object.keys(preview.semesters).length > 0 ? (
          Object.values(preview.semesters).map((sem) => (
            <div key={sem.semester} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h4 className="font-semibold">Học kỳ {sem.semester}</h4>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    GPA:{' '}
                    <span className={`font-bold ${getGPAColor(sem.semesterGPA)}`}>
                      {fmt2(sem.semesterGPA)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">{sem.totalCredits ?? 0} tín chỉ</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Môn học</th>
                      <th className="px-4 py-2 text-center">Tín chỉ</th>
                      <th className="px-4 py-2 text-center">Điểm (10)</th>
                      <th className="px-4 py-2 text-center">Thang 4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(sem.courses || []).map((course, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <p className="font-medium">{course.code || '—'}</p>
                          <p className="text-xs text-gray-500">{course.name || ''}</p>
                        </td>
                        <td className="px-4 py-2 text-center">{course.credits ?? '—'}</td>
                        <td className="px-4 py-2 text-center font-semibold">
                          {course.grade != null && course.grade !== '' ? fmt1(course.grade) : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">{fmt1(course.gradePoint)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-600 text-sm">
            Chưa có dòng điểm nào trong bảng điểm (cần điểm đã chốt và đã xác nhận).
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="mx-4 mt-6">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Tải Bảng Điểm PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TranscriptPage;
