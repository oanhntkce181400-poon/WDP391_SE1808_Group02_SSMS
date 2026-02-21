import { useState, useEffect } from 'react';
import examService from '../../services/examService';

export default function ExamScheduleSummary() {
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExamSchedule();
  }, []);

  const fetchExamSchedule = async () => {
    try {
      setLoading(false);
      const response = await examService.getMyExams();
      const exams = response.data.data || [];
      
      // Filter upcoming exams (next 3)
      const upcoming = exams
        .filter(exam => new Date(exam.examDate) >= new Date())
        .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
        .slice(0, 3);
      
      setUpcomingExams(upcoming);
    } catch (err) {
      console.error('Failed to fetch exam schedule:', err);
      setError(err.response?.data?.message || 'Failed to load exams');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Lịch Thi Sắp Tới</h3>
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Lịch Thi Sắp Tới</h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Lịch Thi Sắp Tới</h3>
      
      {upcomingExams.length === 0 ? (
        <p className="text-gray-500">Không có kỳ thi sắp tới</p>
      ) : (
        <div className="space-y-3">
          {upcomingExams.map((exam) => (
            <div
              key={exam._id}
              className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition"
            >
              <p className="font-semibold text-gray-800">
                {exam.subject?.subjectName}
              </p>
              <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                <span>📅 {formatDate(exam.examDate)}</span>
                <span>🏠 {exam.room?.roomCode}</span>
              </div>
              <div className="text-sm text-blue-600 font-medium mt-1">
                {exam.sbd ? `SBD: ${exam.sbd}` : 'SBD: ---'}
              </div>
            </div>
          ))}
          <a
            href="/student/exams"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm"
          >
            Xem Tất Cả →
          </a>
        </div>
      )}
    </div>
  );
}
