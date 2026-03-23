import LecturerFeedbackPortal from '../../components/features/LecturerFeedbackPortal';

export default function StudentFeedbackPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <LecturerFeedbackPortal
          mode="student"
          title="\u0110\u00e1nh gi\u00e1 gi\u1ea3ng vi\u00ean"
          description="Sinh vi\u00ean g\u1eedi, xem v\u00e0 c\u1eadp nh\u1eadt \u0111\u00e1nh gi\u00e1 tr\u00ean c\u00f9ng flow d\u1eef li\u1ec7u \u0111ang \u0111\u01b0\u1ee3c mobile app v\u00e0 web admin s\u1eed d\u1ee5ng."
        />
      </div>
    </div>
  );
}
