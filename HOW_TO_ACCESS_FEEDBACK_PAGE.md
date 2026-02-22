# 🎯 Hướng Dẫn Truy Cập Trang Quản Lý Đánh Giá

## ✅ Đã Cấu Hình Thành Công

Trang quản lý đánh giá đã được thêm vào hệ thống với các bước sau:

### 1️⃣ Route Được Thêm
```
/admin/feedback-management
```

### 2️⃣ Menu Navigation Được Thêm
- Menu item "Đánh giá" trong thanh navigation chính
- Tự động active khi truy cập trang

### 3️⃣ Page Component Được Tạo
- File: `frontend-web/src/pages/admin/FeedbackManagementPage.jsx`
- Hiển thị danh sách mẫu đánh giá

---

## 🌐 Cách Truy Cập

### **Phương Pháp 1: Qua URL Trực Tiếp**
```
http://localhost:3000/admin/feedback-management
```

### **Phương Pháp 2: Qua Menu Navigation** 
1. Đăng nhập với tài khoản admin/staff
2. Tìm **"Đánh giá"** trong thanh menu trên cùng
3. Nhấp để truy cập trang

**Menu Layout:**
```
Lớp học | Xếp lịch | Chuyên ngành | Giảng viên | Môn học | Phòng học | Giờ học | 
Khung chương trình | Quản lý người dùng | Học phí | ⭐ ĐÁNH GIÁ ⭐ | Cấu hình | Nhật ký lỗi
```

### **Phương Pháp 3: Qua Link Programmatic**
```jsx
// Trong component React
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/admin/feedback-management');
```

---

## 📋 Điều Kiện Truy Cập

✅ **Bạn phải là một trong các vai trò sau:**
- `admin` - Quản trị viên
- `staff` - Nhân viên
- `academicAdmin` - Quản trị viên học vụ

❌ **Sinh viên không có quyền truy cập được trang này**

---

## 🎨 Giao Diện Trang

Trang quản lý đánh giá bao gồm:

### **Phần 1: Header**
```
Quản lý mẫu đánh giá          [+ Tạo mẫu mới]
```

### **Phần 2: Filters**
- 📝 Tìm kiếm theo tên/mô tả
- 🏷️ Lọc theo trạng thái (Dự thảo, Đang mở, Đã đóng, Lưu trữ)
- 🎯 Lọc theo đối tượng (Giáo viên, Khóa học, Chương trình)
- 🔄 Nút xóa bộ lọc

### **Phần 3: Danh Sách Templates**
| Tên mẫu | Đối tượng | Thời gian | Trạng thái | Câu hỏi | Thao tác |
|---------|----------|-----------|-----------|---------|---------|
| ...     | ...      | ...       | ...       | ...     | Xem/Sửa/Xóa |

### **Phần 4: Pagination**
- Hiển thị số trang hiện tại
- Nút Trước/Tiếp tục

---

## 💡 Tính Năng Chính

### **1. Tạo Mẫu Đánh Giá**
```
Nhấp [+ Tạo mẫu mới]
  ↓
Nhập tên mẫu
Chọn đối tượng đánh giá
Đặt thời gian mở/đóng
Thêm câu hỏi
Lưu
```

### **2. Quản Lý Câu Hỏi**
- ✏️ Sửa câu hỏi
- 🗑️ Xóa câu hỏi
- ⬆️ Sắp xếp lại câu hỏi (↑↓)

### **3. Các Loại Câu Hỏi**
- ⭐ **Đánh giá sao**: 1-5 sao
- 📝 **Ý kiến tự luận**: Văn bản tự do
- ☑️ **Chọn một**: Nhiều lựa chọn

### **4. Quản Lý Trạng Thái**
- 📋 **Dự thảo**: Chỉnh sửa, chưa công bố
- ✅ **Đang mở**: Sinh viên có thể gửi đánh giá
- 🚫 **Đã đóng**: Không nhận gửi mới
- 📦 **Lưu trữ**: Lưu trữ lâu dài

---

## 🔗 Liên Kết Nhanh

| Trang | URL | Vai trò |
|-------|-----|---------|
| Quản lý mẫu | `/admin/feedback-management` | admin, staff, academicAdmin |
| API Endpoint | `http://localhost:3000/api/feedback-templates` | - |

---

## 📱 Responsive Design

✅ **Trên máy tính**: Toàn bộ tính năng
✅ **Tablet**: Danh sách thu gọn
✅ **Di động**: Dạng xếp chồng

---

## 🚀 Bước Tiếp Theo

1. **Khởi động ứng dụng**
   ```bash
   npm run dev
   ```

2. **Đăng nhập với tài khoản admin**
   ```
   Email: admin@university.edu (hoặc tài khoản của bạn)
   ```

3. **Tìm "Đánh giá" trong menu**

4. **Bắt đầu tạo mẫu đánh giá**

---

## ⚠️ Xử Lý Sự Cố

### **Không thấy menu "Đánh giá"?**
- ✅ Xác nhận bạn đã đăng nhập
- ✅ Kiểm tra vai trò của bạn (phải là admin/staff/academicAdmin)
- ✅ Làm mới trang (Ctrl+R hoặc ⌘+R)
- ✅ Xóa cache trình duyệt

### **Trang không tải?**
- ✅ Kiểm tra backend có chạy không: `http://localhost:3000/health`
- ✅ Kiểm tra console (F12) để xem lỗi
- ✅ Kiểm tra network tab để xem API response

### **API 404?**
- ✅ Đảm bảo backend route được đăng ký: `/api/feedback-templates`
- ✅ Kiểm tra lại file `backend-api/src/index.js`
- ✅ Khởi động lại backend

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra [FEEDBACK_MANAGEMENT_DOCUMENTATION.md](./FEEDBACK_MANAGEMENT_DOCUMENTATION.md)
2. Kiểm tra [FEEDBACK_INTEGRATION_GUIDE.md](./FEEDBACK_INTEGRATION_GUIDE.md)
3. Kiểm tra [FEEDBACK_API_QUICK_REFERENCE.md](./FEEDBACK_API_QUICK_REFERENCE.md)

---

**✅ Bạn đã sẵn sàng! Vào `/admin/feedback-management` để bắt đầu.**
