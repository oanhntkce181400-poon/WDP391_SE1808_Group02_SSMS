import { useState } from 'react';
import FeedbackTemplateList from '../../components/features/FeedbackTemplateList';
import FeedbackSubmissionMonitor from '../../components/features/FeedbackSubmissionMonitor';

export default function FeedbackManagementPage() {
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quản lý đánh giá giảng viên</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Quản trị viên mở hoặc đóng đợt feedback bằng mẫu đánh giá ở đây. Sinh viên chỉ thấy
              form tại trang <span className="font-semibold text-sky-700">/student/feedback</span>{' '}
              khi có mẫu đánh giá giảng viên ở trạng thái <span className="font-semibold">Đang mở</span>{' '}
              và thời gian hiện tại nằm trong khoảng đã cấu hình.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`rounded-full px-4 py-2 ${
                activeTab === 'campaigns' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Cấu hình đợt feedback
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('responses')}
              className={`rounded-full px-4 py-2 ${
                activeTab === 'responses' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Theo dõi phản hồi
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'campaigns' ? (
        <>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            Mẹo dùng nhanh: tạo một mẫu có đối tượng <strong>Giảng viên</strong>, đặt thời điểm bắt
            đầu và kết thúc, rồi chuyển trạng thái sang <strong>Đang mở</strong>. Khi hết đợt, chỉ
            cần đổi sang <strong>Đã đóng</strong> hoặc chỉnh lại khoảng thời gian.
          </div>
          <FeedbackTemplateList />
        </>
      ) : (
        <FeedbackSubmissionMonitor />
      )}
    </div>
  );
}
