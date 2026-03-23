import LecturerFeedbackPortal from '../../components/features/LecturerFeedbackPortal';

export default function FeedbackManagementPage() {
  return (
    <div className="p-6">
      <LecturerFeedbackPortal
        mode="admin"
        title="Qu\u1ea3n l\u00fd \u0111\u00e1nh gi\u00e1 gi\u1ea3ng vi\u00ean"
        description="Trang n\u00e0y d\u00f9ng c\u00f9ng flow d\u1eef li\u1ec7u v\u1edbi mobile app v\u00e0 web sinh vi\u00ean. Qu\u1ea3n tr\u1ecb vi\u00ean c\u00f3 th\u1ec3 xem to\u00e0n b\u1ed9 l\u1edbp, theo d\u00f5i th\u1ed1ng k\u00ea v\u00e0 x\u1eed l\u00fd c\u00e1c b\u1ea3n ghi pending n\u1ebfu CSDL c\u00f2n d\u1eef li\u1ec7u ch\u1edd duy\u1ec7t."
        showModeration
      />
    </div>
  );
}
