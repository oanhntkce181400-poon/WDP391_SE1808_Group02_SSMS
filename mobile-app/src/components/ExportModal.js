import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function ExportModal({ visible, onClose, onExport, isLoading }) {
  const [selectedFormat, setSelectedFormat] = useState('excel');

  const handleExport = () => {
    onExport(selectedFormat);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Xuất báo cáo điểm</Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.subtitle}>Chọn định dạng file:</Text>

            {/* Excel Option */}
            <Pressable
              onPress={() => setSelectedFormat('excel')}
              style={[
                styles.formatOption,
                selectedFormat === 'excel' && styles.formatOptionSelected
              ]}
            >
              <View style={styles.formatOptionContent}>
                <MaterialCommunityIcons
                  name="microsoft-excel"
                  size={32}
                  color={selectedFormat === 'excel' ? '#16a34a' : '#6b7280'}
                />
                <View style={styles.formatInfo}>
                  <Text style={styles.formatName}>Excel (.xlsx)</Text>
                  <Text style={styles.formatDesc}>
                    Định dạng bảng tính, dễ chỉnh sửa
                  </Text>
                </View>
              </View>
              {selectedFormat === 'excel' && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color="#16a34a"
                />
              )}
            </Pressable>

            {/* PDF Option */}
            <Pressable
              onPress={() => setSelectedFormat('pdf')}
              style={[
                styles.formatOption,
                selectedFormat === 'pdf' && styles.formatOptionSelected
              ]}
            >
              <View style={styles.formatOptionContent}>
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={32}
                  color={selectedFormat === 'pdf' ? '#dc2626' : '#6b7280'}
                />
                <View style={styles.formatInfo}>
                  <Text style={styles.formatName}>PDF</Text>
                  <Text style={styles.formatDesc}>
                    Định dạng tài liệu, không thể chỉnh sửa
                  </Text>
                </View>
              </View>
              {selectedFormat === 'pdf' && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color="#dc2626"
                />
              )}
            </Pressable>

            <Text style={styles.note}>
              💡 Gợi ý: Chọn Excel nếu bạn muốn chỉnh sửa, PDF nếu chỉ muốn xem
            </Text>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </Pressable>
            <Pressable
              onPress={handleExport}
              style={styles.exportButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="download"
                    size={18}
                    color="#ffffff"
                  />
                  <Text style={styles.exportButtonText}>Xuất file</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  formatOptionSelected: {
    borderColor: '#1d4ed8',
    backgroundColor: 'rgba(29, 78, 216, 0.05)',
  },
  formatOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  formatInfo: {
    marginLeft: 16,
    flex: 1,
  },
  formatName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  formatDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  note: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    gap: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ExportModal;
