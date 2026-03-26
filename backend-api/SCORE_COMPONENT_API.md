# Score Component API Documentation

## Tổng Quan

Score Component API cho phép quản lý công thức tính điểm linh hoạt cho từng môn học. Thay vì sử dụng một công thức cứng đầu (30-50-20), bây giờ bạn có thể định nghĩa các thành phần điểm (PT1, PT2, GK, CK, BT, Lab, etc.) với trọng số riêng cho mỗi môn.

## Endpoints

### 1. Get Score Component for Subject

**Endpoint:** `GET /api/score-components/:subjectId`

**Mô tả:** Lấy công thức tính điểm của một môn học

**Parameters:**
- `subjectId` (path): MongoDB ID của môn học

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "subject": "507f1f77bcf86cd799439010",
  "components": [
    {
      "code": "PT1",
      "name": "Kiểm tra 1",
      "weight": 0.10,
      "description": "Kiểm tra thường xuyên lần 1",
      "minScore": 0,
      "maxScore": 10,
      "numberOfAttempts": 1,
      "isRequired": false,
      "order": 1
    },
    {
      "code": "GK",
      "name": "Giữa kỳ",
      "weight": 0.30,
      "description": "Kiểm tra giữa kỳ",
      "minScore": 0,
      "maxScore": 10,
      "numberOfAttempts": 1,
      "isRequired": true,
      "order": 2
    },
    {
      "code": "CK",
      "name": "Cuối kỳ",
      "weight": 0.60,
      "description": "Kiểm tra cuối kỳ",
      "minScore": 0,
      "maxScore": 10,
      "numberOfAttempts": 1,
      "isRequired": true,
      "order": 3
    }
  ],
  "calculationType": "WEIGHTED_AVG",
  "note": "Tính trung bình có trọng số",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Error Responses:**
- `404`: Không tìm thấy Score Component cho môn học này
- `401`: Chưa xác thực

---

### 2. Create or Update Score Component

**Endpoint:** `POST /api/score-components/:subjectId`

**Authorization:** Admin hoặc Staff

**Mô tả:** Tạo hoặc cập nhật công thức tính điểm cho một môn học

**Parameters:**
- `subjectId` (path): MongoDB ID của môn học

**Request Body:**
```json
{
  "components": [
    {
      "code": "PT1",
      "name": "Bài kiểm tra 1",
      "weight": 0.10,
      "description": "Kiểm tra thường xuyên lần 1",
      "isRequired": false
    },
    {
      "code": "PT2",
      "name": "Bài kiểm tra 2",
      "weight": 0.10,
      "description": "Kiểm tra thường xuyên lần 2",
      "isRequired": false
    },
    {
      "code": "GK",
      "name": "Giữa kỳ",
      "weight": 0.30,
      "isRequired": true
    },
    {
      "code": "CK",
      "name": "Cuối kỳ",
      "weight": 0.50,
      "isRequired": true
    }
  ],
  "calculationType": "WEIGHTED_AVG",
  "note": "Công thức tính trung bình có trọng số"
}
```

**Validation Rules:**
- ✅ Tổng `weight` của tất cả components phải = 1.0
- ✅ Mỗi `code` phải duy nhất trong một môn
- ✅ `weight` phải > 0 và <= 1.0
- ✅ `code` và `name` bắt buộc

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "subject": "507f1f77bcf86cd799439010",
  "components": [
    {
      "code": "PT1",
      "name": "Bài kiểm tra 1",
      "weight": 0.10,
      ...
    },
    ...
  ],
  "calculationType": "WEIGHTED_AVG",
  "totalWeight": 1.00,
  "message": "Score component updated successfully"
}
```

**Error Responses:**
- `400`: Tổng trọng số không = 1.0
- `400`: Có thành phần với code trùng lặp
- `403`: Không có quyền (chỉ admin/staff)
- `404`: Không tìm thấy môn học

---

### 3. Get All Score Components

**Endpoint:** `GET /api/score-components`

**Query Parameters:**
- `subjectId` (optional): Lọc theo môn học
- `limit` (optional): Số lượng kết quả (default: 50)
- `skip` (optional): Bỏ qua số lượng (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "subject": {
        "_id": "507f1f77bcf86cd799439010",
        "subjectCode": "WDP301",
        "subjectName": "Web Design & Prototyping"
      },
      "components": [...],
      "calculationType": "WEIGHTED_AVG"
    },
    ...
  ]
}
```

---

### 4. Delete Score Component

**Endpoint:** `DELETE /api/score-components/:scoreComponentId`

**Authorization:** Admin only

**Mô tả:** Xóa công thức tính điểm. Sau khi xóa, môn học sẽ trở về sử dụng công thức mặc định (30-50-20)

**Response:**
```json
{
  "success": true,
  "message": "Score component deleted successfully"
}
```

**Error Responses:**
- `403`: Chỉ admin mới có thể xóa
- `404`: Không tìm thấy score component

---

## Ví dụ Sử Dụng

### JavaScript/Axios

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

// 1. Lấy công thức tính điểm của WDP301
const getScoreComponent = async (subjectId) => {
  try {
    const response = await axios.get(
      `${API_BASE}/score-components/${subjectId}`
    );
    console.log('Score Component:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
};

// 2. Tạo công thức mới
const createScoreComponent = async (subjectId) => {
  try {
    const response = await axios.post(
      `${API_BASE}/score-components/${subjectId}`,
      {
        components: [
          { code: 'Lab1', name: 'On-going 1', weight: 0.15, isRequired: false },
          { code: 'Lab2', name: 'On-going 2', weight: 0.15, isRequired: false },
          { code: 'GK', name: 'Midterm', weight: 0.30, isRequired: true },
          { code: 'CK', name: 'Final', weight: 0.40, isRequired: true }
        ],
        calculationType: 'WEIGHTED_AVG'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log('Created:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
};

// 3. Lấy danh sách tất cả score components
const getAllScoreComponents = async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/score-components?limit=10`
    );
    console.log('All components:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
};

// 4. Xóa score component
const deleteScoreComponent = async (componentId) => {
  try {
    const response = await axios.delete(
      `${API_BASE}/score-components/${componentId}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );
    console.log('Deleted:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
};
```

### React Component

```jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

function ScoreComponentForm({ subjectId }) {
  const [loading, setLoading] = useState(false);
  const [scoreComponent, setScoreComponent] = useState(null);

  useEffect(() => {
    loadScoreComponent();
  }, [subjectId]);

  const loadScoreComponent = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `/api/score-components/${subjectId}`
      );
      setScoreComponent(data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (components) => {
    try {
      const { data } = await axios.post(
        `/api/score-components/${subjectId}`,
        { components, calculationType: 'WEIGHTED_AVG' }
      );
      setScoreComponent(data);
      alert('Saved successfully!');
    } catch (error) {
      alert('Error: ' + error.response?.data?.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Score Components for {subjectId}</h2>
      {scoreComponent ? (
        <div>
          {scoreComponent.components.map((comp, idx) => (
            <div key={idx}>
              {comp.code}: {comp.name} ({(comp.weight * 100).toFixed(0)}%)
            </div>
          ))}
          <p>Total Weight: {scoreComponent.totalWeight}</p>
        </div>
      ) : (
        <p>No score component defined yet</p>
      )}
    </div>
  );
}

export default ScoreComponentForm;
```

---

## Công Thức Tính Toán

### Weighted Average (WEIGHTED_AVG)

Dùng cho các thành phần có thể có điểm 0-10:

```
Final Grade = Σ(Score × Weight)
```

**Ví dụ:**
```
Components:
- PT1: 8.0 × 0.10 = 0.80
- PT2: 9.0 × 0.10 = 0.90
- GK: 7.5 × 0.30 = 2.25
- CK: 8.5 × 0.50 = 4.25
────────────────────────
Final Grade = 8.20
```

### Xử Lý Điểm Thiếu

- Nếu một thành phần **bắt buộc** (`isRequired: true`) bị thiếu, công thức sẽ trả về `null` (cần nhập trước)
- Nếu thành phần **không bắt buộc** (`isRequired: false`) bị thiếu, nó sẽ được bỏ qua (không tính vào)

---

## Integration với Grade Calculation

### Điểm Trước (Cũ) - Hardcoded

```javascript
// ❌ Cách cũ - Cứng nhắc
const GRADE_WEIGHTS = {
  midtermScore: 0.30,
  finalScore: 0.50,
  assignmentScore: 0.20
};

grade = (midterm × 0.30) + (final × 0.50) + (assignment × 0.20);
```

### Điểm Nay (Mới) - Dynamic

```javascript
// ✅ Cách mới - Linh hoạt theo môn
const scoreComponent = await getScoreComponentBySubject(subjectId);
const finalGrade = calculateFinalScore(enrollmentScores, scoreComponent);
```

---

## Error Handling

### Common Errors

| Status | Lỗi | Giải Pháp |
|--------|-----|---------|
| 400 | `Total weight must equal 1.0` | Điều chỉnh trọng số: 0.10+0.10+0.30+0.50 = 1.0 |
| 400 | `Duplicate component code in same subject` | Mỗi code chỉ có 1 lần / môn |
| 401 | `Unauthorized` | Cần xác thực (JWT token) |
| 403 | `Forbidden` | Chỉ Admin/Staff có quyền tạo/cập nhật |
| 404 | `No score component found` | Một số âm điểm sử dụng công thức mặc định |

---

## Testing

### Runbook for Testing

```bash
# 1. Start backend
cd backend-api
npm install
node src/index.js

# 2. Seed score components
node seed-score-components.js

# 3. Test endpoints
curl -X GET http://localhost:8000/api/score-components

# 4. Check in UI
# Thêm route trong router:
// /admin/score-components -> AdminScoreComponentPage.jsx
```

---

## Backward Compatibility

Khi `Score Component` không tìm thấy cho môn nào, hệ thống sẽ:
1. Tự động sử dụng công thức mặc định: `GK 30% + CK 50% + BT 20%`
2. Ghi log: `"Using fallback weights for subject X"`
3. Không gây lỗi cho học viên

---

## Version

- **API Version**: 1.0
- **Created**: 2024
- **Last Updated**: 2024
- **Next Features**: Custom formula editor, formula template library
