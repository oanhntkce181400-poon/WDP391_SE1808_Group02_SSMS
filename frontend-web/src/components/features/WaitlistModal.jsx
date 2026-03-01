// WaitlistModal.jsx - Modal for joining waitlist
import { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';
import subjectService from '../../services/subjectService';
import semesterService from '../../services/semesterService';
import waitlistService from '../../services/waitlistService';

export default function WaitlistModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [formData, setFormData] = useState({
    subjectId: '',
    targetSemester: '',
    targetAcademicYear: ''
  });
  
  const [errors, setErrors] = useState({});

  // Fetch subjects and semesters when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      setLoadingData(true);
      try {
        // Fetch active subjects
        const subjectRes = await subjectService.getSubjects({ isActive: true });
        setSubjects(subjectRes.data?.data || []);
        
        // Fetch semesters
        const semesterRes = await semesterService.getAll();
        setSemesters(semesterRes.data?.data || []);
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        subjectId: '',
        targetSemester: '',
        targetAcademicYear: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.subjectId) {
      newErrors.subjectId = 'Vui lòng chọn môn học';
    }
    if (!formData.targetSemester) {
      newErrors.targetSemester = 'Vui lòng chọn kỳ học';
    }
    if (!formData.targetAcademicYear) {
      newErrors.targetAcademicYear = 'Vui lòng chọn năm học';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      await waitlistService.joinWaitlist({
        subjectId: formData.subjectId,
        targetSemester: parseInt(formData.targetSemester),
        targetAcademicYear: formData.targetAcademicYear
      });
      
      // Success
      alert('Đăng ký waitlist thành công!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error joining waitlist:', error);
      const errorMessage = error.response?.data?.message || 'Đã xảy ra lỗi khi đăng ký';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Get unique academic years from semesters
  const academicYears = [...new Set(semesters.map(s => s.academicYear))].sort().reverse();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Đăng ký Waitlist
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-5">
            {/* Info Box */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                Bảo lưu môn sang kỳ sau
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Đăng ký vào danh sách chờ. Khi có lớp mở ở kỳ bạn chọn, hệ thống sẽ tự động đăng ký cho bạn.
              </p>
            </div>

            {/* Subject Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white">
                Môn học <span className="text-red-500">*</span>
              </label>
              <select
                name="subjectId"
                value={formData.subjectId}
                onChange={handleChange}
                className={`form-input rounded-lg border ${
                  errors.subjectId
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                disabled={loadingData}
              >
                <option value="">-- Chọn môn học --</option>
                {subjects.map(subject => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectCode} - {subject.subjectName} ({subject.credits} tín chỉ)
                  </option>
                ))}
              </select>
              {errors.subjectId && <p className="text-xs text-red-500">{errors.subjectId}</p>}
            </div>

            {/* Target Semester */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white">
                Kỳ dự kiến <span className="text-red-500">*</span>
              </label>
              <select
                name="targetSemester"
                value={formData.targetSemester}
                onChange={handleChange}
                className={`form-input rounded-lg border ${
                  errors.targetSemester
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
              >
                <option value="">-- Chọn kỳ --</option>
                <option value="1">Kỳ 1</option>
                <option value="2">Kỳ 2</option>
                <option value="3">Kỳ 3 (Hè)</option>
              </select>
              {errors.targetSemester && <p className="text-xs text-red-500">{errors.targetSemester}</p>}
            </div>

            {/* Target Academic Year */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white">
                Năm học dự kiến <span className="text-red-500">*</span>
              </label>
              <select
                name="targetAcademicYear"
                value={formData.targetAcademicYear}
                onChange={handleChange}
                className={`form-input rounded-lg border ${
                  errors.targetAcademicYear
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
              >
                <option value="">-- Chọn năm học --</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
                {/* Allow selecting next year if not in list */}
                {!academicYears.includes(new Date().getFullYear() + 1 + '-' + (new Date().getFullYear() + 2)) && (
                  <option value={`${new Date().getFullYear() + 1}-${new Date().getFullYear() + 2}`}>
                    {new Date().getFullYear() + 1}-{new Date().getFullYear() + 2}
                  </option>
                )}
              </select>
              {errors.targetAcademicYear && <p className="text-xs text-red-500">{errors.targetAcademicYear}</p>}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button
              type="button"
              className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition-all"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-[#1A237E] text-white text-sm font-bold hover:bg-[#0D147A] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading || loadingData}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              Đăng ký
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
