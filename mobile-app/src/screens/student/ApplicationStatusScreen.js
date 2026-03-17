import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import requestService from '../../services/requestService';

const STATUS_META = {
  Pending: {
    label: 'Chờ duyệt',
    short: 'Chưa duyệt',
    bg: '#fef3c7',
    text: '#92400e',
  },
  Processing: {
    label: 'Đang xử lý',
    short: 'Đang xử lý',
    bg: '#dbeafe',
    text: '#1d4ed8',
  },
  Approved: {
    label: 'Đã duyệt',
    short: 'Đã duyệt',
    bg: '#dcfce7',
    text: '#166534',
  },
  Rejected: {
    label: 'Từ chối',
    short: 'Không duyệt',
    bg: '#fee2e2',
    text: '#991b1b',
  },
  Cancelled: {
    label: 'Đã hủy',
    short: 'Đã hủy',
    bg: '#e2e8f0',
    text: '#334155',
  },
};

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status || 'N/A',
    bg: '#e2e8f0',
    text: '#334155',
  };

  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ApplicationStatusScreen() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  async function fetchRequests(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await requestService.getMyRequests();
      const rows = response?.data?.data || [];
      setRequests(rows);
      if (!selectedId && rows.length > 0) {
        setSelectedId(rows[0]._id);
      }
      if (rows.length === 0) {
        setSelectedId('');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được danh sách đơn');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchRequests(false);
  }, []);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((item) => item.status === statusFilter);
  }, [requests, statusFilter]);

  const selectedRequest = useMemo(
    () => filteredRequests.find((item) => item._id === selectedId) || filteredRequests[0] || null,
    [filteredRequests, selectedId],
  );

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      if (!selectedRequest?._id) {
        if (mounted) setSelectedDetail(null);
        return;
      }

      setDetailLoading(true);
      try {
        const response = await requestService.getRequestById(selectedRequest._id);
        const detail = response?.data?.data || null;
        if (mounted) {
          setSelectedDetail(detail || selectedRequest);
        }
      } catch (err) {
        if (mounted) {
          setSelectedDetail(selectedRequest);
        }
      } finally {
        if (mounted) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      mounted = false;
    };
  }, [selectedRequest?._id]);

  const statusOptions = ['all', 'Pending', 'Processing', 'Approved', 'Rejected', 'Cancelled'];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests(true)} />}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Trạng thái đơn đã nộp</Text>
          <Text style={styles.subTitle}>Theo dõi tình trạng duyệt hồ sơ và xem chi tiết từng đơn.</Text>
        </View>

        <View style={styles.filterWrap}>
          {statusOptions.map((status) => {
            const isActive = statusFilter === status;
            const label = status === 'all' ? 'Tất cả' : STATUS_META[status]?.label || status;
            return (
              <Pressable
                key={status}
                onPress={() => setStatusFilter(status)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centeredBox}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.helperText}>Đang tải danh sách đơn...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.centeredBox}>
            <MaterialCommunityIcons name="inbox-arrow-down-outline" size={46} color="#94a3b8" />
            <Text style={styles.helperText}>Chưa có đơn phù hợp bộ lọc hiện tại.</Text>
          </View>
        ) : (
          <>
            <View style={styles.listWrap}>
              {filteredRequests.map((item) => {
                const isSelected = selectedRequest?._id === item._id;
                const statusMeta = STATUS_META[item.status] || { short: item.status || 'N/A' };

                return (
                  <Pressable
                    key={item._id}
                    onPress={() => setSelectedId(item._id)}
                    style={[styles.listCard, isSelected && styles.listCardActive]}
                  >
                    <View style={styles.listCardTop}>
                      <Text style={styles.requestType}>{item.requestType || 'Đơn không xác định'}</Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <Text style={styles.requestMeta}>Nộp ngày: {formatDate(item.createdAt)}</Text>
                    <Text style={styles.requestMeta}>Tình trạng: {statusMeta.short}</Text>
                  </Pressable>
                );
              })}
            </View>

            {(selectedDetail || selectedRequest) && (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Chi tiết đơn</Text>

                {detailLoading ? (
                  <View style={styles.detailLoadingWrap}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.detailLoadingText}>Đang tải chi tiết...</Text>
                  </View>
                ) : null}

                {(() => {
                  const detail = selectedDetail || selectedRequest;

                  return (
                    <>
                      <DetailRow label="Loại đơn" value={detail.requestType || 'N/A'} />
                      <DetailRow label="Trạng thái" value={STATUS_META[detail.status]?.label || detail.status || 'N/A'} />
                      <DetailRow label="Ngày nộp" value={formatDate(detail.createdAt)} />
                      <DetailRow label="Ngày bắt đầu" value={formatDate(detail.startDate)} />
                      <DetailRow label="Ngày kết thúc" value={formatDate(detail.endDate)} />
                      <DetailRow label="Môn liên quan" value={detail.relatedSubject || 'Không có'} />

                      <View style={styles.noteBlock}>
                        <Text style={styles.noteLabel}>Lý do / nội dung</Text>
                        <Text style={styles.noteContent}>{detail.reason || 'Không có nội dung'}</Text>
                      </View>

                      <View style={styles.noteBlock}>
                        <Text style={styles.noteLabel}>Phản hồi từ phòng đào tạo</Text>
                        <Text style={styles.noteContent}>{detail.staffNote || 'Chưa có phản hồi'}</Text>
                      </View>

                      <Text style={styles.attachmentText}>
                        Tệp đính kèm: {Array.isArray(detail.attachments) ? detail.attachments.length : 0}
                      </Text>
                    </>
                  );
                })()}
              </View>
            )}
          </>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  subTitle: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
  },
  filterChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  centeredBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
  },
  helperText: {
    marginTop: 8,
    color: '#64748b',
  },
  listWrap: {
    gap: 10,
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  listCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  requestType: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  requestMeta: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 2,
  },
  detailTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailLoadingText: {
    color: '#64748b',
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailLabel: {
    color: '#475569',
    fontSize: 12,
  },
  detailValue: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
    maxWidth: '62%',
    textAlign: 'right',
  },
  noteBlock: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  noteLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 4,
  },
  noteContent: {
    color: '#0f172a',
    fontSize: 13,
    lineHeight: 19,
  },
  attachmentText: {
    marginTop: 10,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 12,
  },
});
