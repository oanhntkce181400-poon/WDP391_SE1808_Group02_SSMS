// Exam Modal Component - Popup form for Create/Edit Exam
import { useState, useEffect } from 'react';
import examService from '../../services/examService';
import closeIcon from '../../assets/close.png';

const EXAM_STATUS = [
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'in-progress', label: 'Đang thi' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function ExamModal({ isOpen, onClose, onSubmit, exam, loading, conflictData }) {
  const [formData, setFormData] = useState({
    examCode: '',
    subject: '',
    room: '',
    slot: '',
    examDate: '',
    startTime: '',
    endTime: '',
    examRules: 'Quy chế thi tiêu chuẩn FPT University',
    notes: '',
    maxCapacity: '',
    status: 'scheduled',
  });

  const [errors, setErrors] = useState({});
  const [conflictWarnings, setConflictWarnings] = useState({
    roomConflict: null,
    studentConflict: null,
  });
  const [dropdownData, setDropdownData] = useState({
    subjects: [],
    rooms: [],
    slots: [],
  });
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Sync conflict data from parent
  useEffect(() => {
    if (conflictData) {
      setConflictWarnings({
        roomConflict: conflictData.roomConflict || null,
        studentConflict: conflictData.studentConflict || null,
      });
    }
  }, [conflictData]);

  // Load dropdown data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const [subjectsRes, roomsRes, slotsRes] = await Promise.all([
        examService.getSubjects({ limit: 500 }),
        examService.getRooms({ limit: 500 }),
        examService.getTimeslots({ limit: 100 }),
      ]);

      setDropdownData({
        subjects: subjectsRes.data.data || [],
        rooms: roomsRes.data.data || [],
        slots: slotsRes.data.data || [],
      });
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Populate form when editing existing exam
  useEffect(() => {
    if (exam) {
      const examDate = exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '';
      setFormData({
        examCode: exam.examCode || '',
        subject: exam.subject?._id || '',
        room: exam.room?._id || '',
        slot: exam.slot?._id || '',
        examDate,
        startTime: exam.startTime || '',
        endTime: exam.endTime || '',
        examRules: exam.examRules || 'Quy chế thi tiêu chuẩn FPT University',
        notes: exam.notes || '',
        maxCapacity: exam.maxCapacity || '',
        status: exam.status || 'scheduled',
      });
    } else {
      // Reset form for new exam
      setFormData({
        examCode: '',
        subject: '',
        room: '',
        slot: '',
        examDate: '',
        startTime: '',
        endTime: '',
        examRules: 'Quy chế thi tiêu chuẩn FPT University',
        notes: '',
        maxCapacity: '',
        status: 'scheduled',
      });
    }
    setErrors({});
    setConflictWarnings({ roomConflict: null, studentConflict: null });
  }, [exam, isOpen]);

  // Auto-update maxCapacity when room is selected
  useEffect(() => {
    if (formData.room && dropdownData.rooms.length > 0) {
      const selectedRoom = dropdownData.rooms.find(r => r._id === formData.room);
      if (selectedRoom && selectedRoom.capacity) {
        setFormData(prev => ({ ...prev, maxCapacity: selectedRoom.capacity }));
      }
    }
  }, [formData.room, dropdownData.rooms]);

  // Auto-update startTime and endTime when slot is selected
  useEffect(() => {
    if (formData.slot && dropdownData.slots.length > 0) {
      const selectedSlot = dropdownData.slots.find(s => s._id === formData.slot);
      if (selectedSlot) {
        setFormData(prev => ({
          ...prev,
          startTime: selectedSlot.startTime || '',
          endTime: selectedSlot.endTime || '',
        }));
      }
    }
  }, [formData.slot, dropdownData.slots]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.examCode.trim()) {
      newErrors.examCode = 'Mã kỳ thi là bắt buộc';
    }
    
    if (!formData.subject) {
      newErrors.subject = 'Môn học là bắt buộc';
    }
    
    if (!formData.room) {
      newErrors.room = 'Phòng thi là bắt buộc';
    }
    
    if (!formData.slot) {
      newErrors.slot = 'Ca thi là bắt buộc';
    }
    
    if (!formData.examDate) {
      newErrors.examDate = 'Ngày thi là bắt buộc';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Giờ bắt đầu là bắt buộc';
    }
    
    if (!formData.endTime) {
      newErrors.endTime = 'Giờ kết thúc là bắt buộc';
    }
    
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
    }
    
    if (!formData.maxCapacity || formData.maxCapacity <= 0) {
      newErrors.maxCapacity = 'Sức chứa phải lớn hơn 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        examCode: formData.examCode,
        subject: formData.subject,
        room: formData.room,
        slot: formData.slot,
        examDate: formData.examDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        examRules: formData.examRules,
        notes: formData.notes,
        maxCapacity: parseInt(formData.maxCapacity, 10),
        status: formData.status,
      };
      onSubmit(submitData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    // Clear conflict warnings when user changes critical fields
    if (['room', 'slot', 'examDate', 'subject'].includes(name)) {
      setConflictWarnings({ roomConflict: null, studentConflict: null });
    }
  };

  if (!isOpen) return null;

  const isEditing = !!exam;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa lịch thi' : 'Tạo lịch thi mới'}
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
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-5">
            {loadingDropdowns && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Đang tải dữ liệu...
              </div>
            )}

            {/* Conflict Warnings */}
            {conflictWarnings.roomConflict?.hasConflict && (
              <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-amber-600 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-800 mb-1">
                      ⚠️ Cảnh báo: Phòng thi bị trùng
                    </h4>
                    <p className="text-sm text-amber-700">
                      {conflictWarnings.roomConflict.message}
                    </p>
                    {conflictWarnings.roomConflict.conflictingExam && (
                      <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-900">
                        <strong>Lịch thi trùng:</strong>{' '}
                        {conflictWarnings.roomConflict.conflictingExam.examCode || 'N/A'} -{' '}
                        {conflictWarnings.roomConflict.conflictingExam.room?.roomName || 'N/A'} -{' '}
                        {conflictWarnings.roomConflict.conflictingExam.slot?.groupName || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {conflictWarnings.studentConflict?.hasConflict && (
              <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-orange-600 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-orange-800 mb-1">
                      ⚠️ Cảnh báo: Sinh viên bị trùng lịch thi
                    </h4>
                    <p className="text-sm text-orange-700">
                      {conflictWarnings.studentConflict.message}
                    </p>
                    {conflictWarnings.studentConflict.conflictCount > 0 && (
                      <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-900">
                        <strong>Số lượng:</strong> {conflictWarnings.studentConflict.conflictCount} kỳ thi trùng lịch
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Row 1: Exam Code & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exam Code */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="examCode">
                  Mã kỳ thi <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.examCode
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="examCode"
                  name="examCode"
                  placeholder="VD: 123"
                  type="text"
                  value={formData.examCode}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.examCode && <p className="text-sm text-red-500">{errors.examCode}</p>}
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="subject">
                  Môn học <span className="text-red-500">*</span>
                </label>
                <select
                  className={`form-select rounded-lg border ${
                    errors.subject
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  disabled={loading || loadingDropdowns}
                >
                  <option value="">-- Chọn môn học --</option>
                  {dropdownData.subjects.map((subj) => (
                    <option key={subj._id} value={subj._id}>
                      {subj.subjectCode} - {subj.subjectName}
                    </option>
                  ))}
                </select>
                {errors.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
              </div>
            </div>

            {/* Row 2: Room & Slot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="room">
                  Phòng thi <span className="text-red-500">*</span>
                </label>
                <select
                  className={`form-select rounded-lg border ${
                    errors.room
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="room"
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  disabled={loading || loadingDropdowns}
                >
                  <option value="">-- Chọn phòng thi --</option>
                  {dropdownData.rooms.map((rm) => (
                    <option key={rm._id} value={rm._id}>
                      {rm.roomCode} - {rm.roomName} (Sức chứa: {rm.capacity})
                    </option>
                  ))}
                </select>
                {errors.room && <p className="text-sm text-red-500">{errors.room}</p>}
              </div>

              {/* Slot */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="slot">
                  Ca thi <span className="text-red-500">*</span>
                </label>
                <select
                  className={`form-select rounded-lg border ${
                    errors.slot
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="slot"
                  name="slot"
                  value={formData.slot}
                  onChange={handleChange}
                  disabled={loading || loadingDropdowns}
                >
                  <option value="">-- Chọn ca thi --</option>
                  {dropdownData.slots.map((sl) => (
                    <option key={sl._id} value={sl._id}>
                      {sl.groupName} ({sl.startTime} - {sl.endTime})
                    </option>
                  ))}
                </select>
                {errors.slot && <p className="text-sm text-red-500">{errors.slot}</p>}
              </div>
            </div>

            {/* Row 3: Exam Date & Times */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Exam Date */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="examDate">
                  Ngày thi <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.examDate
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="examDate"
                  name="examDate"
                  type="date"
                  value={formData.examDate}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.examDate && <p className="text-sm text-red-500">{errors.examDate}</p>}
              </div>

              {/* Start Time */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="startTime">
                  Giờ bắt đầu <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.startTime
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
              </div>

              {/* End Time */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="endTime">
                  Giờ kết thúc <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.endTime
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
              </div>
            </div>

            {/* Row 4: Max Capacity & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Max Capacity */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="maxCapacity">
                  Sức chứa <span className="text-red-500">*</span>
                </label>
                <input
                  className={`form-input rounded-lg border ${
                    errors.maxCapacity
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2`}
                  id="maxCapacity"
                  name="maxCapacity"
                  placeholder="VD: 50"
                  type="number"
                  min="1"
                  value={formData.maxCapacity}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.maxCapacity && <p className="text-sm text-red-500">{errors.maxCapacity}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  * Tự động lấy theo sức chứa phòng thi
                </p>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="status">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  className="form-select rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {EXAM_STATUS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exam Rules */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="examRules">
                Quy chế thi
              </label>
              <textarea
                className="form-textarea rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2"
                id="examRules"
                name="examRules"
                placeholder="Quy chế thi tiêu chuẩn FPT University"
                rows="3"
                value={formData.examRules}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="notes">
                Ghi chú
              </label>
              <textarea
                className="form-textarea rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm px-3 py-2"
                id="notes"
                name="notes"
                placeholder="VD: Mang theo máy tính cá nhân"
                rows="2"
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800 p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button
              className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1A237E] rounded-lg hover:bg-[#0D147A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              type="submit"
              disabled={loading || loadingDropdowns}
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
