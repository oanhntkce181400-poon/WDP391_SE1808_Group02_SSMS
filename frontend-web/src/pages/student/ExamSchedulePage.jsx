import { useState, useEffect } from 'react';
import examService from '../../services/examService';

export default function ExamSchedulePage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchExamSchedule();
  }, []);

  const fetchExamSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await examService.getMyExams();
      setExams(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch exam schedule:', err);
      setError(err.response?.data?.message || 'Failed to load exam schedule');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const statusColors = {
      scheduled: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRegistrationStatusColor = (status) => {
    const colors = {
      registered: 'bg-green-100 text-green-800',
      attended: 'bg-blue-100 text-blue-800',
      absent: 'bg-red-100 text-red-800',
      'not-registered': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredExams = filterStatus === 'all' 
    ? exams 
    : exams.filter(exam => exam.status === filterStatus);

  const upcomingExams = filteredExams.filter(exam => {
    const examDate = new Date(exam.examDate);
    return examDate >= new Date();
  });

  const pastExams = filteredExams.filter(exam => {
    const examDate = new Date(exam.examDate);
    return examDate < new Date();
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📅 Lịch Thi Của Tôi</h1>
          <p className="text-gray-600">Xem lịch thi, phòng thi, SBD và quy chế thi</p>
        </div>

        {/* Statistics */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="text-gray-600 text-sm">Tổng Kỳ Thi</div>
              <div className="text-3xl font-bold text-gray-800">{exams.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="text-gray-600 text-sm">Kỳ Thi Sắp Tới</div>
              <div className="text-3xl font-bold text-gray-800">{upcomingExams.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="text-gray-600 text-sm">Kỳ Thi Đã Hoàn Thành</div>
              <div className="text-3xl font-bold text-gray-800">{pastExams.length}</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'scheduled', 'in-progress', 'completed', 'cancelled'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {status === 'all' ? '🔍 Tất Cả' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
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
              </div>
              <p className="mt-4 text-gray-600">Đang tải lịch thi...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-500 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={fetchExamSchedule}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Thử Lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Exams */}
        {!loading && filteredExams.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">Bạn chưa có kỳ thi nào</p>
            <p className="text-gray-500 text-sm mt-2">
              Hãy đăng ký các lớp học để nhận lịch thi
            </p>
          </div>
        )}

        {/* Upcoming Exams */}
        {!loading && upcomingExams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🔴</span> Kỳ Thi Sắp Tới
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingExams.map((exam) => (
                <div
                  key={exam._id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedExam(exam)}
                >
                  {/* Header */}
                  <div className={`px-6 py-4 ${getStatusColor(exam.status)}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{exam.subject?.subjectName}</h3>
                        <p className="text-sm opacity-90">{exam.subject?.subjectCode}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-white bg-opacity-30 rounded">
                        {exam.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4">
                    {/* Date and Time */}
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm text-gray-600">📅 Ngày Thi</p>
                      <p className="font-semibold text-gray-800">
                        {formatDate(exam.examDate)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        ⏰ {exam.startTime} - {exam.endTime}
                      </p>
                    </div>

                    {/* Room */}
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm text-gray-600">🏠 Phòng Thi</p>
                      <p className="font-semibold text-gray-800">
                        {exam.room?.roomCode} - {exam.room?.roomName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Sức chứa: {exam.room?.capacity} người
                      </p>
                    </div>

                    {/* SBD */}
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm text-gray-600">🔢 Số Báo Danh (SBD)</p>
                      <p className="font-bold text-lg text-blue-600">
                        {exam.sbd || '---'}
                      </p>
                    </div>

                    {/* Registration Status */}
                    <div>
                      <p className="text-sm text-gray-600">✅ Trạng Thái Đăng Ký</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRegistrationStatusColor(exam.registrationStatus)}`}>
                        {exam.registrationStatus === 'registered' && '✓ Đã Đăng Ký'}
                        {exam.registrationStatus === 'attended' && '✓ Đã Tham Dự'}
                        {exam.registrationStatus === 'absent' && '✗ Vắng Mặt'}
                        {exam.registrationStatus === 'not-registered' && '○ Chưa Đăng Ký'}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 bg-gray-50 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExam(exam);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                    >
                      Xem Chi Tiết →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Exams */}
        {!loading && pastExams.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">✓</span> Kỳ Thi Đã Hoàn Thành
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastExams.map((exam) => (
                <div
                  key={exam._id}
                  className="bg-white rounded-lg shadow-md overflow-hidden opacity-75 hover:opacity-100 transition"
                >
                  {/* Header */}
                  <div className="px-6 py-4 bg-gray-200 text-gray-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{exam.subject?.subjectName}</h3>
                        <p className="text-sm opacity-90">{exam.subject?.subjectCode}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-white bg-opacity-30 rounded">
                        COMPLETED
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4">
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm text-gray-600">📅 Ngày Thi</p>
                      <p className="font-semibold text-gray-800">
                        {formatDate(exam.examDate)}
                      </p>
                    </div>

                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm text-gray-600">🏠 Phòng Thi</p>
                      <p className="font-semibold text-gray-800">
                        {exam.room?.roomCode}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">🔢 SBD</p>
                      <p className="font-bold text-gray-800">{exam.sbd || '---'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal - Exam Details */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Chi Tiết Kỳ Thi</h2>
              <button
                onClick={() => setSelectedExam(null)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Subject */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Môn Học</h3>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="font-bold text-lg text-blue-900">
                    {selectedExam.subject?.subjectName}
                  </p>
                  <p className="text-sm text-blue-700">
                    Mã: {selectedExam.subject?.subjectCode} | Tín chỉ:{' '}
                    {selectedExam.subject?.credits}
                  </p>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Ngày Thi</h3>
                  <p className="text-lg font-bold text-gray-800">
                    {formatDate(selectedExam.examDate)}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Giờ Thi</h3>
                  <p className="text-lg font-bold text-gray-800">
                    {selectedExam.startTime} - {selectedExam.endTime}
                  </p>
                </div>
              </div>

              {/* Room Information */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Thông Tin Phòng Thi</h3>
                <div className="bg-green-50 p-4 rounded space-y-2">
                  <p className="text-gray-700">
                    <strong>Mã Phòng:</strong> {selectedExam.room?.roomCode}
                  </p>
                  <p className="text-gray-700">
                    <strong>Tên Phòng:</strong> {selectedExam.room?.roomName}
                  </p>
                  <p className="text-gray-700">
                    <strong>Loại Phòng:</strong> {selectedExam.room?.roomType || 'N/A'}
                  </p>
                  <p className="text-gray-700">
                    <strong>Sức Chứa:</strong> {selectedExam.room?.capacity} người
                  </p>
                </div>
              </div>

              {/* SBD and Seat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Số Báo Danh (SBD)</h3>
                  <div className="bg-yellow-50 p-4 rounded text-center">
                    <p className="text-3xl font-bold text-yellow-700">
                      {selectedExam.sbd || '---'}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Số Ghế</h3>
                  <div className="bg-gray-50 p-4 rounded text-center">
                    <p className="text-3xl font-bold text-gray-700">
                      {selectedExam.seatNumber || '---'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Exam Rules */}
              {selectedExam.examRules && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Quy Chế Thi</h3>
                  <div className="bg-red-50 p-4 rounded border border-red-200">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedExam.examRules}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedExam.notes && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Ghi Chú</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded">
                    {selectedExam.notes}
                  </p>
                </div>
              )}

              {/* Registration Status */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Trạng Thái Đăng Ký</h3>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getRegistrationStatusColor(selectedExam.registrationStatus)}`}
                >
                  {selectedExam.registrationStatus === 'registered' && '✓ Đã Đăng Ký'}
                  {selectedExam.registrationStatus === 'attended' && '✓ Đã Tham Dự'}
                  {selectedExam.registrationStatus === 'absent' && '✗ Vắng Mặt'}
                  {selectedExam.registrationStatus === 'not-registered' && '○ Chưa Đăng Ký'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t text-right">
              <button
                onClick={() => setSelectedExam(null)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
