import LecturerFeedbackPortal from '../../components/features/LecturerFeedbackPortal';

export default function FeedbackStatisticsPage() {
  return (
    <div className="p-6">
      <LecturerFeedbackPortal
        mode="admin"
        title="Thống kê đánh giá giảng viên"
        description="Dữ liệu thống kê được đọc trực tiếp từ cùng module feedback đang phục vụ mobile app, web student và màn quản trị."
      />
    </div>
  );
}
