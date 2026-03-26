import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/student/HomeScreen';
import FeedbackLecturerScreen from '../screens/student/FeedbackLecturerScreen';
import ApplicationStatusScreen from '../screens/student/ApplicationStatusScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import AcademicCalendarScreen from '../screens/student/AcademicCalendarScreen';
import ExamScheduleScreen from '../screens/student/ExamScheduleScreen';
import AttendanceReportScreen from '../screens/student/AttendanceReportScreen';
import GradeReportScreen from '../screens/student/GradeReportScreen';
import ScheduleScreen from '../screens/student/ScheduleScreen';
import NotificationListScreen from '../screens/student/NotificationListScreen';
import NotificationDetailScreen from '../screens/student/NotificationDetailScreen';
import authService from '../services/authService';
import useAuthStore from '../stores/useAuthStore';
import { AUTH_STORAGE_KEY, getItem, removeItem } from '../utils/storage';

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [routeParams, setRouteParams] = useState(null);
  const [authView, setAuthView] = useState('login');
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
        const nextAuth = {
          user: persisted.user || null,
          accessToken: persisted.accessToken,
          refreshToken: persisted.refreshToken || null,
        };

        setAuth(nextAuth);

        try {
          const meResponse = await authService.me();
          const meUser = meResponse?.data?.user || null;
          const meRole = normalizeRole(meUser?.role);

          if (meRole === 'student' && !meUser?.student) {
            throw new Error('Student profile not found');
          }

          if (mounted && meUser) {
            const validatedAuth = {
              ...nextAuth,
              user: meUser,
            };
            setAuth(validatedAuth);
          }
        } catch {
          if (mounted) {
            setAuth({ user: null, accessToken: null, refreshToken: null });
          }
          await removeItem(AUTH_STORAGE_KEY);
        }
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
      { key: 'notification', icon: 'notifications', label: 'Thông báo' },
      { key: 'schedule', icon: 'calendar', label: 'Lịch học' },
      { key: 'exam', icon: 'document-text', label: 'Lịch thi' },
      { key: 'grades', icon: 'bar-chart', label: 'Điểm' },
      { key: 'feedback', icon: 'star', label: 'Đánh giá' },
      { key: 'application', icon: 'chatbubble', label: 'Đơn từ' },
      { key: 'profile', icon: 'person', label: 'Tài khoản' },
    ];
  }, [isAdminViewer]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const extraScreens = isAdminViewer
      ? new Set()
      : new Set(['attendance', 'academicCalendar', 'notification-detail', 'grades']);
    const availableTabs = new Set(tabs.map((item) => item.key));
    const defaultTab = isAdminViewer ? 'feedback' : 'home';

    if (!availableTabs.has(activeTab) && !extraScreens.has(activeTab)) {
      setActiveTab(defaultTab);
      setRouteParams(null);
    }
    setAuthView('login');
  }, [accessToken, activeTab, isAdminViewer, tabs]);

  function handleNavigate(nextTab, params = null) {
    setActiveTab(nextTab);
    setRouteParams(params);
  }

  if (bootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 8, color: '#475569' }}>Đang khởi tạo ứng dụng...</Text>
      </View>
    );
  }

  if (!accessToken) {
    if (authView === 'forgot-password') {
      return <ForgotPasswordScreen onBackToLogin={() => setAuthView('login')} />;
    }

    return <LoginScreen onForgotPassword={() => setAuthView('forgot-password')} />;
  }

  let screen = isAdminViewer ? (
    <FeedbackLecturerScreen onNavigate={handleNavigate} />
  ) : (
    <HomeScreen onNavigate={handleNavigate} />
  );

  if (activeTab === 'feedback') {
    screen = <FeedbackLecturerScreen onNavigate={handleNavigate} />;
  }
  if (activeTab === 'notification') {
    screen = <NotificationListScreen onNavigate={handleNavigate} />;
  }
  if (activeTab === 'notification-detail') {
    screen = (
      <NotificationDetailScreen
        announcementId={routeParams?.announcementId || routeParams?.notification?.sourceId}
        notification={routeParams?.notification || null}
        onBack={() => handleNavigate('notification')}
      />
    );
  }
  if (activeTab === 'schedule') {
    screen = <ScheduleScreen />;
  }
  if (activeTab === 'exam') {
    screen = <ExamScheduleScreen />;
  }
  if (activeTab === 'attendance') {
    screen = <AttendanceReportScreen onNavigate={handleNavigate} />;
  }
  if (activeTab === 'grades') {
    screen = <GradeReportScreen />;
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
              onPress={() => handleNavigate(tab.key)}
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
