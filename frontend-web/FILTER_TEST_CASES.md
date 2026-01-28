# Test Cases cho Chức năng Lọc Môn học

## Test Suite: Subject Filter Feature

### TC-001: Mở Modal Lọc
**Mục đích**: Kiểm tra việc mở modal lọc  
**Bước thực hiện**:
1. Truy cập trang Quản lý Môn học
2. Click nút "Lọc"

**Kết quả mong đợi**:
- Modal lọc hiển thị
- Các trường filter rỗng (default state)
- Nút "Áp dụng", "Đặt lại", "Hủy" hiển thị

**Status**: ✅ Pass

---

### TC-002: Lọc theo Số tín chỉ
**Mục đích**: Kiểm tra lọc theo số tín chỉ  
**Dữ liệu test**:
```
- SUB045: bus program back-end (2 tín chỉ) - IB
- SUB044: capacitor navigate back-end (4 tín chỉ) - GD
- SUB048: firewall navigate multi-byte (3 tín chỉ) - AI
- SUB046: sensor input solid state (5 tín chỉ) - AI
- SUB042: monitor input multi-byte (4 tín chỉ) - AI
```

**Test Cases**:
1. Chọn "3 tín chỉ" → Chỉ hiển thị SUB048
2. Chọn "4 tín chỉ" → Hiển thị SUB044, SUB042
3. Chọn "5 tín chỉ" → Hiển thị SUB046

**Kết quả**: ✅ Pass

---

### TC-003: Lọc theo Mã môn học
**Mục đích**: Kiểm tra lọc theo prefix mã môn  
**Bước thực hiện**:
1. Nhập "SUB" vào trường "Mã môn học bắt đầu với"
2. Click "Áp dụng"

**Kết quả mong đợi**:
- Hiển thị tất cả môn có mã bắt đầu bằng "SUB"
- Text tự động chuyển thành chữ in hoa

**Test Cases**:
| Input | Expected Output |
|-------|----------------|
| SUB   | SUB045, SUB044, SUB048, SUB046, SUB042, SUB047, SUB050 |
| sub   | Tự động → SUB (same as above) |
| CS    | Tất cả môn CS* |
| MATH  | Tất cả môn MATH* |

**Status**: ✅ Pass

---

### TC-004: Lọc theo Khoa quản lý
**Mục đích**: Kiểm tra lọc theo khoa/ngành  
**Test Cases**:

1. **Test AI Department**
   - Input: Khoa = "AI"
   - Expected: SUB048, SUB046, SUB042
   
2. **Test GD Department**
   - Input: Khoa = "GD"
   - Expected: SUB044
   
3. **Test IB Department**
   - Input: Khoa = "IB"
   - Expected: SUB045

**Status**: ✅ Pass

---

### TC-005: Lọc theo Loại môn học
**Mục đích**: Kiểm tra lọc môn chung vs môn chuyên ngành  
**Test Cases**:

1. **Môn chung**
   - Input: Loại môn học = "Môn chung"
   - Expected: Hiển thị các môn có `isCommon = true`
   
2. **Môn chuyên ngành**
   - Input: Loại môn học = "Môn chuyên ngành"
   - Expected: Hiển thị các môn có `isCommon = false`

**Status**: ✅ Pass

---

### TC-006: Kết hợp nhiều bộ lọc
**Mục đích**: Kiểm tra lọc với nhiều tiêu chí cùng lúc  
**Test Cases**:

1. **Test Case 1: Credits + Department**
   ```
   Input:
   - Số tín chỉ: 4
   - Khoa quản lý: AI
   
   Expected: SUB042 (monitor input multi-byte - 4 tín chỉ - AI)
   ```

2. **Test Case 2: Code Prefix + Credits**
   ```
   Input:
   - Mã môn học: SUB
   - Số tín chỉ: 5
   
   Expected: SUB046 (sensor input solid state - 5 tín chỉ)
   ```

3. **Test Case 3: Department + isCommon**
   ```
   Input:
   - Khoa quản lý: AI
   - Loại môn học: Môn chuyên ngành
   
   Expected: Các môn AI không phải môn chung
   ```

4. **Test Case 4: All filters**
   ```
   Input:
   - Mã môn học: SUB
   - Số tín chỉ: 3
   - Khoa quản lý: AI
   - Loại môn học: Môn chuyên ngành
   
   Expected: SUB048 (nếu thỏa mãn tất cả điều kiện)
   ```

**Status**: ✅ Pass

---

### TC-007: Đặt lại bộ lọc
**Mục đích**: Kiểm tra nút "Đặt lại"  
**Bước thực hiện**:
1. Chọn nhiều bộ lọc
2. Click "Đặt lại"

**Kết quả mong đợi**:
- Tất cả trường filter trở về giá trị mặc định
- Preview "Bộ lọc đang áp dụng" không hiển thị
- Modal vẫn mở

**Status**: ✅ Pass

---

### TC-008: Hủy bỏ lọc
**Mục đích**: Kiểm tra nút "Hủy"  
**Bước thực hiện**:
1. Mở modal lọc
2. Chọn một vài bộ lọc
3. Click "Hủy"

**Kết quả mong đợi**:
- Modal đóng
- Bộ lọc cũ vẫn được giữ nguyên (nếu có)
- Không áp dụng bộ lọc mới

**Status**: ✅ Pass

---

### TC-009: Xóa bộ lọc từ badge
**Mục đích**: Kiểm tra nút "Xóa bộ lọc" trên badge  
**Bước thực hiện**:
1. Áp dụng bộ lọc
2. Click nút "Xóa bộ lọc" trên badge màu xanh

**Kết quả mong đợi**:
- Tất cả bộ lọc bị xóa
- Danh sách hiển thị tất cả môn học
- Badge biến mất
- Toast notification hiển thị

**Status**: ✅ Pass

---

### TC-010: Kết hợp Search và Filter
**Mục đích**: Kiểm tra việc kết hợp search và filter  
**Test Cases**:

1. **Search trước, Filter sau**
   ```
   1. Search: "back-end"
   2. Filter: Số tín chỉ = 2
   
   Expected: Chỉ môn back-end có 2 tín chỉ (SUB045)
   ```

2. **Filter trước, Search sau**
   ```
   1. Filter: Khoa = AI
   2. Search: "navigate"
   
   Expected: Các môn AI có từ "navigate" (SUB048)
   ```

3. **Cả hai cùng lúc**
   ```
   1. Search: "input"
   2. Filter: Số tín chỉ = 4, Khoa = AI
   
   Expected: SUB042 (monitor input multi-byte)
   ```

**Status**: ✅ Pass

---

### TC-011: Pagination với Filter
**Mục đích**: Kiểm tra phân trang sau khi lọc  
**Bước thực hiện**:
1. Áp dụng bộ lọc
2. Chuyển trang

**Kết quả mong đợi**:
- Bộ lọc vẫn được áp dụng khi chuyển trang
- Số lượng kết quả chính xác
- Pagination cập nhật đúng

**Status**: ✅ Pass

---

### TC-012: Toast Notifications
**Mục đích**: Kiểm tra thông báo toast  
**Test Cases**:

1. Áp dụng 1 bộ lọc → "Đã áp dụng 1 bộ lọc"
2. Áp dụng 3 bộ lọc → "Đã áp dụng 3 bộ lọc"
3. Xóa tất cả bộ lọc → "Đã xóa tất cả bộ lọc"

**Status**: ✅ Pass

---

### TC-013: Responsive Design
**Mục đích**: Kiểm tra responsive trên các thiết bị  
**Test Cases**:

1. **Desktop (1920x1080)**
   - Modal hiển thị đầy đủ
   - Các trường filter dễ nhìn
   
2. **Tablet (768x1024)**
   - Modal vừa màn hình
   - Scroll nếu cần
   
3. **Mobile (375x667)**
   - Modal full width
   - Các button stack vertical

**Status**: ⚠️ Cần kiểm tra thêm

---

### TC-014: Dark Mode
**Mục đích**: Kiểm tra hiển thị dark mode  
**Bước thực hiện**:
1. Bật dark mode
2. Mở modal lọc

**Kết quả mong đợi**:
- Background đúng màu dark
- Text có contrast tốt
- Border và shadow phù hợp

**Status**: ✅ Pass

---

### TC-015: Performance
**Mục đích**: Kiểm tra hiệu năng lọc  
**Test Cases**:

1. **Lọc 10 môn học**
   - Thời gian: < 100ms
   
2. **Lọc 100 môn học**
   - Thời gian: < 500ms
   
3. **Lọc 1000 môn học**
   - Thời gian: < 1s
   - Có loading indicator

**Status**: ✅ Pass

---

### TC-016: Edge Cases
**Mục đích**: Kiểm tra các trường hợp đặc biệt  
**Test Cases**:

1. **Không có kết quả**
   ```
   Input: Bộ lọc không khớp môn nào
   Expected: Hiển thị "Không tìm thấy môn học nào"
   ```

2. **Tất cả môn đều khớp**
   ```
   Input: Không chọn bộ lọc nào
   Expected: Hiển thị tất cả môn học
   ```

3. **Special characters trong code prefix**
   ```
   Input: "SUB@#$"
   Expected: Tự động loại bỏ ký tự đặc biệt hoặc không tìm thấy
   ```

4. **Môn học có nhiều khoa quản lý**
   ```
   Input: Lọc theo một khoa
   Expected: Hiển thị cả môn có nhiều khoa nếu khớp một trong số đó
   ```

**Status**: ⚠️ Cần implement validation

---

## Summary

### Passed Tests: 14/16
### Failed Tests: 0/16
### Need Review: 2/16

### Coverage:
- ✅ Basic filtering
- ✅ Combined filters
- ✅ UI/UX interactions
- ✅ Search integration
- ✅ Pagination
- ⚠️ Responsive design
- ⚠️ Edge cases validation

### Recommendations:
1. Thêm validation cho input (code prefix)
2. Test kỹ responsive trên mobile
3. Thêm loading state cho filter phức tạp
4. Implement error handling cho API failure
5. Thêm unit tests cho filter logic

---

**Test Date**: 28/01/2026  
**Tester**: Finance Feature Team  
**Environment**: Development  
**Browser**: Chrome 120+
