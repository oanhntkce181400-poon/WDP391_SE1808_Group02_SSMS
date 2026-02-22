import React, { useEffect, useState } from 'react';
import feedbackService from '../../services/feedbackService';
import FeedbackForm from './FeedbackForm';

const ClassFeedbackDisplay = ({ classSection, showForm = true }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadFeedbacks();
    loadStats();
  }, [classSection?._id]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const result = await feedbackService.getClassFeedback(classSection?._id || classSection);
      setFeedbacks(result.data.data || []);
    } catch (err) {
      console.error('Error loading feedbacks:', err);
      setError('Lỗi tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await feedbackService.getClassFeedbackStats(classSection?._id || classSection);
      setStats(result.data.data || null);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleFeedbackSubmitted = () => {
    loadFeedbacks();
    loadStats();
    setShowFeedbackForm(false);
  };

  const getStarColor = (rating) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 2.5) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return <div className="text-center py-8">⏳ Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Thêm Đánh giá</h3>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <FeedbackForm
                classSection={classSection}
                onSuccess={handleFeedbackSubmitted}
                onClose={() => setShowFeedbackForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && stats.totalFeedback > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm">Tổng đánh giá</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalFeedback}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm">Đánh giá trung bình</p>
            <p className={`text-3xl font-bold mt-2 ${getStarColor(stats.averageRating)}`}>
              {stats.averageRating}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm">Cảm xúc</p>
            <p className="text-lg font-semibold text-gray-900 mt-2">{stats.sentiment}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm">5 sao</p>
            <p className="text-2xl font-bold text-yellow-500 mt-2">
              {stats.ratingDistribution?.[5] || 0}
            </p>
          </div>
        </div>
      )}

      {/* Rating Distribution Chart */}
      {stats && stats.totalFeedback > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Phân bố Đánh giá</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-yellow-500 font-semibold w-12">
                  {'★'.repeat(rating)}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                    style={{
                      width: `${
                        stats.totalFeedback > 0
                          ? (stats.ratingDistribution?.[rating] || 0) / stats.totalFeedback * 100
                          : 0
                      }%`
                    }}
                  >
                    {stats.ratingDistribution?.[rating] || 0 > 0
                      ? `${stats.ratingDistribution[rating]}`
                      : ''}
                  </div>
                </div>
                <span className="text-gray-600 text-sm w-12">
                  {stats.ratingDistribution?.[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">💬 Các Đánh giá & Bình luận</h3>
          {showForm && (
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + Thêm Đánh giá
            </button>
          )}
        </div>

        {/* Filter */}
        {feedbacks.length > 0 && (
          <div className="p-4 border-b border-gray-200 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả ({feedbacks.length})
            </button>
            {[5, 4, 3, 2, 1].map(rating => (
              <button
                key={rating}
                onClick={() => setFilter(rating)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  filter === rating
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {'★'.repeat(rating)} ({feedbacks.filter(f => f.rating === rating).length})
              </button>
            ))}
          </div>
        )}

        {/* Feedback Items */}
        <div className="divide-y divide-gray-200">
          {feedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
            </div>
          ) : (
            feedbacks
              .filter(f => filter === 'all' || f.rating === filter)
              .map(feedback => (
                <div key={feedback._id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-yellow-500 text-xl">
                        {'★'.repeat(feedback.rating)}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {feedback.isAnonymous ? '👤 Ẩn danh' : 'Người dùng'}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">
                      {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {feedback.comment && (
                    <p className="text-gray-700 mb-3">{feedback.comment}</p>
                  )}

                  {Object.values(feedback.criteria || {}).some(v => v > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {feedback.criteria?.teachingQuality > 0 && (
                        <div className="text-gray-600">
                          <span className="font-medium">👨‍🏫 Giảng dạy:</span> {feedback.criteria.teachingQuality}/5
                        </div>
                      )}
                      {feedback.criteria?.courseContent > 0 && (
                        <div className="text-gray-600">
                          <span className="font-medium">📚 Nội dung:</span> {feedback.criteria.courseContent}/5
                        </div>
                      )}
                      {feedback.criteria?.classEnvironment > 0 && (
                        <div className="text-gray-600">
                          <span className="font-medium">🏫 Môi trường:</span> {feedback.criteria.classEnvironment}/5
                        </div>
                      )}
                      {feedback.criteria?.materialQuality > 0 && (
                        <div className="text-gray-600">
                          <span className="font-medium">📄 Tài liệu:</span> {feedback.criteria.materialQuality}/5
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassFeedbackDisplay;
