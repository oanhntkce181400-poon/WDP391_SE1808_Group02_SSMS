import { useState, useEffect } from 'react';
import gradesService from '../../services/gradesService';

export default function ViewGradesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await gradesService.getMyGrades();
      if (res?.data?.success) {
        setGradesData(res.data.data);
        // Select first semester by default
        if (res.data.data?.semesters?.length > 0) {
          setSelectedSemester(res.data.data.semesters[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
      setError(err?.response?.data?.message || 'Không thể tải danh sách điểm');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách điểm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Lỗi</p>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchGrades}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { semesters = [], groupedBySemester = {}, totalGrades = 0 } = gradesData || {};

  // Get enrollments for selected semester
  const currentSemesterData = selectedSemester
    ? groupedBySemester[selectedSemester]
    : null;

  const enrollments = currentSemesterData?.enrollments || [];

  // Filter enrollments by search term
  const filteredEnrollments = enrollments.filter((enrollment) =>
    enrollment.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate GPA for selected semester
  const calculateSemesterGPA = () => {
    if (filteredEnrollments.length === 0) return 0;
    let totalCredits = 0;
    let weightedSum = 0;
    filteredEnrollments.forEach((e) => {
      if (e.credits > 0 && e.grade !== null) {
        totalCredits += e.credits;
        weightedSum += e.grade * e.credits;
      }
    });
    return totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0;
  };

  const semesterGPA = calculateSemesterGPA();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Xem điểm học tập</h1>
        <p className="mt-2 text-gray-600">
          Tổng cộng: <span className="font-semibold">{totalGrades}</span> môn học
        </p>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Semester Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn kỳ học</label>
          <select
            value={selectedSemester || ''}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Tất cả kỳ --</option>
            {semesters.map((sem) => (
              <option key={sem} value={sem}>
                {groupedBySemester[sem]?.semesterDisplay}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm môn học</label>
          <input
            type="text"
            placeholder="Nhập mã hoặc tên môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Semester GPA Card */}
      {selectedSemester && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-700 font-medium">
            {groupedBySemester[selectedSemester]?.semesterDisplay}
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {semesterGPA}
          </p>
          <p className="text-xs text-blue-600 mt-1">Điểm trung bình học kỳ</p>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {filteredEnrollments.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p className="text-lg">Chưa có dữ liệu</p>
            <p className="text-sm mt-2">
              {!selectedSemester
                ? 'Vui lòng chọn một kỳ học'
                : 'Không tìm thấy môn học phù hợp'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header info */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredEnrollments.length}</span> môn
                {searchTerm && ` phù hợp với tìm kiếm`}
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mã môn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tên môn học
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tín chỉ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      GK
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      CK
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      BT
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      QT
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Điểm
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEnrollments.map((enrollment, idx) => (
                    <tr
                      key={enrollment._id || idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                        {enrollment.subjectCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{enrollment.subjectName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {enrollment.classCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {enrollment.credits}
                      </td>
                      <td className={`px-6 py-4 text-center text-sm ${
                        enrollment.midtermScore === null
                          ? 'text-gray-500'
                          : gradesService.getScoreColor(enrollment.midtermScore)
                      }`}>
                        {gradesService.formatScore(enrollment.midtermScore)}
                      </td>
                      <td className={`px-6 py-4 text-center text-sm ${
                        enrollment.finalScore === null
                          ? 'text-gray-500'
                          : gradesService.getScoreColor(enrollment.finalScore)
                      }`}>
                        {gradesService.formatScore(enrollment.finalScore)}
                      </td>
                      <td className={`px-6 py-4 text-center text-sm ${
                        enrollment.assignmentScore === null
                          ? 'text-gray-500'
                          : gradesService.getScoreColor(enrollment.assignmentScore)
                      }`}>
                        {gradesService.formatScore(enrollment.assignmentScore)}
                      </td>
                      <td className={`px-6 py-4 text-center text-sm ${
                        enrollment.continuousScore === null
                          ? 'text-gray-500'
                          : gradesService.getScoreColor(enrollment.continuousScore)
                      }`}>
                        {gradesService.formatScore(enrollment.continuousScore)}
                      </td>
                      <td className={`px-6 py-4 text-center text-sm font-semibold ${
                        gradesService.getScoreColor(enrollment.grade)
                      }`}>
                        {gradesService.formatScore(enrollment.grade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer - Summary */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Tổng tín chỉ</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {filteredEnrollments.reduce((sum, e) => sum + e.credits, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Số môn học</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {filteredEnrollments.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Điểm trung bình</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(
                      filteredEnrollments.reduce((sum, e) => sum + (e.grade || 0), 0) /
                      filteredEnrollments.length
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">GPA</p>
                  <p className="text-lg font-semibold text-blue-600">{semesterGPA}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <p className="text-sm font-semibold text-blue-900 mb-3">📝 Hướng dẫn cột dữ liệu:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
          <div>
            <span className="font-semibold">GK:</span> Điểm giữa kỳ (30%)
          </div>
          <div>
            <span className="font-semibold">CK:</span> Điểm cuối kỳ (50%)
          </div>
          <div>
            <span className="font-semibold">BT:</span> Điểm bài tập/thực hành (20%)
          </div>
          <div>
            <span className="font-semibold">QT:</span> Điểm quá trình (tùy chọn)
          </div>
          <div className="md:col-span-2">
            <span className="font-semibold">Điểm:</span> Điểm tổng kết = (GK×0.3 + CK×0.5 + BT×0.2)
          </div>
        </div>
      </div>
    </div>
  );
}
