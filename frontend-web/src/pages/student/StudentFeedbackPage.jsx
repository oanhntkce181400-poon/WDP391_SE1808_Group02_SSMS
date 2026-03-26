import LecturerFeedbackPortal from '../../components/features/LecturerFeedbackPortal';

export default function StudentFeedbackPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <LecturerFeedbackPortal
          mode="student"
          title="Đánh giá giảng viên"
          description="Sinh viên gửi, xem và cập nhật đánh giá trên cùng flow dữ liệu đang được mobile app và web admin sử dụng."
        />
      </div>
    </div>
  );
}
