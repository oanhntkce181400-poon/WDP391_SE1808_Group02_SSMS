import React, { useState } from 'react';
import feedbackService from '../../services/feedbackService';

const FeedbackForm = ({ classSection, onSuccess, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [criteria, setCriteria] = useState({
    teachingQuality: 0,
    courseContent: 0,
    classEnvironment: 0,
    materialQuality: 0
  });
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      setError('Vui lòng đánh giá sao');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        classSection: classSection._id || classSection,
        rating,
        comment: comment.trim(),
        criteria: Object.keys(criteria).some(k => criteria[k] > 0) ? criteria : undefined,
        isAnonymous
      };

      await feedbackService.submitFeedback(payload);

      setSuccess(true);
      setRating(0);
      setComment('');
      setCriteria({
        teachingQuality: 0,
        courseContent: 0,
        classEnvironment: 0,
        materialQuality: 0
      });

      if (onSuccess) onSuccess();

      // Auto close after 2 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (value, setter, hoverValue, setHoverValue) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setter(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className="focus:outline-none transition transform hover:scale-110"
          >
            <span
              className={`text-4xl ${
                star <= (hoverValue || value)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }`}
            >
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
          <div className="text-center">
            <div className="text-5xl mb-4">✓</div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">Cảm ơn bạn!</h3>
            <p className="text-gray-600">Đánh giá của bạn đã được gửi thành công</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">📝 Đánh giá Lớp Học</h2>
      <p className="text-gray-600 mb-6">
        {classSection?.subjectCode ? `${classSection.subjectCode} - ${classSection.className}` : 'Lớp học'}
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Rating */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Đánh giá chung <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            {renderStars(rating, setRating, hoverRating, setHoverRating)}
            <span className="text-lg font-semibold text-gray-700 min-w-16">
              {rating ? `${rating}/5` : 'Chọn sao'}
            </span>
          </div>
        </div>

        {/* Criteria Ratings */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Đánh giá chi tiết (Tùy chọn)</h3>
          <div className="space-y-4">
            {[
              { key: 'teachingQuality', label: '👨‍🏫 Chất lượng giảng dạy' },
              { key: 'courseContent', label: '📚 Nội dung bài học' },
              { key: 'classEnvironment', label: '🏫 Môi trường lớp học' },
              { key: 'materialQuality', label: '📄 Chất lượng tài liệu' }
            ].map(item => (
              <div key={item.key}>
                <label className="block text-sm text-gray-700 mb-2">{item.label}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCriteria({ ...criteria, [item.key]: star })}
                      className="focus:outline-none transition"
                    >
                      <span
                        className={`text-2xl ${
                          star <= criteria[item.key]
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="border-t pt-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            💬 Ý kiến đóng góp
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Chia sẻ ý kiến của bạn về lớp học (không bắt buộc)..."
          />
          <div className="mt-2 text-xs text-gray-600">
            {comment.length} / 1000 ký tự
          </div>
        </div>

        {/* Anonymous Toggle */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-700">
              🔒 Gửi đánh giá ẩn danh (Không hiển thị tên)
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-6 flex gap-3 justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              disabled={loading}
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading || !rating}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Đang gửi...
              </>
            ) : (
              <>
                <span>✓</span>
                Gửi Đánh giá
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;
