import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle, Trash2, Calendar, Clock, MapPin, Users } from "lucide-react";
import scheduleService from "../../services/scheduleService";
import roomService from "../../services/roomService";
import timeslotService from "../../services/timeslotService";
import classService from "../../services/classService";

const DAYS_OF_WEEK = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 7, label: "Chủ nhật" },
];

const PERIODS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `Tiết ${i + 1}`,
}));

const EMPTY_SCHEDULE_FORM = {
  room_id: "",
  timeslot_id: "",
  day_of_week: "",
  start_period: "",
  end_period: "",
  start_date: "",
  end_date: "",
};

export default function AssignScheduleModal({
  classSection,
  onClose,
  onSuccess,
}) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState(EMPTY_SCHEDULE_FORM);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState({
    room: [],    // Danh sách room bị conflict
    teacher: [],  // Danh sách teacher bị conflict
  });
  const [selectedRoomCapacity, setSelectedRoomCapacity] = useState(null); // Sức chứa phòng đã chọn
  const [capacityWarning, setCapacityWarning] = useState(null); // Cảnh báo sức chứa
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Lấy danh sách phòng và ca học
  useEffect(() => {
    roomService.getRooms({ limit: 200 })
      .then((r) => setRooms(r.data.data || r.data.rooms || []))
      .catch(() => {});
    
    timeslotService.getTimeslots({ limit: 200 })
      .then((r) => setTimeslots(r.data.data || r.data.timeslots || []))
      .catch(() => {});
  }, []);

  // Lấy danh sách lịch học của lớp
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scheduleService.getClassSchedules(classSection._id);
      setSchedules(res.data.data || []);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [classSection._id]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Check conflict khi form thay đổi
  useEffect(() => {
    if (!formData.room_id || !formData.day_of_week || !formData.start_period || !formData.end_period) {
      setConflictWarning(null);
      setConflictInfo({ room: [], teacher: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const response = await scheduleService.checkConflict(classSection._id, {
          room_id: formData.room_id,
          teacher_id: classSection.teacher?._id || classSection.teacher,
          day_of_week: formData.day_of_week,
          start_period: formData.start_period,
          end_period: formData.end_period,
          semester: classSection.semester,
          academic_year: classSection.academicYear
        });

        const result = response.data;
        
        // Lưu thông tin conflict để highlight dropdown
        setConflictInfo({
          room: result.conflicts?.room || [],
          teacher: result.conflicts?.teacher || [],
        });
        
        if (result.hasConflict) {
          let message = "⚠️ Xung đột lịch học! ";
          if (result.conflicts?.room?.length > 0) {
            message += `Phòng ${result.conflicts.room[0].room?.roomCode} đã có lớp khác. `;
          }
          if (result.conflicts?.teacher?.length > 0) {
            message += `Giảng viên ${result.conflicts.teacher[0].classSection?.teacher?.fullName} đã có lịch dạy.`;
          }
          setConflictWarning(message);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        console.error("Error checking conflict:", err);
        setConflictWarning(null);
        setConflictInfo({ room: [], teacher: [] });
      } finally {
        setCheckingConflict(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.room_id, formData.day_of_week, formData.start_period, formData.end_period, classSection, classSection.semester, classSection.academicYear]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Khi chọn phòng, auto-fill maxCapacity = sức chứa phòng
    if (name === 'room_id' && value) {
      const selectedRoom = rooms.find(r => r._id === value);
      if (selectedRoom) {
        setSelectedRoomCapacity(selectedRoom.capacity);
        
        // Kiểm tra nếu maxCapacity hiện tại > sức chứa phòng thì cập nhật
        const currentMaxCapacity = classSection.maxCapacity || 0;
        if (currentMaxCapacity > selectedRoom.capacity) {
          // Cập nhật maxCapacity của lớp học phần = sức chứa phòng
          try {
            await classService.updateClassSection(classSection._id, {
              maxCapacity: selectedRoom.capacity
            });
            setCapacityWarning(`⚠️ Đã cập nhật sĩ số tối đa: ${currentMaxCapacity} → ${selectedRoom.capacity} (sức chứa phòng)`);
            // Refresh class section data
            if (onSuccess) onSuccess();
          } catch (err) {
            console.error("Error updating maxCapacity:", err);
            setCapacityWarning(`⚠️ Cảnh báo: Sĩ số tối đa (${currentMaxCapacity}) > Sức chứa phòng (${selectedRoom.capacity})`);
          }
        } else if (currentMaxCapacity < selectedRoom.capacity) {
          // Gợi ý tăng maxCapacity lên bằng sức chứa
          setCapacityWarning(`💡 Gợi ý: Có thể tăng sĩ số tối đa lên ${selectedRoom.capacity} (sức chứa phòng)`);
        }
      }
    } else if (name === 'room_id' && !value) {
      setSelectedRoomCapacity(null);
      setCapacityWarning(null);
    }
  };

  // Xử lý khi chọn Timeslot - auto-fill startPeriod và endPeriod
  const handleTimeslotChange = (e) => {
    const timeslotId = e.target.value;
    if (timeslotId) {
      const selectedTimeslot = timeslots.find(ts => ts._id === timeslotId);
      if (selectedTimeslot) {
        setFormData((prev) => ({ 
          ...prev, 
          timeslot_id: timeslotId,
          start_period: selectedTimeslot.startPeriod?.toString() || "",
          end_period: selectedTimeslot.endPeriod?.toString() || ""
        }));
      }
    } else {
      setFormData((prev) => ({ 
        ...prev, 
        timeslot_id: "",
        start_period: "",
        end_period: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra sức chứa phòng trước khi lưu
    if (formData.room_id && selectedRoomCapacity && classSection.maxCapacity > selectedRoomCapacity) {
      setError(`Không thể lưu: Sĩ số tối đa (${classSection.maxCapacity}) > Sức chứa phòng (${selectedRoomCapacity})`);
      return;
    }

    if (conflictWarning) {
      setError("Vui lòng chọn lịch khác để tránh xung đột!");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await scheduleService.assignSchedule(classSection._id, {
        room_id: formData.room_id,
        day_of_week: parseInt(formData.day_of_week, 10),
        start_period: parseInt(formData.start_period, 10),
        end_period: parseInt(formData.end_period, 10),
        start_date: formData.start_date,
        end_date: formData.end_date,
      });
      
      setSuccess("Gán lịch học thành công!");
      setFormData(EMPTY_SCHEDULE_FORM);
      fetchSchedules();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Gán lịch thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm("Bạn có chắc muốn xóa lịch học này?")) return;

    try {
      await scheduleService.deleteSchedule(classSection._id, scheduleId);
      fetchSchedules();
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err?.response?.data?.message || "Xóa lịch thất bại");
    }
  };

  const handlePublish = async () => {
    if (!confirm("Công bố lịch học? Sau khi công bố, sinh viên có thể xem thời khóa biểu.")) return;

    try {
      await scheduleService.publishSchedule(classSection._id);
      setSuccess("Công bố lịch học thành công!");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || "Công bố thất bại");
    }
  };

  const handleLock = async () => {
    if (!confirm("Khóa lịch học? Sau khi khóa, sẽ không thể chỉnh sửa.")) return;

    try {
      await scheduleService.lockSchedule(classSection._id);
      setSuccess("Khóa lịch học thành công!");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || "Khóa thất bại");
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: "Nháp", bg: "bg-gray-100", text: "text-gray-600" },
      scheduled: { label: "Đã xếp lịch", bg: "bg-blue-100", text: "text-blue-600" },
      published: { label: "Đã công bố", bg: "bg-green-100", text: "text-green-600" },
      locked: { label: "Đã khóa", bg: "bg-red-100", text: "text-red-600" },
    };
    const cfg = config[status] || config.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 overflow-hidden">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 truncate">Gán phòng và lịch học</h2>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {classSection.classCode} - {classSection.subject?.subjectName || classSection.className}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">

        {/* Status */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Trạng thái:</span>
            {getStatusBadge(classSection.status)}
          </div>
          
          <div className="flex gap-2">
            {classSection.status === "scheduled" && (
              <button
                onClick={handlePublish}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Công bố lịch
              </button>
            )}
            {classSection.status === "published" && (
              <button
                onClick={handleLock}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Khóa lịch
              </button>
            )}
          </div>
        </div>

        {/* Class Info */}
        <div className="px-6 py-3 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span className="text-slate-600">Sĩ số:</span>
            <span className="font-medium">{classSection.currentEnrollment}/{classSection.maxCapacity}</span>
          </div>
          <div className={`flex flex-col gap-1 ${conflictInfo.teacher.length > 0 ? 'text-red-600' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Giảng viên:</span>
              <span className="font-medium">{classSection.teacher?.fullName || "Chưa phân công"}</span>
              {conflictInfo.teacher.length > 0 && <span className="text-red-500">⚠️</span>}
            </div>
            {conflictInfo.teacher.length > 0 && (
              <div className="text-xs text-red-500 pl-4">
                {conflictInfo.teacher.map((c, idx) => (
                  <div key={idx}>• {c.classSection?.subject?.subjectCode || c.classSection?.classCode} (T{c.dayOfWeek}, T{c.startPeriod}-{c.endPeriod})</div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            <span className="text-slate-600">Học kỳ:</span>
            <span className="font-medium">{classSection.academicYear} - HK{classSection.semester}</span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="px-6 py-3 flex-shrink-0">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle size={16} />
                {success}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Thêm lịch học mới</h3>
          
          {/* Thông tin lớp học phần */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600">Sĩ số tối đa:</span>
              <span className="font-semibold text-indigo-600">{classSection.maxCapacity}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-600">Đã đăng ký:</span>
              <span className="font-semibold">{classSection.currentEnrollment || 0}</span>
              <span className="text-slate-400">/ {classSection.maxCapacity}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Phòng học */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phòng học <span className="text-red-500">*</span>
              </label>
              <select
                name="room_id"
                value={formData.room_id}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none ${
                  conflictInfo.room.length > 0 && formData.room_id ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <option value="">-- Chọn phòng --</option>
                {rooms.map((r) => (
                  <option 
                    key={r._id} 
                    value={r._id}
                    className={conflictInfo.room.some(c => c.room?._id === r._id) ? 'bg-red-100 font-medium' : ''}
                  >
                    {r.roomCode} - {r.roomName} (CS: {r.capacity})
                    {conflictInfo.room.some(c => c.room?._id === r._id) ? ' ⚠️ Đã có lớp' : ''}
                  </option>
                ))}
              </select>
              {conflictInfo.room.length > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ {conflictInfo.room.length} phòng bị xung đột
                </p>
              )}
              {capacityWarning && (
                <p className={`text-xs mt-1 ${capacityWarning.includes('Đã cập nhật') ? 'text-green-600' : 'text-amber-600'}`}>
                  {capacityWarning}
                </p>
              )}
            </div>

            {/* Ca học (Timeslot) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ca học
              </label>
              <select
                name="timeslot_id"
                value={formData.timeslot_id || ""}
                onChange={handleTimeslotChange}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="">-- Chọn ca học --</option>
                {timeslots.map((ts) => (
                  <option key={ts._id} value={ts._id}>
                    {ts.groupName} (Tiết {ts.startPeriod}-{ts.endPeriod})
                  </option>
                ))}
              </select>
            </div>

            {/* Thứ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Thứ <span className="text-red-500">*</span>
              </label>
              <select
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none ${
                  conflictWarning ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <option value="">-- Chọn thứ --</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                    {(conflictInfo.room.length > 0 || conflictInfo.teacher.length > 0) && formData.day_of_week === d.value ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tiết bắt đầu */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tiết bắt đầu <span className="text-red-500">*</span>
              </label>
              <select
                name="start_period"
                value={formData.start_period}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none ${
                  conflictWarning ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <option value="">-- Chọn tiết --</option>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                    {(conflictInfo.room.length > 0 || conflictInfo.teacher.length > 0) && formData.start_period === p.value ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tiết kết thúc */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tiết kết thúc <span className="text-red-500">*</span>
              </label>
              <select
                name="end_period"
                value={formData.end_period}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none ${
                  conflictWarning ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <option value="">-- Chọn tiết --</option>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                    {(conflictInfo.room.length > 0 || conflictInfo.teacher.length > 0) && formData.end_period === p.value ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Ngày bắt đầu */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            {/* Ngày kết thúc */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>

          {/* Conflict Warning */}
          {conflictWarning && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{conflictWarning}</p>
              </div>
            </div>
          )}

          {/* Checking status */}
          {checkingConflict && !conflictWarning && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm text-blue-700">Đang kiểm tra xung đột...</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !!conflictWarning}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Đang lưu..." : conflictWarning ? "Không thể lưu (Xung đột)" : "Thêm lịch học"}
            </button>
          </div>
        </form>

        {/* Existing Schedules */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px]">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 sticky top-0 bg-white py-2">Lịch học hiện tại</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-2" />
              Đang tải...
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={40} className="mx-auto mb-2 opacity-40" />
              <p>Chưa có lịch học nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule._id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Calendar size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {DAYS_OF_WEEK.find(d => d.value === schedule.dayOfWeek)?.label || `Thứ ${schedule.dayOfWeek}`}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600">
                          Tiết {schedule.startPeriod} - {schedule.endPeriod}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {schedule.room?.roomCode} - {schedule.room?.roomName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {classSection.status !== "locked" && classSection.status !== "published" && (
                    <button
                      onClick={() => handleDeleteSchedule(schedule._id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa lịch"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
