import React, { useState, useEffect } from 'react';
import feedbackService from '../../services/feedbackService';
import SubmittedFeedbackItem from './SubmittedFeedbackItem';

/**
 * My Submitted Feedbacks Component
 * Shows all feedbacks submitted by the student
 */
const MySubmittedFeedbacks = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => {
    loadMyFeedbacks();
  }, []);

  const loadMyFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await feedbackService.getMyFeedback();
      // API returns { success: true, data: feedbacks }
      const feedbacksData = response.data?.data || response.data || [];
      setFeedbacks(Array.isArray(feedbacksData) ? feedbacksData : []);
      setError(null);
    } catch (err) {
      console.error('Error loading feedbacks:', err);
      setError('Lỗi tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackUpdate = () => {
    loadMyFeedbacks();
  };

  const handleFeedbackDelete = () => {
    loadMyFeedbacks();
  };

  const filteredFeedbacks = filterClass
    ? feedbacks.filter(f => f.classSection?._id === filterClass)
    : feedbacks;

  const classes = [...new Map(feedbacks.map(f => [
    f.classSection?._id,
    f.classSection
  ])).values()];

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-lg text-gray-600">⏳ Đang tải các đánh giá của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📋 Các Đánh Giá Của Tôi</h2>
        <p className="text-gray-600 mt-2">
          Quản lý và chỉnh sửa các đánh giá đã gửi (trong thời hạn cho phép)
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ {error}
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-600 text-lg">
            Bạn chưa gửi đánh giá nào
          </p>
          <p className="text-gray-500 mt-2">
            Hãy truy cập tab "Gửi Đánh Giá" để bắt đầu
          </p>
        </div>
      ) : (
        <>
          {/* Filter */}
          {classes.length > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lọc theo lớp học
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả các lớp học</option>
                {classes.map(cls => (
                  <option key={cls?._id} value={cls?._id}>
                    {cls?.subjectCode} - {cls?.className}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-gray-600 text-sm">Tổng số đánh giá</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{feedbacks.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-gray-600 text-sm">Số lớp học đã đánh giá</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{classes.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-gray-600 text-sm">Đánh giá trung bình</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)} ⭐
              </p>
            </div>
          </div>

          {/* Feedback List */}
          <div>
            {filteredFeedbacks.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">Không tìm thấy đánh giá cho lớp này</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedbacks.map(feedback => (
                  <SubmittedFeedbackItem
                    key={feedback._id}
                    feedback={feedback}
                    onUpdate={handleFeedbackUpdate}
                    onDelete={handleFeedbackDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MySubmittedFeedbacks;
