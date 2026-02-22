import React, { useState, useEffect } from 'react';
import feedbackService from '../../services/feedbackService';
import CountdownTimer from './CountdownTimer';

/**
 * Submitted Feedback Item Component
 * Shows a submitted feedback with edit/delete options
 * Only allows edit/delete if within feedback window
 */
const SubmittedFeedbackItem = ({ feedback, onUpdate, onDelete }) => {
  const [windowInfo, setWindowInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    rating: feedback.rating,
    comment: feedback.comment || '',
    criteria: {
      teachingQuality: feedback.criteria?.teachingQuality || 0,
      courseContent: feedback.criteria?.courseContent || 0,
      classEnvironment: feedback.criteria?.classEnvironment || 0,
      materialQuality: feedback.criteria?.materialQuality || 0
    }
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadWindowInfo();
  }, []);

  const loadWindowInfo = async () => {
    try {
      const response = await feedbackService.getFeedbackWindowInfo(feedback._id);
      // API returns { success: true, data: windowInfo }
      const windowData = response.data?.data || response.data;
      setWindowInfo(windowData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading window info:', err);
      setWindowInfo({ isValid: false, error: 'Không thể kiểm tra thời gian' });
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setError(null);
      await feedbackService.updateFeedback(feedback._id, editData);
      setSuccess(true);
      setIsEditing(false);
      if (onUpdate) onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi cập nhật đánh giá');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn chắc chắn muốn xóa đánh giá này?')) return;

    try {
      setError(null);
      await feedbackService.deleteFeedback(feedback._id);
      setSuccess(true);
      if (onDelete) onDelete();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xóa đánh giá');
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">⏳ Đang tải...</div>;
  }

  const canEdit = windowInfo?.isValid === true;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {feedback.classSection?.subjectCode}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {feedback.classSection?.className}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl">
            {'⭐'.repeat(feedback.rating)}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      {/* Window Info */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          {windowInfo?.isValid ? (
            <CountdownTimer 
              remainingMs={windowInfo.remainingMs}
              onExpired={() => setWindowInfo({ ...windowInfo, isValid: false })}
            />
          ) : (
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              ❌ Hết hạn chỉnh sửa
            </span>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing && canEdit ? (
        <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating (1-5 sao)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setEditData({ ...editData, rating: star })}
                  className="focus:outline-none"
                >
                  <span className={`text-3xl ${star <= editData.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ý kiến
            </label>
            <textarea
              value={editData.comment}
              onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
              maxLength={1000}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Chia sẻ ý kiến của bạn..."
            />
          </div>

          {/* Criteria Ratings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Teaching Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chất lượng giảng dạy
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={`teach-${star}`}
                    onClick={() => setEditData({
                      ...editData,
                      criteria: { ...editData.criteria, teachingQuality: star }
                    })}
                    className="focus:outline-none"
                  >
                    <span className={`text-2xl ${
                      star <= (editData.criteria?.teachingQuality || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Course Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nội dung khóa học
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={`content-${star}`}
                    onClick={() => setEditData({
                      ...editData,
                      criteria: { ...editData.criteria, courseContent: star }
                    })}
                    className="focus:outline-none"
                  >
                    <span className={`text-2xl ${
                      star <= (editData.criteria?.courseContent || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Class Environment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Môi trường lớp học
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={`env-${star}`}
                    onClick={() => setEditData({
                      ...editData,
                      criteria: { ...editData.criteria, classEnvironment: star }
                    })}
                    className="focus:outline-none"
                  >
                    <span className={`text-2xl ${
                      star <= (editData.criteria?.classEnvironment || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Material Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chất lượng tài liệu
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={`material-${star}`}
                    onClick={() => setEditData({
                      ...editData,
                      criteria: { ...editData.criteria, materialQuality: star }
                    })}
                    className="focus:outline-none"
                  >
                    <span className={`text-2xl ${
                      star <= (editData.criteria?.materialQuality || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ✓ Lưu
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-medium"
            >
              ✕ Hủy
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Display Mode */}
          {feedback.comment && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-800">{feedback.comment}</p>
            </div>
          )}

          {/* Criteria */}
          {feedback.criteria && Object.keys(feedback.criteria).some(k => feedback.criteria[k]) && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              {feedback.criteria.teachingQuality && (
                <div className="text-sm">
                  <p className="text-gray-600">Chất lượng giảng dạy</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {'⭐'.repeat(feedback.criteria.teachingQuality)}
                  </p>
                </div>
              )}
              {feedback.criteria.courseContent && (
                <div className="text-sm">
                  <p className="text-gray-600">Nội dung khóa học</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {'⭐'.repeat(feedback.criteria.courseContent)}
                  </p>
                </div>
              )}
              {feedback.criteria.classEnvironment && (
                <div className="text-sm">
                  <p className="text-gray-600">Môi trường lớp học</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {'⭐'.repeat(feedback.criteria.classEnvironment)}
                  </p>
                </div>
              )}
              {feedback.criteria.materialQuality && (
                <div className="text-sm">
                  <p className="text-gray-600">Chất lượng tài liệu</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {'⭐'.repeat(feedback.criteria.materialQuality)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            {canEdit ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  ✎ Sửa
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
                >
                  🗑️ Xóa
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Không thể chỉnh sửa sau hết hạn
              </p>
            )}
          </div>
        </>
      )}

      {/* Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Thành công
        </div>
      )}
    </div>
  );
};

export default SubmittedFeedbackItem;
