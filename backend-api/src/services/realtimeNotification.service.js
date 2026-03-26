function buildRegistrationPeriodNotification(eventData = {}) {
  const period = eventData.period || eventData.currentPeriod || null;
  const action = eventData.action || 'updated';
  const status = period?.status;
  const periodName = period?.periodName || 'mới';

  let message = `Đợt đăng ký "${periodName}" vừa được cập nhật.`;

  if (action === 'created') {
    message = `Đã tạo đợt đăng ký mới: "${periodName}".`;
  } else if (action === 'status-updated') {
    if (status === 'active') {
      message = `Đợt đăng ký "${periodName}" đã mở.`;
    } else if (status === 'closed') {
      message = `Đợt đăng ký "${periodName}" đã đóng.`;
    } else if (status === 'cancelled') {
      message = `Đợt đăng ký "${periodName}" đã hủy.`;
    } else if (status === 'upcoming') {
      message = `Đợt đăng ký "${periodName}" đã chuyển sang trạng thái sắp mở.`;
    }
  }

  return {
    id: `registration-period-${period?._id || period?.id || 'unknown'}-${action}-${eventData.timestamp || Date.now()}`,
    dedupeKey: `registration-period:${period?._id || period?.id || 'unknown'}:${action}:${status || 'unknown'}`,
    title: 'Thông báo đợt đăng ký',
    message,
    type: 'registration-period',
    eventName: 'registration-period-updated',
    action,
    sourceType: 'registration-period',
    sourceId: period?._id || period?.id || null,
    period,
    timestamp: eventData.timestamp || new Date().toISOString(),
  };
}

function getRequestStatusText(status) {
  if (status === 'Approved') return 'đã được duyệt';
  if (status === 'Rejected') return 'đã bị từ chối';
  if (status === 'Processing') return 'đang được xử lý';
  return 'đã được cập nhật';
}

function buildStudentRequestStatusNotification(requestDoc) {
  const updateStamp = requestDoc.updatedAt
    ? new Date(requestDoc.updatedAt).toISOString()
    : new Date().toISOString();
  const status = requestDoc.status;

  let message = `Đơn của bạn đã được cập nhật.`;
  if (status === 'Approved') message = 'Đơn của bạn đã được duyệt.';
  if (status === 'Rejected') message = 'Đơn của bạn đã bị từ chối.';
  if (status === 'Processing') message = 'Đơn của bạn đang được xử lý.';

  return {
    id: `student-request-status-${requestDoc._id}-${requestDoc.status}-${updateStamp}`,
    dedupeKey: `student-request-status:${requestDoc._id}:${requestDoc.status}:${updateStamp}`,
    title: 'Thông báo xử lý đơn',
    message,
    type: 'student-request-status',
    eventName: 'student-request-status-updated',
    sourceType: 'request',
    sourceId: requestDoc._id,
    request: {
      _id: requestDoc._id,
      requestType: requestDoc.requestType,
      status: requestDoc.status,
      staffNote: requestDoc.staffNote || '',
      updatedAt: requestDoc.updatedAt,
    },
    timestamp: new Date().toISOString(),
  };
}

function buildStudentRequestCreatedNotification(requestDoc) {
  return {
    id: `request-created-${requestDoc._id}`,
    dedupeKey: `request-created:${requestDoc._id}`,
    title: 'Đơn từ mới',
    message: `Đơn "${requestDoc.requestType}" của bạn đã được tạo thành công.`,
    type: 'request-created',
    eventName: 'student-request-created',
    sourceType: 'request',
    sourceId: requestDoc._id,
    request: {
      _id: requestDoc._id,
      requestType: requestDoc.requestType,
      status: requestDoc.status,
      createdAt: requestDoc.createdAt,
    },
    timestamp: requestDoc.createdAt || new Date().toISOString(),
  };
}

function emitToStudents(io, eventName, payload) {
  if (!io) return;

  if (typeof io.broadcastToRole === 'function') {
    io.broadcastToRole('student', eventName, payload);
    return;
  }

  if (typeof io.broadcastToAll === 'function') {
    io.broadcastToAll(eventName, payload);
  }
}

function emitToUser(io, userId, eventName, payload) {
  if (!io || !userId || typeof io.sendToUser !== 'function') return;
  io.sendToUser(String(userId), eventName, payload);
}

module.exports = {
  buildRegistrationPeriodNotification,
  buildStudentRequestCreatedNotification,
  buildStudentRequestStatusNotification,
  emitToStudents,
  emitToUser,
};
