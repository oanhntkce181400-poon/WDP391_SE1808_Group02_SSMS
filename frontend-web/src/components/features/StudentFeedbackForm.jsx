import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import feedbackTemplateService from '../../services/feedbackTemplateService';
import feedbackStatisticsService from '../../services/feedbackStatisticsService';

const StudentFeedbackForm = ({ isOpen, onClose, templateId, onSuccess }) => {
  const [template, setTemplate] = useState(null);
  const [responses, setResponses] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (templateId && isOpen) {
      loadTemplate();
    }
  }, [templateId, isOpen]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      // Try to get template - you may need to adjust this based on your API
      // For now, assume template info is available
      const result = await feedbackTemplateService.getFeedbackTemplates({
        limit: 1,
        skip: 0
      });

      if (result.data.data && result.data.data.length > 0) {
        const tmpl = result.data.data.find(t => t._id === templateId);
        if (tmpl) {
          setTemplate(tmpl);
          initializeResponses(tmpl);
        }
      }
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Lỗi tải template');
    } finally {
      setLoading(false);
    }
  };

  const initializeResponses = (template) => {
    const initialResponses = template.questions.map(q => ({
      questionId: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      answer: ''
    }));
    setResponses(initialResponses);
  };

  const handleResponseChange = (index, value) => {
    const newResponses = [...responses];
    newResponses[index].answer = value;
    setResponses(newResponses);
  };

  const validateForm = () => {
    if (!teacherId.trim()) {
      setError('Vui lòng chọn giáo viên cần đánh giá');
      return false;
    }

    for (const response of responses) {
      const question = template.questions.find(q => q._id === response.questionId);
      if (question?.required && !response.answer) {
        setError(`Vui lòng trả lời câu: ${response.questionText}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        feedbackTemplateId: templateId,
        evaluatedEntityId: teacherId,
        evaluationType: 'teacher',
        responses: responses.filter(r => r.answer)
      };

      await feedbackStatisticsService.submitFeedback(payload);
      setError(null);
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResponses([]);
    setTeacherId('');
    setError(null);
    onClose();
  };

  const renderQuestion = (question, response, index) => {
    switch (question.questionType) {
      case 'rating':
        return (
          <div key={question._id} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              {question.questionText}
              {question.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleResponseChange(index, star.toString())}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    parseInt(response.answer) >= star
                      ? 'bg-yellow-400 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-yellow-200'
                  }`}
                >
                  {star}★
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {response.answer && `Đã chọn: ${response.answer} sao`}
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={question._id} className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {question.questionText}
              {question.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={response.answer}
              onChange={(e) => handleResponseChange(index, e.target.value)}
              maxLength={question.maxLength || 500}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập ý kiến của bạn..."
            />
            <div className="mt-1 text-xs text-gray-600">
              {response.answer.length} / {question.maxLength || 500} ký tự
            </div>
          </div>
        );

      case 'multipleChoice':
        return (
          <div key={question._id} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              {question.questionText}
              {question.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {question.options?.map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={`question_${question._id}`}
                    value={option.value}
                    checked={response.answer === option.value}
                    onChange={(e) => handleResponseChange(index, e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="📝 Đánh giá Giáo viên" size="lg">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && !template ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : template ? (
          <>
            {/* Template Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900">{template.templateName}</h3>
              <p className="text-sm text-blue-800 mt-1">{template.description}</p>
            </div>

            {/* Teacher Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Chọn Giáo viên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nhập ID hoặc tên giáo viên"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Questions */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-4">Câu hỏi đánh giá</h4>
              <div className="space-y-4">
                {template.questions.map((question, index) => (
                  renderQuestion(question, responses[index], index)
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end border-t pt-4">
              <button
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '⏳ Đang gửi...' : '✓ Gửi Đánh giá'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};

export default StudentFeedbackForm;
