import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/student/HomeScreen';
import ApplicationStatusScreen from '../screens/student/ApplicationStatusScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import AcademicCalendarScreen from '../screens/student/AcademicCalendarScreen';
import useAuthStore from '../stores/useAuthStore';
import { AUTH_STORAGE_KEY, getItem } from '../utils/storage';

export default function AppNavigator() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
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

  const tabs = [
    { key: 'home', icon: 'home', label: 'Home' },
    { key: 'calendar', icon: 'calendar', label: 'Calendar' },
    { key: 'application', icon: 'chatbubble', label: 'Application' },
    { key: 'profile', icon: 'person', label: 'Profile' },
  ];

  let screen = <HomeScreen onNavigate={setActiveTab} />;
  if (activeTab === 'application') {
    screen = <ApplicationStatusScreen />;
  }
  if (activeTab === 'calendar') {
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
