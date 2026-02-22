import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import feedbackStatisticsService from '../../services/feedbackStatisticsService';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

const FeedbackStatisticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [templateId, setTemplateId] = useState(null);
  const [templateStats, setTemplateStats] = useState(null);
  const [teacherComparison, setTeacherComparison] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [rangeStats, setRangeStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeacherComparison();
  }, []);

  const loadTeacherComparison = async () => {
    try {
      setLoading(true);
      const result = await feedbackStatisticsService.getTeacherComparison(10);
      setTeacherComparison(result.data.data || []);
    } catch (err) {
      console.error('Error loading teacher comparison:', err);
      setError('Lỗi tải dữ liệu giáo viên');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateStatistics = async (id) => {
    try {
      setLoading(true);
      const result = await feedbackStatisticsService.getTemplateStatistics(id);
      setTemplateStats(result.data.data || null);
    } catch (err) {
      console.error('Error loading template statistics:', err);
      setError('Lỗi tải thống kê template');
    } finally {
      setLoading(false);
    }
  };

  const loadDateRangeStatistics = async () => {
    try {
      setLoading(true);
      const result = await feedbackStatisticsService.getStatisticsByDateRange(
        dateRange.startDate,
        dateRange.endDate
      );
      setRangeStats(result.data.data || null);
    } catch (err) {
      console.error('Error loading date range statistics:', err);
      setError('Lỗi tải thống kê theo khoảng thời gian');
    } finally {
      setLoading(false);
    }
  };

  const getRatingDistributionData = () => {
    if (!templateStats?.questionStatistics) return [];

    const ratingQuestion = Object.values(templateStats.questionStatistics).find(
      q => q.questionType === 'rating'
    );

    if (!ratingQuestion?.distribution) return [];

    return Object.entries(ratingQuestion.distribution).map(([rating, count]) => ({
      name: `${rating} sao`,
      value: count
    }));
  };

  const getCategoryDistributionData = () => {
    if (!templateStats?.questionStatistics) return [];

    const categories = { 'Rất tốt': 0, 'Tốt': 0, 'Trung bình': 0, 'Cần cải thiện': 0 };

    Object.values(templateStats.questionStatistics).forEach(q => {
      if (q.average) {
        const avg = parseFloat(q.average);
        if (avg >= 4.5) categories['Rất tốt']++;
        else if (avg >= 3.5) categories['Tốt']++;
        else if (avg >= 2.5) categories['Trung bình']++;
        else categories['Cần cải thiện']++;
      }
    });

    return Object.entries(categories).map(([name, count]) => ({ name, value: count }));
  };

  const getTeacherComparisonData = () => {
    return teacherComparison.map((t, idx) => ({
      name: `GV ${idx + 1}`,
      gpa: parseFloat(t.gpa),
      feedback: t.totalFeedback
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Thống kê Đánh giá</h1>
          <p className="text-gray-600 mt-2">Dashboard tổng hợp các chỉ số đánh giá và phân tích</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8" aria-label="Tabs">
            {['overview', 'template', 'teachers', 'trends'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' && '📈 Tổng quan'}
                {tab === 'template' && '📋 Template'}
                {tab === 'teachers' && '👨‍🏫 Giáo viên'}
                {tab === 'trends' && '📅 Xu hướng'}
              </button>
            ))}
          </nav>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⚙️</div>
            <p className="text-gray-600 mt-2">Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Tab Content */}
        {!loading && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">Tổng giáo viên</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {teacherComparison.length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">GPA trung bình</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {teacherComparison.length > 0
                        ? (
                          teacherComparison.reduce((sum, t) => sum + parseFloat(t.gpa), 0) /
                          teacherComparison.length
                        ).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">Top GPA</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {teacherComparison.length > 0 ? teacherComparison[0].gpa : '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-sm">Tổng số đánh giá</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {teacherComparison.reduce((sum, t) => sum + t.totalFeedback, 0)}
                    </p>
                  </div>
                </div>

                {/* Teacher Comparison Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Xếp hạng Giáo viên (Top 10)</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getTeacherComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="gpa" fill="#3b82f6" name="GPA" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Template Tab */}
            {activeTab === 'template' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn Template để xem thống kê
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập Template ID"
                    value={templateId || ''}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => templateId && loadTemplateStatistics(templateId)}
                    className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Tải thống kê
                  </button>
                </div>

                {templateStats && (
                  <>
                    {/* Overall Average */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <p className="text-gray-600 text-sm">Tổng số đánh giá</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {templateStats.totalSubmissions}
                        </p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <p className="text-gray-600 text-sm">GPA trung bình</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {templateStats.overallAverage.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Rating Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố Đánh giá</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={getRatingDistributionData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {getRatingDistributionData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân loại Tiêu chí</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getCategoryDistributionData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Question Details */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết Câu hỏi</h3>
                      <div className="space-y-3">
                        {Object.values(templateStats.questionStatistics).map((q) => (
                          <div key={q.questionId} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{q.questionText}</p>
                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                {q.questionType === 'rating' && q.average
                                  ? `GPA: ${q.average}`
                                  : `Responses: ${q.totalResponses}`}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {q.questionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                            Xếp hạng
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                            GPA
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                            Số đánh giá
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {teacherComparison.map((teacher, idx) => (
                          <tr key={teacher.teacherId} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="text-lg font-bold text-blue-600">#{idx + 1}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-lg font-bold text-green-600">{teacher.gpa}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{teacher.totalFeedback}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  teacher.gpa >= 4
                                    ? 'bg-green-100 text-green-800'
                                    : teacher.gpa >= 3.5
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {teacher.gpa >= 4 ? '⭐ Xuất sắc' : teacher.gpa >= 3.5 ? '✓ Tốt' : '⚠️ Cần cải thiện'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lựa chọn khoảng thời gian</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                      <input
                        type="date"
                        value={dateRange.startDate.toISOString().split('T')[0]}
                        onChange={(e) =>
                          setDateRange({
                            ...dateRange,
                            startDate: new Date(e.target.value)
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                      <input
                        type="date"
                        value={dateRange.endDate.toISOString().split('T')[0]}
                        onChange={(e) =>
                          setDateRange({
                            ...dateRange,
                            endDate: new Date(e.target.value)
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={loadDateRangeStatistics}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Tải dữ liệu
                  </button>
                </div>

                {rangeStats && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <p className="text-gray-600 text-sm">Tổng số đánh giá</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {rangeStats.totalSubmissions}
                        </p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <p className="text-gray-600 text-sm">GPA trung bình</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {parseFloat(rangeStats.averageRating).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng Đánh giá</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={Object.entries(rangeStats.submissionsByDate).map(([date, avg]) => ({
                            date: new Date(date).toLocaleDateString('vi-VN'),
                            average: parseFloat(avg)
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="average"
                            stroke="#8b5cf6"
                            name="GPA"
                            isAnimationActive={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackStatisticsDashboard;
