// Entry point for React Native app
import React from 'react';
import { SocketProvider } from './src/contexts/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * Root App component
 * Wrap SocketProvider ở đây để toàn bộ app có thể dùng socket
 */
export default function App() {
  return (
    <SocketProvider>
      <AppNavigator />
    </SocketProvider>
  );
}
