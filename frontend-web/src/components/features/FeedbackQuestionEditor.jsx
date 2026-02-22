// Feedback Question Editor - Component for editing individual feedback questions
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';

export default function FeedbackQuestionEditor({ isOpen, onClose, onSave, question = null }) {
  const [formData, setFormData] = useState({
    questionText: '',
    questionType: 'rating',
    ratingScale: 5,
    options: [],
    isRequired: false,
    maxLength: 500
  });

  const [errors, setErrors] = useState({});
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (question) {
      setFormData({
        questionText: question.questionText || '',
        questionType: question.questionType || 'rating',
        ratingScale: question.ratingScale || 5,
        options: question.options || [],
        isRequired: question.isRequired || false,
        maxLength: question.maxLength || 500
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [question, isOpen]);

  const resetForm = () => {
    setFormData({
      questionText: '',
      questionType: 'rating',
      ratingScale: 5,
      options: [],
      isRequired: false,
      maxLength: 500
    });
    setNewOption('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.questionText.trim()) {
      newErrors.questionText = 'Nội dung câu hỏi là bắt buộc';
    }
    if (formData.questionType === 'multipleChoice' && formData.options.length === 0) {
      newErrors.options = 'Phải có ít nhất một lựa chọn';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, { label: newOption, value: newOption }]
      }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {question ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <img src={closeIcon} alt="Close" width={24} height={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung câu hỏi *
            </label>
            <textarea
              name="questionText"
              value={formData.questionText}
              onChange={handleInputChange}
              placeholder="Ví dụ: Thầy/cô có truyền tải nội dung đầy đủ và rõ ràng?"
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.questionText ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.questionText && <p className="text-red-500 text-sm mt-1">{errors.questionText}</p>}
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại câu hỏi *
            </label>
            <select
              name="questionType"
              value={formData.questionType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rating">Đánh giá sao (1-5)</option>
              <option value="text">Ý kiến tự luận</option>
              <option value="multipleChoice">Chọn một lựa chọn</option>
            </select>
          </div>

          {/* Rating Scale (only for rating type) */}
          {formData.questionType === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thang đánh giá
              </label>
              <select
                name="ratingScale"
                value={formData.ratingScale}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 sao</option>
                <option value={4}>4 sao</option>
                <option value={5}>5 sao</option>
              </select>
            </div>
          )}

          {/* Text Max Length (only for text type) */}
          {formData.questionType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Độ dài tối đa (ký tự)
              </label>
              <input
                type="number"
                name="maxLength"
                value={formData.maxLength}
                onChange={handleInputChange}
                min="10"
                max="5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Multiple Choice Options */}
          {formData.questionType === 'multipleChoice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Các lựa chọn *
                </label>
                {errors.options && <p className="text-red-500 text-sm mb-2">{errors.options}</p>}
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    placeholder="Nhập một lựa chọn"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Thêm
                  </button>
                </div>

                {formData.options.length > 0 && (
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200"
                      >
                        <span className="text-gray-700">{option.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isRequired"
              id="isRequired"
              checked={formData.isRequired}
              onChange={handleInputChange}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="isRequired" className="ml-2 text-sm text-gray-700 cursor-pointer">
              Câu hỏi bắt buộc
            </label>
          </div>

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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {question ? 'Cập nhật' : 'Thêm'} câu hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
