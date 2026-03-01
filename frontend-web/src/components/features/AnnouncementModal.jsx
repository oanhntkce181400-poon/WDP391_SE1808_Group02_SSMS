import { useState, useEffect } from 'react';
import SimpleRichTextEditor from './SimpleRichTextEditor';
import closeIcon from '../../assets/close.png';
import { downloadCloudinaryFile } from '../../utils/cloudinaryHelper';

const CATEGORIES = [
  { value: 'hoc_vu', label: 'Học vụ' },
  { value: 'tai_chinh', label: 'Tài chính' },
  { value: 'su_kien', label: 'Sự kiện' },
  { value: 'khac', label: 'Khác' },
];

/**
 * Modal tạo/sửa Announcement
 */
export default function AnnouncementModal({ isOpen, onClose, onSubmit, announcement, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'khac',
    content: '',
  });

  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  // Populate form khi edit
  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        category: announcement.category || 'khac',
        content: announcement.content || '',
      });
      setFile(null);
    } else {
      // Reset form khi tạo mới
      setFormData({
        title: '',
        category: 'khac',
        content: '',
      });
      setFile(null);
    }
    setErrors({});
  }, [announcement, isOpen]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc';
    }

    if (!formData.content.trim() || formData.content === '<p><br></p>') {
      newErrors.content = 'Nội dung là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Tạo FormData để gửi file
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('category', formData.category);
      formDataToSend.append('content', formData.content.trim());

      // Nếu đang edit và có attachments cũ, giữ lại
      if (announcement && announcement.attachments && announcement.attachments.length > 0) {
        formDataToSend.append('existingAttachments', JSON.stringify(announcement.attachments));
      }

      if (file) {
        formDataToSend.append('file', file);
      }

      onSubmit(formDataToSend);
    }
  };

  // Handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle content change (từ Rich Text Editor)
  const handleContentChange = (content) => {
    setFormData((prev) => ({ ...prev, content }));
    if (errors.content) {
      setErrors((prev) => ({ ...prev, content: '' }));
    }
  };

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Kiểm tra file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File không được vượt quá 10MB');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  // Remove file
  const handleRemoveFile = () => {
    setFile(null);
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  if (!isOpen) return null;

  const isEditing = !!announcement;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
            disabled={loading}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="title">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                className={`form-input rounded-lg border ${
                  errors.title
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                id="title"
                name="title"
                placeholder="Nhập tiêu đề thông báo"
                type="text"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="category">
                Danh mục <span className="text-red-500">*</span>
              </label>
              <select
                className="form-select rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={loading}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content - Rich Text Editor */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <SimpleRichTextEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Nhập nội dung thông báo..."
                disabled={loading}
              />
              {errors.content && <p className="text-sm text-red-500">{errors.content}</p>}
            </div>

            {/* File Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="file-input">
                Đính kèm tệp tin (tùy chọn)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                />
                <label
                  htmlFor="file-input"
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                >
                  <i className="fa-solid fa-file"></i> Chọn file
                </label>
                {file && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <span className="text-blue-700 dark:text-blue-400">{file.name}</span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-red-500 hover:text-red-700 font-bold"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Hỗ trợ: Ảnh, PDF, Word, Excel, PowerPoint, ZIP (Max 10MB)
              </p>
            </div>

            {/* Existing Attachments (khi edit) */}
            {isEditing && announcement?.attachments && announcement.attachments.length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-slate-700 dark:text-white">
                  Tệp đính kèm hiện tại
                </label>
                <div className="flex flex-col gap-2">
                  {announcement.attachments.map((att, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => downloadCloudinaryFile(att.url, att.fileName)}
                      className="flex items-center gap-3 text-sm bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 w-full text-left"
                    >
                      <span className="text-xl">📄</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium truncate flex-1">
                        {att.fileName}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({(att.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 flex-shrink-0">
            <button
              type="button"
              className="px-5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1A237E] hover:bg-[#0D1642] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
