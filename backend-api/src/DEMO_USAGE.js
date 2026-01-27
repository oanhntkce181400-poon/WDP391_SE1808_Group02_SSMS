/**
 * ===================================================================
 * DEMO: Cách sử dụng Cloudinary và Socket.IO trong Controller/Route
 * ===================================================================
 * 
 * File này là VÍ DỤ minh họa cách dùng 2 service đã setup
 * Bạn có thể tham khảo và áp dụng vào routes/controllers thực tế
 */

const express = require('express');
const multer = require('multer');
const { uploadImage, deleteImage } = require('../external/cloudinary.provider');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// ===============================
// 1️⃣ CLOUDINARY - Upload Avatar
// ===============================

// Setup multer để xử lý file upload
const upload = multer({ 
  dest: 'uploads/', // Thư mục tạm để lưu file
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép ảnh
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

/**
 * POST /api/users/avatar
 * Upload avatar của user
 * 
 * Flow:
 * 1. User upload file qua form-data (key: 'avatar')
 * 2. Multer lưu file tạm vào 'uploads/'
 * 3. Upload file lên Cloudinary
 * 4. Lưu URL và public_id vào database
 * 5. Xóa file tạm (optional)
 * 6. Trả về URL ảnh cho client
 */
router.post('/users/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    // req.file chứa thông tin file do multer xử lý
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload lên Cloudinary
    const result = await uploadImage(req.file.path, {
      folder: 'avatars', // Lưu vào folder 'avatars'
      public_id: `user_${req.userId}_${Date.now()}`, // Custom ID
    });

    // Lưu vào database (giả sử có User model)
    // await User.findByIdAndUpdate(req.userId, {
    //   avatar: result.secure_url,
    //   avatarPublicId: result.public_id, // Lưu để xóa sau
    // });

    // Optional: Xóa file tạm
    // const fs = require('fs');
    // fs.unlinkSync(req.file.path);

    res.json({
      message: 'Avatar uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

/**
 * DELETE /api/users/avatar
 * Xóa avatar của user
 * 
 * Flow:
 * 1. Lấy public_id từ database
 * 2. Xóa ảnh từ Cloudinary bằng deleteImage()
 * 3. Update database (set avatar = null)
 */
router.delete('/users/avatar', authMiddleware, async (req, res) => {
  try {
    // Giả sử lấy public_id từ database
    // const user = await User.findById(req.userId);
    // const publicId = user.avatarPublicId;

    const publicId = 'avatars/user_123_1234567890'; // Ví dụ

    if (!publicId) {
      return res.status(400).json({ message: 'No avatar to delete' });
    }

    // Xóa từ Cloudinary
    await deleteImage(publicId);

    // Update database
    // await User.findByIdAndUpdate(req.userId, {
    //   avatar: null,
    //   avatarPublicId: null,
    // });

    res.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ message: 'Failed to delete avatar' });
  }
});

// ===============================
// 2️⃣ SOCKET.IO - Send Notification
// ===============================

/**
 * POST /api/notifications/send
 * Gửi notification real-time tới user cụ thể qua Socket.IO
 * 
 * Flow:
 * 1. API nhận request gửi notification
 * 2. Lưu notification vào database (optional)
 * 3. Dùng Socket.IO để gửi real-time tới user
 * 4. User đang online sẽ nhận ngay lập tức
 */
router.post('/notifications/send', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, title, message } = req.body;

    // Validate
    if (!targetUserId || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Lưu vào database (optional)
    // const notification = await Notification.create({
    //   from: req.userId,
    //   to: targetUserId,
    //   title,
    //   message,
    //   createdAt: new Date(),
    // });

    // Lấy Socket.IO instance từ app
    const io = req.app.get('io');

    // Gửi notification real-time tới user cụ thể
    io.sendToUser(targetUserId, 'notification', {
      id: '123', // notification._id
      from: req.userId,
      title: title || 'New Notification',
      message,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Failed to send notification' });
  }
});

/**
 * POST /api/notifications/broadcast
 * Broadcast notification tới TẤT CẢ users đang online
 * 
 * Flow:
 * 1. API nhận request broadcast
 * 2. Dùng Socket.IO để gửi tới tất cả connected users
 */
router.post('/notifications/broadcast', authMiddleware, async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Lấy Socket.IO instance
    const io = req.app.get('io');

    // Broadcast tới tất cả users
    io.broadcastToAll('system_announcement', {
      title: title || 'System Announcement',
      message,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Broadcast sent successfully' });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ message: 'Failed to broadcast' });
  }
});

// ===============================
// 3️⃣ SOCKET.IO - Advanced Example
// ===============================

/**
 * Ví dụ: Chat Room
 * 
 * Thêm vào socket.config.js:
 * 
 * socket.on('join_room', (roomId) => {
 *   socket.join(roomId);
 *   console.log(`User ${socket.userId} joined room ${roomId}`);
 *   
 *   // Thông báo cho các thành viên khác
 *   socket.to(roomId).emit('user_joined', {
 *     userId: socket.userId,
 *     email: socket.email,
 *   });
 * });
 * 
 * socket.on('leave_room', (roomId) => {
 *   socket.leave(roomId);
 *   console.log(`User ${socket.userId} left room ${roomId}`);
 *   
 *   socket.to(roomId).emit('user_left', {
 *     userId: socket.userId,
 *     email: socket.email,
 *   });
 * });
 * 
 * socket.on('send_message', ({ roomId, message }) => {
 *   // Gửi message tới tất cả users trong room
 *   io.to(roomId).emit('new_message', {
 *     from: socket.userId,
 *     email: socket.email,
 *     message,
 *     timestamp: Date.now(),
 *   });
 * });
 */

// ===============================
// 4️⃣ Frontend Usage Examples
// ===============================

/**
 * FRONTEND WEB (React):
 * 
 * import { useSocket } from '../contexts/SocketContext';
 * 
 * function NotificationComponent() {
 *   const { socket, isConnected } = useSocket();
 *   const [notifications, setNotifications] = useState([]);
 * 
 *   useEffect(() => {
 *     if (!socket) return;
 * 
 *     // Lắng nghe notification
 *     socket.on('notification', (data) => {
 *       setNotifications(prev => [...prev, data]);
 *       // Hiển thị toast/alert
 *       toast.success(data.message);
 *     });
 * 
 *     // Lắng nghe system announcement
 *     socket.on('system_announcement', (data) => {
 *       alert(data.message);
 *     });
 * 
 *     // Cleanup
 *     return () => {
 *       socket.off('notification');
 *       socket.off('system_announcement');
 *     };
 *   }, [socket]);
 * 
 *   return (
 *     <div>
 *       <p>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
 *       <ul>
 *         {notifications.map(notif => (
 *           <li key={notif.id}>{notif.message}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * 
 * 
 * MOBILE APP (React Native):
 * 
 * import { useSocket } from '../contexts/SocketContext';
 * 
 * function HomeScreen() {
 *   const { socket, isConnected } = useSocket();
 * 
 *   useEffect(() => {
 *     if (!socket) return;
 * 
 *     socket.on('notification', (data) => {
 *       Alert.alert(data.title, data.message);
 *     });
 * 
 *     return () => socket.off('notification');
 *   }, [socket]);
 * 
 *   return (
 *     <View>
 *       <Text>Socket: {isConnected ? 'Connected' : 'Disconnected'}</Text>
 *     </View>
 *   );
 * }
 */

module.exports = router;
