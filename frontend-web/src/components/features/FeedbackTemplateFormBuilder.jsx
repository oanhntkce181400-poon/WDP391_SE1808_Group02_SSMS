// Feedback Template Form Builder - Main component for creating/editing feedback templates (Tasks #155)
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';
import feedbackTemplateService from '../../services/feedbackTemplateService';
import FeedbackQuestionEditor from './FeedbackQuestionEditor';

export default function FeedbackTemplateFormBuilder({ isOpen, onClose, onSuccess, templateData = null, loading = false }) {
  const [formData, setFormData] = useState({
    templateName: '',
    description: '',
    feedbackStartDate: '',
    feedbackEndDate: '',
    status: 'draft',
    evaluationTarget: 'teacher',
    subject: '',
    classSection: '',
    questions: []
  });

  const [errors, setErrors] = useState({});
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load template data when editing
  useEffect(() => {
    if (templateData) {
      setFormData({
        templateName: templateData.templateName || '',
        description: templateData.description || '',
        feedbackStartDate: formatDateForInput(templateData.feedbackPeriod?.startDate),
        feedbackEndDate: formatDateForInput(templateData.feedbackPeriod?.endDate),
        status: templateData.status || 'draft',
        evaluationTarget: templateData.evaluationTarget || 'teacher',
        subject: templateData.subject?._id || '',
        classSection: templateData.classSection?._id || '',
        questions: templateData.questions || []
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [templateData, isOpen]);

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setFormData({
      templateName: '',
      description: '',
      feedbackStartDate: '',
      feedbackEndDate: '',
      status: 'draft',
      evaluationTarget: 'teacher',
      subject: '',
      classSection: '',
      questions: []
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.templateName.trim()) {
      newErrors.templateName = 'Tên mẫu đánh giá là bắt buộc';
    }
    if (!formData.feedbackStartDate) {
      newErrors.feedbackStartDate = 'Ngày bắt đầu là bắt buộc';
    }
    if (!formData.feedbackEndDate) {
      newErrors.feedbackEndDate = 'Ngày kết thúc là bắt buộc';
    }
    if (formData.feedbackStartDate && formData.feedbackEndDate) {
      if (new Date(formData.feedbackStartDate) >= new Date(formData.feedbackEndDate)) {
        newErrors.feedbackEndDate = 'Ngày kết thúc phải sau ngày bắt đầu';
      }
    }
    if (formData.questions.length === 0) {
      newErrors.questions = 'Mẫu phải có ít nhất một câu hỏi';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddQuestion = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion(null);
    setShowQuestionEditor(true);
  };

  const handleEditQuestion = (index) => {
    setEditingQuestionIndex(index);
    setCurrentQuestion({ ...formData.questions[index] });
    setShowQuestionEditor(true);
  };

  const handleSaveQuestion = (question) => {
    const newQuestions = [...formData.questions];
    if (editingQuestionIndex !== null) {
      newQuestions[editingQuestionIndex] = {
        ...question,
        displayOrder: editingQuestionIndex + 1
      };
    } else {
      newQuestions.push({
        ...question,
        displayOrder: newQuestions.length + 1
      });
    }
    setFormData(prev => ({
      ...prev,
      questions: newQuestions
    }));
    setShowQuestionEditor(false);
    setCurrentQuestion(null);
  };

  const handleDeleteQuestion = (index) => {
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...formData.questions];
    if (direction === 'up' && index > 0) {
      [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
    } else if (direction === 'down' && index < newQuestions.length - 1) {
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    }
    setFormData(prev => ({
      ...prev,
      questions: newQuestions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Convert dates to ISO string format
      const startDate = new Date(formData.feedbackStartDate);
      const endDate = new Date(formData.feedbackEndDate);

      const payload = {
        templateName: formData.templateName.trim(),
        description: formData.description.trim(),
        feedbackStartDate: startDate.toISOString(),
        feedbackEndDate: endDate.toISOString(),
        status: formData.status,
        evaluationTarget: formData.evaluationTarget,
        subject: formData.subject || null,
        classSection: formData.classSection || null,
        questions: formData.questions
      };

      if (templateData?._id) {
        await feedbackTemplateService.updateFeedbackTemplate(templateData._id, payload);
      } else {
        await feedbackTemplateService.createFeedbackTemplate(payload);
      }

      onSuccess?.();
      onClose?.();
      resetForm();
    } catch (error) {
      console.error('Error saving feedback template:', error);
      setErrors({ submit: error.response?.data?.message || 'Lỗi khi lưu mẫu đánh giá' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {templateData ? 'Chỉnh sửa mẫu đánh giá' : 'Tạo mẫu đánh giá mới'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <img src={closeIcon} alt="Close" width={24} height={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800">Thông tin cơ bản</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên mẫu đánh giá *
                </label>
                <input
                  type="text"
                  name="templateName"
                  value={formData.templateName}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Đánh giá chất lượng giảng dạy - Học kỳ 1"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    errors.templateName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.templateName && <p className="text-red-500 text-sm mt-1">{errors.templateName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả chi tiết về mẫu đánh giá này"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đối tượng đánh giá *
                  </label>
                  <select
                    name="evaluationTarget"
                    value={formData.evaluationTarget}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                  >
                    <option value="teacher">Giáo viên</option>
                    <option value="course">Khóa học</option>
                    <option value="program">Chương trình</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                  >
                    <option value="draft">Dự thảo</option>
                    <option value="active">Đang mở</option>
                    <option value="closed">Đã đóng</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Time Period Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800">Thời gian đánh giá</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    name="feedbackStartDate"
                    value={formData.feedbackStartDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      errors.feedbackStartDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.feedbackStartDate && <p className="text-red-500 text-sm mt-1">{errors.feedbackStartDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày kết thúc *
                  </label>
                  <input
                    type="date"
                    name="feedbackEndDate"
                    value={formData.feedbackEndDate}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      errors.feedbackEndDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.feedbackEndDate && <p className="text-red-500 text-sm mt-1">{errors.feedbackEndDate}</p>}
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg text-gray-800">Câu hỏi đánh giá</h3>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  + Thêm câu hỏi
                </button>
              </div>

              {errors.questions && <p className="text-red-500 text-sm">{errors.questions}</p>}

              {formData.questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu</p>
              ) : (
                <div className="space-y-3">
                  {formData.questions.map((question, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            Câu {index + 1}: {question.questionText}
                          </p>
                          <p className="text-sm text-gray-600">
                            Loại: {getQuestionTypeLabel(question.questionType)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(index, 'up')}
                              className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                            >
                              ↑
                            </button>
                          )}
                          {index < formData.questions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(index, 'down')}
                              className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(index)}
                            className="px-2 py-1 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(index)}
                            className="px-2 py-1 text-sm bg-red-100 text-red-800 hover:bg-red-200 rounded"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}

            {/* Form Actions */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading || isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading || isSaving ? 'Đang lưu...' : templateData ? 'Cập nhật' : 'Tạo mẫu'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Question Editor Modal */}
      {showQuestionEditor && (
        <FeedbackQuestionEditor
          isOpen={showQuestionEditor}
          onClose={() => setShowQuestionEditor(false)}
          onSave={handleSaveQuestion}
          question={currentQuestion}
        />
      )}
    </>
  );
}

function getQuestionTypeLabel(type) {
  const labels = {
    rating: 'Đánh giá sao',
    text: 'Ý kiến tự luận',
    multipleChoice: 'Chọn một lựa chọn'
  };
  return labels[type] || type;
}
