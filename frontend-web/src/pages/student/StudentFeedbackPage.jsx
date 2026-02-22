import React, { useEffect, useState } from 'react';
import ClassFeedbackDisplay from '../../components/features/ClassFeedbackDisplay';
import MySubmittedFeedbacks from '../../components/features/MySubmittedFeedbacks';
import axiosClient from '../../services/axiosClient';

const StudentFeedbackPage = () => {
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'my-feedbacks'

  useEffect(() => {
    loadEnrolledClasses();
  }, []);

  const loadEnrolledClasses = async () => {
    try {
      setLoading(true);
      // Fetch enrolled classes
      const result = await axiosClient.get('/classes/my-classes');
      const classes = result.data.data || [];
      setEnrolledClasses(classes);

      if (classes.length > 0) {
        setSelectedClass(classes[0]);
      }
    } catch (err) {
      console.error('Error loading enrolled classes:', err);
      setError('Lỗi tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">⏳ Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📝 Đánh giá Lớp Học</h1>
          <p className="text-gray-600 mt-2">Chia sẻ ý kiến về các lớp học của bạn</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === 'submit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📤 Gửi Đánh Giá
          </button>
          <button
            onClick={() => setActiveTab('my-feedbacks')}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              activeTab === 'my-feedbacks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Các Đánh Giá Của Tôi
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'submit' ? (
          enrolledClasses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600 text-lg">Bạn chưa đăng ký lớp học nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Class List Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Các Lớp Học</h3>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {enrolledClasses.map(cls => (
                      <button
                        key={cls._id}
                        onClick={() => setSelectedClass(cls)}
                        className={`w-full text-left p-4 transition border-l-4 ${
                          selectedClass?._id === cls._id
                            ? 'bg-blue-50 border-blue-500 border-l-4'
                            : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-semibold text-gray-900 text-sm">
                          {cls.subjectCode}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {cls.className}
                        </p>
                        {cls.teacher && (
                          <p className="text-gray-500 text-xs mt-1">
                            👨‍🏫 {cls.teacher.fullName}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Class Feedback Display */}
              <div className="lg:col-span-3">
                {selectedClass && (
                  <div>
                    {/* Class Info Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {selectedClass.subjectCode}
                          </h2>
                          <p className="text-gray-600 mt-1">{selectedClass.className}</p>
                          {selectedClass.teacher && (
                            <p className="text-gray-600 mt-1">
                              👨‍🏫 Giảng viên: {selectedClass.teacher.fullName}
                            </p>
                          )}
                          {selectedClass.room && (
                            <p className="text-gray-600 mt-1">
                              🏫 Phòng: {selectedClass.room.roomNumber}
                            </p>
                          )}
                        </div>
                        {selectedClass.semester && (
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Học kỳ</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {selectedClass.semester}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feedback Display */}
                    <ClassFeedbackDisplay
                      classSection={selectedClass}
                      showForm={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <MySubmittedFeedbacks />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFeedbackPage;
