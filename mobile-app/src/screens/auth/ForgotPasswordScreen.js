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
import authService from '../../services/authService';

export default function ForgotPasswordScreen({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleRequestOtp() {
    if (!email.trim()) {
      setError('Please enter your email first.');
      return;
    }

    setRequestingOtp(true);
    setError('');
    setInfo('');

    try {
      await authService.forgotPassword(email.trim());
      setOtpRequested(true);
      setInfo('OTP sent. Check your email and enter the code below.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to request reset OTP.');
    } finally {
      setRequestingOtp(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim() || !otp.trim() || !newPassword || !confirmPassword) {
      setError('Please complete all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    setInfo('');

    try {
      await authService.resetPassword(email.trim(), otp.trim(), newPassword);
      setInfo('Password updated successfully. Return to login with your new password.');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onBackToLogin?.();
      }, 800);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Request an OTP from the backend, then set a new password for your account.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Pressable
          onPress={handleRequestOtp}
          style={[styles.secondaryButton, requestingOtp && styles.buttonDisabled]}
          disabled={requestingOtp || submitting}
        >
          {requestingOtp ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {otpRequested ? 'Resend OTP' : 'Send OTP'}
            </Text>
          )}
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="OTP"
          autoCapitalize="none"
          value={otp}
          onChangeText={setOtp}
        />

        <TextInput
          style={styles.input}
          placeholder="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <Pressable
          onPress={handleResetPassword}
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          disabled={submitting || requestingOtp}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Update password</Text>
          )}
        </Pressable>

        <Pressable onPress={onBackToLogin} style={styles.linkButton}>
          <Text style={styles.linkText}>Back to login</Text>
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
    marginBottom: 16,
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
  info: {
    color: '#0369a1',
    marginBottom: 10,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
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
