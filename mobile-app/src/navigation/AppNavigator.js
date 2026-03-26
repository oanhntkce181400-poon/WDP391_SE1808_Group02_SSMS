import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/student/HomeScreen';
import FeedbackLecturerScreen from '../screens/student/FeedbackLecturerScreen';
import ApplicationStatusScreen from '../screens/student/ApplicationStatusScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import AcademicCalendarScreen from '../screens/student/AcademicCalendarScreen';
import ExamScheduleScreen from '../screens/student/ExamScheduleScreen';
import AttendanceReportScreen from '../screens/student/AttendanceReportScreen';
import ScheduleScreen from '../screens/student/ScheduleScreen';
import useAuthStore from '../stores/useAuthStore';
import { AUTH_STORAGE_KEY, getItem } from '../utils/storage';

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const currentRole = normalizeRole(currentUser?.role);
  const isAdminViewer = currentRole === 'admin' || currentRole === 'staff';

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      /*
       * Khôi phục phiên đăng nhập từ local storage khi mở app lại để người dùng
       * không phải đăng nhập lại ở mỗi lần khởi động.
       */
      const persisted = await getItem(AUTH_STORAGE_KEY);
      if (mounted && persisted?.accessToken) {
        setAuth({
          user: persisted.user || null,
          accessToken: persisted.accessToken,
          refreshToken: persisted.refreshToken || null,
        });
      }

      if (mounted) {
        setBootstrapping(false);
      }
    }

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, [setAuth]);

  const tabs = useMemo(() => {
    if (isAdminViewer) {
      return [
        { key: 'feedback', icon: 'star', label: 'Đánh giá' },
        { key: 'profile', icon: 'person', label: 'Tài khoản' },
      ];
    }

    return [
      { key: 'home', icon: 'home', label: 'Trang chủ' },
      { key: 'schedule', icon: 'calendar', label: 'Lịch học' },
      { key: 'exam', icon: 'document-text', label: 'Lịch thi' },
      { key: 'feedback', icon: 'star', label: 'Đánh giá' },
      { key: 'application', icon: 'chatbubble', label: 'Đơn từ' },
      { key: 'profile', icon: 'person', label: 'Tài khoản' },
    ];
  }, [isAdminViewer]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const extraScreens = isAdminViewer ? new Set() : new Set(['attendance', 'academicCalendar']);
    const availableTabs = new Set(tabs.map((item) => item.key));
    const defaultTab = isAdminViewer ? 'feedback' : 'home';

    if (!availableTabs.has(activeTab) && !extraScreens.has(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [accessToken, activeTab, isAdminViewer, tabs]);

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 8, color: '#475569' }}>Đang khởi tạo ứng dụng...</Text>
      </View>
    );
  }

  if (!accessToken) {
    return <LoginScreen />;
  }

  let screen = isAdminViewer ? <FeedbackLecturerScreen onNavigate={setActiveTab} /> : <HomeScreen onNavigate={setActiveTab} />;
  if (activeTab === 'feedback') {
    screen = <FeedbackLecturerScreen onNavigate={setActiveTab} />;
  }
  if (activeTab === 'schedule') {
    screen = <ScheduleScreen />;
  }
  if (activeTab === 'exam') {
    screen = <ExamScheduleScreen />;
  }
  if (activeTab === 'attendance') {
    screen = <AttendanceReportScreen onNavigate={setActiveTab} />;
  }
  if (activeTab === 'application') {
    screen = <ApplicationStatusScreen />;
  }
  if (activeTab === 'academicCalendar') {
    screen = <AcademicCalendarScreen />;
  }
  if (activeTab === 'profile') {
    screen = <ProfileScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <View style={{ flex: 1, paddingBottom: 80 }}>{screen}</View>

      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 10,
          backgroundColor: '#f59e0b',
          borderRadius: 24,
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: 10,
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
              }}
            >
              <Ionicons
                name={tab.icon}
                size={24}
                color={isActive ? '#f59e0b' : '#ffffff'}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
