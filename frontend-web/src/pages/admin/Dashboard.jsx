import { Link } from "react-router-dom";

const CARDS = [
  {
    to: "/admin/classes",
    emoji: "🏫",
    color: "bg-indigo-100",
    title: "Quản lý Lớp học",
    desc: "Tạo và quản lý lớp học phần",
  },
  {
    to: "/admin/lecturers",
    emoji: "👨‍🏫",
    color: "bg-teal-100",
    title: "Quản lý Giảng viên",
    desc: "Thêm, sửa, tìm kiếm giảng viên",
  },
  {
    to: "/admin/subjects",
    emoji: "📚",
    color: "bg-blue-100",
    title: "Quản lý Môn học",
    desc: "Quản lý thông tin môn học",
  },
  {
    to: "/admin/curriculum",
    emoji: "📋",
    color: "bg-green-100",
    title: "Khung chương trình",
    desc: "Quản lý khung chương trình",
  },
  {
    to: "/admin/users",
    emoji: "👥",
    color: "bg-purple-100",
    title: "Quản lý Người dùng",
    desc: "Quản lý tài khoản người dùng",
  },
  {
    to: "/admin/rooms",
    emoji: "🚪",
    color: "bg-orange-100",
    title: "Quản lý Phòng học",
    desc: "Quản lý phòng học và cơ sở vật chất",
  },
  {
    to: "/admin/majors",
    emoji: "🎓",
    color: "bg-pink-100",
    title: "Chuyên ngành",
    desc: "Quản lý chuyên ngành đào tạo",
  },
  {
    to: "/admin/timeslots",
    emoji: "🕐",
    color: "bg-yellow-100",
    title: "Giờ học",
    desc: "Quản lý ca học và thời khóa biểu",
  },
  {
    to: "/admin/tuition-fees",
    emoji: "💰",
    color: "bg-emerald-100",
    title: "Học phí",
    desc: "Quản lý học phí sinh viên",
  },
  {
    to: "/admin/requests",
    emoji: "📝",
    color: "bg-cyan-100",
    title: "Đơn từ",
    desc: "Xử lý các đơn từ và yêu cầu",
  },
  {
    to: "/admin/feedback-management",
    emoji: "⭐",
    color: "bg-amber-100",
    title: "Đánh giá",
    desc: "Quản lý phản hồi và đánh giá",
  },
  {
    to: "/admin/actors",
    emoji: "🔐",
    color: "bg-slate-100",
    title: "Phân quyền",
    desc: "Quản lý vai trò và quyền hạn",
  },
];

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Dashboard Admin
        </h1>
        <p className="text-slate-600">
          Chào mừng đến với hệ thống quản lý SSMS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CARDS.map(({ to, emoji, color, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-lg shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 ${color} rounded-lg flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform`}
              >
                {emoji}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800 leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
