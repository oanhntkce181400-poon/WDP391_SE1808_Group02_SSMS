import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { getAccessToken } from '../utils/cookieHelper';

/**
 * Trang Test Socket.IO Connection
 * Dùng để kiểm tra kết nối WebSocket và các events
 */
export default function SocketTestPage() {
  const { socket, isConnected, error } = useSocket();
  const [logs, setLogs] = useState([]);
  const [pingResult, setPingResult] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Thêm log vào danh sách
  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { id: Date.now(), timestamp, type, message, data }
    ]);
  };

  // Lắng nghe các events từ server
  useEffect(() => {
    if (!socket) return;

    // Welcome event
    socket.on('welcome', (data) => {
      addLog('info', 'Nhận welcome message', data);
    });

    // Pong event
    socket.on('pong', (data) => {
      const latency = Date.now() - data.receivedData?.sentAt;
      setPingResult({ success: true, latency, data });
      addLog('success', `Pong nhận được! Latency: ${latency}ms`, data);
    });

    // Test event
    socket.on('test_event', (data) => {
      addLog('info', 'Nhận test_event', data);
    });

    // Notification event (ví dụ)
    socket.on('notification', (data) => {
      addLog('warning', 'Nhận notification', data);
    });

    // System announcement
    socket.on('system_announcement', (data) => {
      addLog('warning', 'Thông báo hệ thống', data);
    });

    // Connect event
    socket.on('connect', () => {
      addLog('success', 'Kết nối thành công!', { socketId: socket.id });
    });

    // Disconnect event
    socket.on('disconnect', (reason) => {
      addLog('error', 'Mất kết nối', { reason });
      setPingResult(null);
    });

    // Error event
    socket.on('error', (error) => {
      addLog('error', 'Lỗi socket', { error: error.message });
    });

    // Cleanup
    return () => {
      socket.off('welcome');
      socket.off('pong');
      socket.off('test_event');
      socket.off('notification');
      socket.off('system_announcement');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, [socket]);

  // Test ping
  const handlePing = () => {
    if (!socket) return;
    setPingResult(null);
    const sentAt = Date.now();
    socket.emit('ping', { sentAt, message: 'Ping from client' });
    addLog('info', 'Đã gửi ping', { sentAt });
  };

  // Gửi custom message
  const handleSendCustomMessage = () => {
    if (!socket || !customMessage.trim()) return;
    socket.emit('test_event', { message: customMessage, timestamp: Date.now() });
    addLog('info', 'Đã gửi custom message', { message: customMessage });
    setCustomMessage('');
  };

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
    setPingResult(null);
  };

  // Get log type color
  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Socket.IO Test Page
          </h1>
          <p className="text-gray-600">
            Trang test kết nối WebSocket và các events realtime
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trạng thái kết nối</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Connection Status */}
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Trạng thái</div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                </span>
              </div>
            </div>

            {/* Socket ID */}
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Socket ID</div>
              <div className="font-mono text-sm font-semibold text-gray-900">
                {socket?.id || 'N/A'}
              </div>
            </div>

            {/* Ping Result */}
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Latency</div>
              <div className="font-semibold text-gray-900">
                {pingResult ? `${pingResult.latency}ms` : 'Chưa test'}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-semibold">Lỗi kết nối:</div>
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Thao tác</h2>
          
          <div className="space-y-4">
            {/* Ping Test */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePing}
                disabled={!isConnected}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Test Ping
              </button>
              <span className="text-sm text-gray-600">
                Gửi ping đến server và đo latency
              </span>
            </div>

            {/* Custom Message */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendCustomMessage()}
                placeholder="Nhập message để test..."
                disabled={!isConnected}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSendCustomMessage}
                disabled={!isConnected || !customMessage.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Gửi Test Event
              </button>
            </div>

            {/* Clear Logs */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleClearLogs}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa Logs
              </button>
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {showDebugInfo ? 'Ẩn Debug Info' : 'Hiện Debug Info'}
              </button>
              <span className="text-sm text-gray-600">
                Tổng số logs: {logs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {showDebugInfo && (
          <div className="bg-gray-900 text-green-400 rounded-lg shadow-md p-6 mb-6 font-mono text-sm">
            <h2 className="text-xl font-semibold mb-4 text-white">Debug Information</h2>
            <div className="space-y-2">
              <div><span className="text-gray-400">Access Token:</span> {getAccessToken() ? `${getAccessToken().substring(0, 50)}...` : '❌ NULL'}</div>
              <div><span className="text-gray-400">Cookie String:</span> {document.cookie || '❌ Empty'}</div>
              <div><span className="text-gray-400">Socket Object:</span> {socket ? '✅ Exists' : '❌ NULL'}</div>
              <div><span className="text-gray-400">Socket ID:</span> {socket?.id || 'N/A'}</div>
              <div><span className="text-gray-400">Is Connected:</span> {isConnected ? '✅ TRUE' : '❌ FALSE'}</div>
              <div><span className="text-gray-400">Socket Connected:</span> {socket?.connected ? '✅ TRUE' : '❌ FALSE'}</div>
              <div><span className="text-gray-400">Error:</span> {error || 'None'}</div>
              <div><span className="text-gray-400">API Base URL:</span> {import.meta.env.VITE_API_BASE_URL || 'Not set'}</div>
            </div>
          </div>
        )}

        {/* Event Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Event Logs</h2>
          
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Chưa có logs. Thử test ping hoặc gửi message!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...logs].reverse().map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${getLogColor(log.type)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {log.timestamp}
                        </span>
                        <span className="text-xs font-semibold uppercase">
                          {log.type}
                        </span>
                      </div>
                      <div className="font-medium">{log.message}</div>
                      {log.data && (
                        <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Hướng dẫn sử dụng:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Đảm bảo bạn đã đăng nhập (cần JWT token để kết nối socket)</li>
            <li>Nhấn "Test Ping" để kiểm tra kết nối và đo latency</li>
            <li>Nhập message và nhấn "Gửi Test Event" để test gửi custom event</li>
            <li>Xem Event Logs để theo dõi các events từ server</li>
            <li>Mở Console (F12) để xem chi tiết hơn</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
