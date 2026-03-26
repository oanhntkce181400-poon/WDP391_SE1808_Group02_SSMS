import LecturerFeedbackPortal from '../../components/features/LecturerFeedbackPortal';

export default function FeedbackManagementPage() {
  return (
    <div className="p-6">
      <LecturerFeedbackPortal
        mode="admin"
        title="Quản lý đánh giá giảng viên"
        description="Trang này dùng cùng flow dữ liệu với mobile app và web sinh viên. Quản trị viên có thể xem toàn bộ lớp, theo dõi thống kê và xử lý các bản ghi pending nếu CSDL còn dữ liệu chờ duyệt."
        showModeration
      />
    </div>
  );
}
