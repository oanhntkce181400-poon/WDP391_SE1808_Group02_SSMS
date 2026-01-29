# 🔍 Chức năng Lọc Môn học (Subject Filter)

## Tổng quan
Chức năng lọc môn học giúp người dùng tìm kiếm và lọc danh sách môn học theo nhiều tiêu chí khác nhau một cách nhanh chóng và hiệu quả.

## Các tính năng lọc

### 1. 🎯 Lọc theo Số tín chỉ (Credits)
- Chọn số tín chỉ: 1, 2, 3, 4, 5, hoặc 6 tín chỉ
- Hiển thị chỉ những môn học có đúng số tín chỉ đã chọn
- Ví dụ: Chọn "3 tín chỉ" sẽ hiển thị tất cả môn 3 tín chỉ

### 2. 🔤 Lọc theo Mã môn học (Code Prefix)
- Nhập các ký tự đầu của mã môn học
- Tự động chuyển sang chữ in hoa
- Hỗ trợ tìm kiếm prefix như: SUB, CS, MATH, IT, GD, AI...
- Ví dụ: Nhập "SUB" sẽ hiển thị SUB045, SUB044, SUB048...

### 3. 🏫 Lọc theo Khoa quản lý (Department/Major)
- Chọn từ danh sách các khoa:
  - **AI** - Trí tuệ nhân tạo
  - **GD** - Thiết kế đồ họa
  - **IB** - Kinh doanh quốc tế
  - **SE** - Kỹ thuật phần mềm
  - **IA** - Kiến trúc thông tin
  - **MC** - Truyền thông đa phương tiện
  - **SA** - Phân tích hệ thống
  - **CS** - Khoa học máy tính
  - **IT** - Công nghệ thông tin

### 4. 📚 Lọc theo Loại môn học
- **Môn chung**: Môn học dùng chung cho nhiều khoa/ngành
- **Môn chuyên ngành**: Môn học riêng cho từng khoa/ngành

## Cách sử dụng

### Bước 1: Mở Modal lọc
1. Vào trang "Quản lý Môn học"
2. Click vào nút **"Lọc"** (có icon filter) trên thanh công cụ

### Bước 2: Chọn tiêu chí lọc
1. Chọn một hoặc nhiều tiêu chí lọc
2. Có thể kết hợp nhiều tiêu chí cùng lúc
3. Xem preview các bộ lọc đang áp dụng trong phần "Bộ lọc đang áp dụng"

### Bước 3: Áp dụng bộ lọc
1. Click **"Áp dụng"** để lọc dữ liệu
2. Hoặc click **"Đặt lại"** để xóa tất cả bộ lọc
3. Hoặc click **"Hủy"** để đóng modal mà không áp dụng

### Bước 4: Xem kết quả
- Danh sách môn học sẽ được lọc theo tiêu chí đã chọn
- Badge hiển thị số lượng bộ lọc đang áp dụng
- Có thể xóa bộ lọc bất kỳ lúc nào bằng nút "Xóa bộ lọc"

## Ví dụ sử dụng

### Ví dụ 1: Tìm môn 3 tín chỉ của khoa SE
```
1. Mở modal lọc
2. Chọn "Số tín chỉ" = "3 tín chỉ"
3. Chọn "Khoa quản lý" = "SE - Kỹ thuật phần mềm"
4. Click "Áp dụng"
→ Kết quả: Hiển thị tất cả môn 3 tín chỉ của khoa SE
```

### Ví dụ 2: Tìm tất cả môn chung có mã bắt đầu bằng SUB
```
1. Mở modal lọc
2. Nhập "Mã môn học bắt đầu với" = "SUB"
3. Chọn "Loại môn học" = "Môn chung"
4. Click "Áp dụng"
→ Kết quả: Hiển thị tất cả môn chung có mã SUBxxx
```

### Ví dụ 3: Lọc môn 4-5 tín chỉ của khoa AI hoặc GD
```
Cách 1: Lọc riêng từng khoa
- Lọc khoa AI với 4 tín chỉ
- Sau đó lọc khoa GD với 5 tín chỉ

Cách 2: Dùng search kết hợp
- Dùng search bar để tìm theo tên môn
- Sau đó áp dụng bộ lọc tín chỉ
```

## Kết hợp Search và Filter

Bạn có thể kết hợp tìm kiếm (Search) và lọc (Filter) để có kết quả chính xác hơn:

1. **Search trước, Filter sau**:
   - Tìm kiếm từ khóa trong thanh search
   - Sau đó áp dụng bộ lọc để thu hẹp kết quả

2. **Filter trước, Search sau**:
   - Áp dụng bộ lọc để có tập dữ liệu nhỏ hơn
   - Sau đó search trong tập dữ liệu đã lọc

## Tính năng nâng cao

### Badge hiển thị bộ lọc đang áp dụng
- Hiển thị số lượng tiêu chí lọc đang dùng
- Hiển thị chi tiết từng tiêu chí (tín chỉ, mã, khoa, loại)
- Nút "Xóa bộ lọc" để xóa tất cả bộ lọc nhanh chóng

### Validation và UX
- Tự động chuyển mã môn học sang chữ in hoa
- Tooltip giải thích cho mỗi trường lọc
- Preview bộ lọc trước khi áp dụng
- Thông báo toast khi áp dụng/xóa bộ lọc thành công

## Tips và Tricks

### 💡 Mẹo 1: Lọc nhanh theo tín chỉ
Để tìm nhanh các môn có tín chỉ cao/thấp:
- 1-2 tín chỉ: Thường là môn thực hành, seminar
- 3 tín chỉ: Môn lý thuyết phổ biến
- 4-6 tín chỉ: Môn chuyên ngành nâng cao

### 💡 Mẹo 2: Dùng Code Prefix để tìm môn theo nhóm
- SUBxxx: Môn cơ bản
- CSxxx: Môn Computer Science
- MATHxxx: Môn Toán học
- ITxxx: Môn công nghệ thông tin

### 💡 Mẹo 3: Kết hợp nhiều tiêu chí
Ví dụ tìm môn lý thuyết chuyên ngành:
```
- Số tín chỉ: 3
- Loại môn học: Môn chuyên ngành
- Khoa quản lý: (chọn khoa của bạn)
```

## Troubleshooting

### Không thấy kết quả sau khi lọc?
1. Kiểm tra lại các tiêu chí lọc
2. Thử giảm số lượng tiêu chí lọc
3. Click "Đặt lại" và thử lại từ đầu

### Muốn xóa một tiêu chí lọc cụ thể?
1. Mở lại modal lọc
2. Chọn "Tất cả" cho tiêu chí đó
3. Click "Áp dụng"

### Lọc không chính xác?
- Đảm bảo dữ liệu môn học đã được nhập đầy đủ
- Kiểm tra xem môn học có thuộc đúng khoa không
- Refresh lại trang và thử lại

## API Integration

Chức năng lọc tích hợp với backend API:
```javascript
GET /api/subjects?page=1&limit=10&credits=3&department=SE
```

Các query parameters được hỗ trợ:
- `credits`: Số tín chỉ (1-6)
- `codePrefix`: Prefix của mã môn học
- `department`: Mã khoa quản lý
- `isCommon`: true/false (môn chung hay không)

## Future Enhancements

Các tính năng có thể phát triển thêm:
- [ ] Lọc theo điều kiện tiên quyết
- [ ] Lọc theo học kỳ được mở
- [ ] Lọc theo giảng viên phụ trách
- [ ] Lọc theo năm học
- [ ] Export danh sách đã lọc ra Excel
- [ ] Lưu bộ lọc yêu thích
- [ ] Lọc nâng cao với AND/OR logic

## Technical Details

### Files liên quan:
- `SubjectFilterModal.jsx` - UI component cho modal lọc
- `SubjectManagement.jsx` - Logic xử lý lọc
- `SubjectList.jsx` - Hiển thị danh sách đã lọc
- `subjectService.js` - API calls

### State management:
```javascript
const [activeFilters, setActiveFilters] = useState({
  credits: '',
  codePrefix: '',
  department: '',
  isCommon: ''
});
```

### Filter logic:
```javascript
const applyFilters = (data, filters) => {
  // Client-side filtering logic
  // Supports: credits, codePrefix, department, isCommon
};
```

---

**Người phát triển**: Finance Feature Team  
**Ngày cập nhật**: 28/01/2026  
**Version**: 1.0.0
