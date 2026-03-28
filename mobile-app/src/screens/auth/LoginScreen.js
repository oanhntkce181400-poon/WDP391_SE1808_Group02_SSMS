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

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmailInput(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function buildPasswordCandidates(value) {
  const raw = String(value ?? '');
  const noZeroWidth = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const trimmed = noZeroWidth.trim();

  return [raw, noZeroWidth, trimmed]
    .filter((item) => item.length > 0)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

export default function LoginScreen({ onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  async function finalizeLogin(payload) {
    const user = payload?.data?.user || null;
    const accessToken = payload?.data?.tokens?.accessToken || null;
    const refreshToken = payload?.data?.tokens?.refreshToken || null;

    if (!accessToken) {
      throw new Error('Phản hồi đăng nhập không chứa access token.');
    }

    if (normalizeRole(user?.role) === 'student' && !user?.student) {
      throw new Error('Không tìm thấy hồ sơ sinh viên. Vui lòng liên hệ quản trị viên.');
    }

    const authPayload = { user, accessToken, refreshToken };
    setAuth(authPayload);
    await setItem(AUTH_STORAGE_KEY, authPayload);
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const normalizedEmail = normalizeEmailInput(email);
      const passwordCandidates = buildPasswordCandidates(password);

      let loginResponse = null;
      let lastError = null;

      for (const candidatePassword of passwordCandidates) {
        try {
          // Retry with sanitized variants in case the password was pasted with hidden characters.
          // eslint-disable-next-line no-await-in-loop
          loginResponse = await authService.login({
            email: normalizedEmail,
            password: candidatePassword,
          });
          lastError = null;
          break;
        } catch (attemptError) {
          lastError = attemptError;
          const backendMessage = String(attemptError?.response?.data?.message || '').toLowerCase();
          if (!backendMessage.includes('invalid credentials')) {
            throw attemptError;
          }
        }
      }

      if (!loginResponse) {
        throw lastError || new Error('Email hoặc mật khẩu không đúng.');
      }

      await finalizeLogin(loginResponse);
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      if (backendMessage) {
        setError(backendMessage);
      } else {
        setError(`Không kết nối được API. Hãy kiểm tra backend tại ${API_BASE_URL} rồi thử lại.`);
      }
    } finally {
      setIsSubmitting(false);
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
          autoCorrect={false}
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
          style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onForgotPassword}
          style={styles.linkButton}
          disabled={isSubmitting || typeof onForgotPassword !== 'function'}
        >
          <Text style={styles.linkText}>Quên mật khẩu?</Text>
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
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: '#dc2626',
    fontSize: 12,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
