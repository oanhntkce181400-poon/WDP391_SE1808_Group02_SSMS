import { useState, useEffect } from 'react';
import examService from "../../services/examService";

export default function StudentExamSchedule() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedExamId, setExpandedExamId] = useState(null);

  useEffect(() => {
    fetchMyExams();
  }, []);

  const fetchMyExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await examService.getMyExams();
      const examsData = response.data?.data || response.data || [];
      setExams(examsData);
    } catch (err) {
      setError('Không thể tải lịch thi: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('vi-VN', options);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Đã lên lịch';
      case 'ongoing':
        return 'Đang thi';
      case 'completed':
        return 'Đã kết thúc';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Lịch thi của tôi</h1>
        <p className="text-slate-600">Xem thông tin lịch thi, phòng, và quy chế thi</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* No Exams */}
      {exams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Không có lịch thi</h3>
          <p className="text-slate-600">Bạn chưa có lịch thi nào được xếp. Vui lòng liên hệ phòng đào tạo để biết thêm chi tiết.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Exam Header - Clickable */}
              <div
                onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
                className="cursor-pointer p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-slate-800">{exam.subjectName}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(exam.status)}`}>
                        {getStatusText(exam.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Mã lớp: {exam.classCode}</p>
                  </div>
                  <div className="ml-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{exam.room}</p>
                      <p className="text-sm text-slate-600">Phòng thi</p>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Ngày thi</p>
                    <p className="text-sm font-medium text-slate-800">{formatDate(exam.examDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Giờ thi</p>
                    <p className="text-sm font-medium text-slate-800">
                      {exam.startTime} - {exam.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Slot</p>
                    <p className="text-sm font-medium text-slate-800">{exam.slot}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Mã môn</p>
                    <p className="text-sm font-medium text-slate-800">{exam.subjectCode}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Information - Expandable */}
              {expandedExamId === exam.id && (
                <div className="px-6 py-4 bg-slate-50 border-t-2 border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Thông tin thi</h4>
                        <div className="bg-white rounded p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Mã đề:</span>
                            <span className="font-medium text-slate-800">{exam.examCode}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Mã lớp:</span>
                            <span className="font-medium text-slate-800">{exam.classCode}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Tên lớp:</span>
                            <span className="font-medium text-slate-800">{exam.className}</span>
                          </div>
                          {exam.sbd && (
                            <div className="flex justify-between items-center border-t pt-3">
                              <span className="text-slate-600">SBD (Số báo danh):</span>
                              <span className="font-medium text-blue-600">{exam.sbd}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Địa điểm thi</h4>
                        <div className="bg-white rounded p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🏢</span>
                            <div>
                              <p className="text-xs text-slate-500">Phòng thi</p>
                              <p className="text-lg font-bold text-slate-800">{exam.room}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Lịch trình thi</h4>
                        <div className="bg-white rounded p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Ngày thi:</span>
                            <span className="font-medium text-slate-800">{formatDate(exam.examDate)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Bắt đầu:</span>
                            <span className="font-medium text-slate-800">{exam.startTime}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Kết thúc:</span>
                            <span className="font-medium text-slate-800">{exam.endTime}</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-3">
                            <span className="text-slate-600">Kéo dài:</span>
                            <span className="font-medium text-slate-800">
                              {(() => {
                                const start = new Date(`2000-01-01 ${exam.startTime}`);
                                const end = new Date(`2000-01-01 ${exam.endTime}`);
                                const diff = Math.round((end - start) / (1000 * 60));
                                return `${diff} phút`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {exam.notes && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Ghi chú</h4>
                          <div className="bg-white rounded p-4">
                            <p className="text-slate-700">{exam.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exam Rules */}
                  <div className="bg-white rounded p-4 border-l-4 border-yellow-400">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <span>⚠️</span> Quy chế thi
                    </h4>
                    <div className="text-sm text-slate-700 space-y-2 text-justify">
                      <p>{exam.examRules || 'Quy chế thi chung của nhà trường'}</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                        <li>Đến phòng thi trước 15 phút</li>
                        <li>Mang theo thẻ sinh viên và CMND</li>
                        <li>Không được mang tài liệu ngoại trừ hình thức thi cho phép</li>
                        <li>Không sử dụng điện thoại hoặc thiết bị điện tử</li>
                        <li>Tuân thủ các yêu cầu của danh sách lớp thi và giám thị</li>
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={() => setExpandedExamId(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={() => {
                        // Print exam schedule
                        window.print();
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      🖨️ In lịch thi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      {exams.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <span className="font-semibold">Mẹo:</span> Nhấp vào bất kỳ kỳ thi nào để xem chi tiết đầy đủ, bao gồm quy chế thi và hướng dẫn.
          </p>
        </div>
      )}
    </div>
  );
}
