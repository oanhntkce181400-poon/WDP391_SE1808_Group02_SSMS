import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../config/env';
import authService from '../../services/authService';
import useAuthStore from '../../stores/useAuthStore';
import { AUTH_STORAGE_KEY, setItem } from '../../utils/storage';

export default function LoginScreen({ onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login({
        email: email.trim(),
        password,
      });

      const user = response?.data?.user || null;
      const accessToken = response?.data?.tokens?.accessToken || null;
      const refreshToken = response?.data?.tokens?.refreshToken || null;

      if (!accessToken) {
        setError('Đăng nhập chưa nhận được access token từ server');
        return;
      }

      const authPayload = { user, accessToken, refreshToken };
      setAuth(authPayload);
      await setItem(AUTH_STORAGE_KEY, authPayload);
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      if (backendMessage) {
        setError(backendMessage);
      } else {
        setError(`Không kết nối được API. Hãy kiểm tra backend tại ${API_BASE_URL} rồi thử lại.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.card}>
        <Text style={styles.title}>SSMS Mobile</Text>
        <Text style={styles.subtitle}>Đăng nhập để sử dụng ứng dụng sinh viên</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleLogin}
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onForgotPassword}
          style={styles.linkButton}
          disabled={loading || typeof onForgotPassword !== 'function'}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 6,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  error: {
    color: '#dc2626',
    marginBottom: 10,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
