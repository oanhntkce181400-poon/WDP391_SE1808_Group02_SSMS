# API Documentation - Exam Schedule (Lịch thi)

## Base URL
```
http://localhost:3000/api/exams
```

---

## 🔐 Authentication
Tất cả các endpoint yêu cầu JWT token trong header:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## 📋 Endpoints

### 1. GET /exams/me
**Mô tả:** Lấy lịch thi của sinh viên hiện tại (chỉ dành cho sinh viên)

**Yêu cầu:**
- Method: `GET`
- Route: `/api/exams/me`
- Auth: Yêu cầu (student token)
- Params: Không

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "examCode": "KTLT-01",
      "subjectCode": "CS101",
      "subjectName": "Lập trình ứng dụng Web",
      "classCode": "TH01",
      "className": "Tín chỉ 01",
      "room": "A101",
      "slot": "Sáng 1",
      "examDate": "2026-03-15T00:00:00.000Z",
      "startTime": "07:30",
      "endTime": "09:30",
      "sbd": "001",
      "examRules": "Quy chế thi chung của nhà trường",
      "notes": "Đến sớm 15 phút",
      "status": "scheduled"
    }
  ],
  "totalCount": 1
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/exams/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

---

### 2. GET /exams
**Mô tả:** Lấy tất cả lịch thi (admin)

**Yêu cầu:**
- Method: `GET`
- Route: `/api/exams`
- Auth: Yêu cầu (admin/staff token)
- Query Params:
  - `page` (optional): Số trang (mặc định: 1)
  - `limit` (optional): Số item/trang (mặc định: 10)
  - `keyword` (optional): Tìm kiếm theo examCode, subjectName, classCode
  - `status` (optional): Lọc theo trạng thái (scheduled, ongoing, completed, cancelled)
  - `examDate` (optional): Lọc theo ngày (YYYY-MM-DD)
  - `classCode` (optional): Lọc theo mã lớp

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { /* exam objects */ }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/exams?page=1&limit=10&status=scheduled" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

---

### 3. GET /exams/:id
**Mô tả:** Lấy chi tiết một kỳ thi

**Yêu cầu:**
- Method: `GET`
- Route: `/api/exams/{exam_id}`
- Auth: Yêu cầu
- Params:
  - `id` (required): ID của exam

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "examCode": "KTLT-01",
    "subjectCode": "CS101",
    "subjectName": "Lập trình ứng dụng Web",
    "classCode": "TH01",
    "className": "Tín chỉ 01",
    "room": "A101",
    "slot": "Sáng 1",
    "examDate": "2026-03-15T00:00:00.000Z",
    "startTime": "07:30",
    "endTime": "09:30",
    "sbd": "001",
    "enrolledStudents": [
      {
        "studentId": "607f1f77bcf86cd799439022",
        "studentCode": "SV001",
        "fullName": "Nguyễn Văn A",
        "sbd": "002"
      }
    ],
    "examRules": "Quy chế thi chung của nhà trường",
    "notes": "Đến sớm 15 phút",
    "status": "scheduled",
    "createdAt": "2026-02-20T10:00:00.000Z",
    "updatedAt": "2026-02-20T10:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/exams/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

---

### 4. POST /exams
**Mô tả:** Tạo kỳ thi mới (admin)

**Yêu cầu:**
- Method: `POST`
- Route: `/api/exams`
- Auth: Yêu cầu (admin token)
- Content-Type: `application/json`

**Request Body:**
```json
{
  "examCode": "KTLT-02",
  "subjectCode": "CS102",
  "subjectName": "Cơ sở dữ liệu",
  "classCode": "TH02",
  "className": "Tín chỉ 02",
  "room": "A102",
  "slot": "Sáng 2",
  "examDate": "2026-03-15T00:00:00Z",
  "startTime": "10:00",
  "endTime": "12:00",
  "examRules": "Quy chế thi chung của nhà trường",
  "notes": "Mang theo CMND"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Exam created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "examCode": "KTLT-02",
    /* ... other fields ... */
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "examCode": "KTLT-02",
    "subjectCode": "CS102",
    "subjectName": "Cơ sở dữ liệu",
    "classCode": "TH02",
    "className": "Tín chỉ 02",
    "room": "A102",
    "slot": "Sáng 2",
    "examDate": "2026-03-15T00:00:00Z",
    "startTime": "10:00",
    "endTime": "12:00"
  }'
```

---

### 5. PATCH /exams/:id
**Mô tả:** Cập nhật kỳ thi (admin)

**Yêu cầu:**
- Method: `PATCH`
- Route: `/api/exams/{exam_id}`
- Auth: Yêu cầu (admin token)
- Content-Type: `application/json`

**Request Body:** (chỉ gửi những field cần cập nhật)
```json
{
  "room": "A103",
  "startTime": "08:00",
  "endTime": "10:00",
  "status": "ongoing"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    /* ... updated exam object ... */
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/exams/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "room": "A103",
    "status": "ongoing"
  }'
```

---

### 6. DELETE /exams/:id
**Mô tả:** Xóa kỳ thi (admin)

**Yêu cầu:**
- Method: `DELETE`
- Route: `/api/exams/{exam_id}`
- Auth: Yêu cầu (admin token)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/exams/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

---

### 7. POST /exams/:id/add-students
**Mô tả:** Thêm sinh viên vào kỳ thi (admin)

**Yêu cầu:**
- Method: `POST`
- Route: `/api/exams/{exam_id}/add-students`
- Auth: Yêu cầu (admin token)
- Content-Type: `application/json`

**Request Body:**
```json
{
  "studentIds": ["607f1f77bcf86cd799439022", "607f1f77bcf86cd799439023"],
  "sbd": "002"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Students added to exam successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "enrolledStudents": [
      {
        "studentId": "607f1f77bcf86cd799439022",
        "studentCode": "SV001",
        "fullName": "Nguyễn Văn A",
        "sbd": "002"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/exams/507f1f77bcf86cd799439012/add-students \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["607f1f77bcf86cd799439022"],
    "sbd": "002"
  }'
```

---

## 💡 HTTP Status Codes

| Code | Mô tả |
|------|-------|
| 200 | OK - Yêu cầu thành công |
| 201 | Created - Tạo mới thành công |
| 400 | Bad Request - Dữ liệu không hợp lệ |
| 401 | Unauthorized - Không có token hoặc token hết hạn |
| 403 | Forbidden - Không có quyền truy cập |
| 404 | Not Found - Exam không tồn tại |
| 500 | Internal Server Error - Lỗi máy chủ |

---

## ❌ Error Responses

### Lỗi 400 - Missing required fields
```json
{
  "success": false,
  "message": "Missing required fields"
}
```

### Lỗi 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Lỗi 404 - Not Found
```json
{
  "success": false,
  "message": "Exam not found"
}
```

### Lỗi 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to fetch exam schedule",
  "error": "Error message details"
}
```

---

## 📝 Postman Collection

Bạn có thể import collection sau vào Postman:

```json
{
  "info": {
    "name": "Exam Schedule API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get My Exams",
      "request": {
        "method": "GET",
        "url": { "raw": "{{BASE_URL}}/exams/me", "host": ["{{BASE_URL}}"], "path": ["exams", "me"] },
        "header": { "key": "Authorization", "value": "Bearer {{TOKEN}}" }
      }
    },
    {
      "name": "Get All Exams",
      "request": {
        "method": "GET",
        "url": { "raw": "{{BASE_URL}}/exams", "host": ["{{BASE_URL}}"], "path": ["exams"] },
        "header": { "key": "Authorization", "value": "Bearer {{TOKEN}}" }
      }
    }
  ]
}
```

---

## 🔄 Workflow

### Workflow Sinh viên xem lịch thi:
1. Sinh viên đăng nhập → nhận JWT token
2. Frontend gọi `GET /api/exams/me` với token
3. Backend trả về danh sách exams của sinh viên
4. Frontend hiển thị lịch thi

### Workflow Admin tạo lịch thi:
1. Admin đăng nhập → nhận JWT token (admin)
2. Admin gọi `POST /api/exams` để tạo kỳ thi
3. Backend lưu exam vào database
4. Admin gọi `POST /api/exams/:id/add-students` để thêm sinh viên
5. Sinh viên có thể thấy lịch thi khi vào trang

---

## 🧪 Testing Tips

1. **Test GET /exams/me** với student token → phải có sinh viên trong enrolledStudents
2. **Test POST /exams** → kiểm tra exam được tạo trong database
3. **Test PATCH /exams/:id** → kiểm tra updates được áp dụng
4. **Test DELETE /exams/:id** → kiểm tra exam bị xóa
5. **Test add-students** → kiểm tra sinh viên có trong enrolledStudents array

---

Được tạo: 21/02/2026
Version: 1.0
