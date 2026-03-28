import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import gradesService from '../../services/gradesService';

export default function GradeDistributionReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'pie'

  // Colors for grade distribution
  const COLORS = {
    'Xuất sắc (8.5-10)': '#16a34a',
    'Giỏi (8.0-8.4)': '#0ea5e9',
    'Khá (7.0-7.9)': '#10b981',
    'Trung bình (5.5-6.9)': '#f59e0b',
    'Yếu (4.0-5.4)': '#f97316',
    'Kém (< 4.0)': '#dc2626',
    'Chưa có điểm': '#9ca3af'
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {};
      if (selectedSemester) filters.semester = selectedSemester;
      if (selectedAcademicYear) filters.academicYear = selectedAcademicYear;

      const res = await gradesService.getGradeDistributionReport(filters);
      if (res?.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err?.response?.data?.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleApplyFilter = () => {
    fetchReport();
  };

  // Prepare data for chart
  const chartData = reportData?.distribution 
    ? Object.entries(reportData.distribution).map(([label, value]) => ({
        name: label,
        value: value
      }))
    : [];

  // Format statistics
  const stats = reportData?.statistics || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Báo Cáo Phân Bố Điểm</h1>
          <p className="text-gray-600 mt-2">Thống kê phân bố điểm sinh viên theo các khoảng xếp loại</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lọc Dữ Liệu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kỳ Học</label>
              <input
                type="text"
                placeholder="Nhập kỳ học (VD: 1)"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Năm Học</label>
              <input
                type="text"
                placeholder="Nhập năm học (VD: 2024-2025)"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleApplyFilter}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Đang tải...' : 'Áp dụng bộ lọc'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600">Đang tải báo cáo...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && reportData && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-gray-600 text-sm">Tổng số enrollment</p>
                <p className="text-2xl font-bold text-gray-900">{stats.count || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-gray-600 text-sm">Điểm trung bình</p>
                <p className="text-2xl font-bold text-blue-600">{stats.average || '0.00'}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-gray-600 text-sm">Tỉ lệ đạt</p>
                <p className="text-2xl font-bold text-green-600">{stats.passRate || '0%'}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-gray-600 text-sm">Độ lệch chuẩn</p>
                <p className="text-2xl font-bold text-orange-600">{stats.stdev || '0.00'}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Phân Bố Điểm</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      chartType === 'bar'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Biểu đồ cột
                  </button>
                  <button
                    onClick={() => setChartType('pie')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      chartType === 'pie'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Biểu đồ tròn
                  </button>
                </div>
              </div>

              {chartType === 'bar' ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chi Tiết Danh Sách Enrollment</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Mã SV</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Họ Tên</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Ngành</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Mã Môn</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Tên Môn</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Kỳ</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Điểm</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Xếp Loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.enrollments && reportData.enrollments.length > 0 ? (
                      reportData.enrollments.map((enrollment, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{enrollment.studentCode}</td>
                          <td className="px-4 py-3 text-gray-900">{enrollment.studentName}</td>
                          <td className="px-4 py-3 text-gray-700">{enrollment.major}</td>
                          <td className="px-4 py-3 text-gray-700">{enrollment.subjectCode}</td>
                          <td className="px-4 py-3 text-gray-700">{enrollment.subjectName}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{enrollment.semester}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${
                              typeof enrollment.grade !== 'number' ? 'text-gray-500' :
                              enrollment.grade >= 8.5 ? 'text-green-600' :
                              enrollment.grade >= 8.0 ? 'text-blue-600' :
                              enrollment.grade >= 7.0 ? 'text-green-600' :
                              enrollment.grade >= 5.5 ? 'text-yellow-600' :
                              enrollment.grade >= 4.0 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {typeof enrollment.grade === 'number' ? enrollment.grade.toFixed(2) : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{enrollment.gradeName}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-4 py-4 text-center text-gray-600">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
