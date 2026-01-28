# Changelog - Finance Feature

All notable changes to the Finance Feature will be documented in this file.

## [Unreleased]

### Added (28/01/2026)
- ✨ **Chức năng Lọc Môn học (Subject Filter)**
  - Modal lọc với UI/UX hiện đại
  - Lọc theo số tín chỉ (1-6 tín chỉ)
  - Lọc theo mã môn học (code prefix)
  - Lọc theo khoa quản lý (9 khoa/ngành)
  - Lọc theo loại môn học (môn chung/chuyên ngành)
  - Kết hợp nhiều bộ lọc cùng lúc
  - Badge hiển thị bộ lọc đang áp dụng
  - Preview bộ lọc trước khi áp dụng
  - Nút "Đặt lại" để xóa bộ lọc
  - Toast notifications khi áp dụng/xóa bộ lọc
  - Tích hợp với search và pagination
  - Hỗ trợ dark mode
  - Responsive design

- 📝 **Documentation**
  - FILTER_FEATURE.md - Hướng dẫn sử dụng chi tiết
  - FILTER_TEST_CASES.md - Test cases và validation
  - CHANGELOG.md - Ghi nhận thay đổi

### Files Created
```
frontend-web/
  ├── src/
  │   └── components/
  │       └── features/
  │           └── SubjectFilterModal.jsx (NEW)
  └── docs/
      ├── FILTER_FEATURE.md (NEW)
      ├── FILTER_TEST_CASES.md (NEW)
      └── CHANGELOG.md (NEW)
```

### Files Modified
```
frontend-web/
  └── src/
      └── pages/
          └── admin/
              └── SubjectManagement.jsx (UPDATED)
                  - Added filter state management
                  - Added filter modal integration
                  - Added filter logic (applyFilters)
                  - Added active filters badge
                  - Updated fetchSubjects to support filters
                  - Added handleFilterApply, handleFilterOpen
```

### Technical Details

#### New State Variables
```javascript
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
const [activeFilters, setActiveFilters] = useState({});
const [searchKeyword, setSearchKeyword] = useState('');
```

#### Filter Logic
```javascript
// Client-side filtering
const applyFilters = (data, filters) => {
  // Supports: credits, codePrefix, department, isCommon
};
```

#### API Integration
```javascript
// Backend API call with filter params
GET /api/subjects?page=1&limit=10&credits=3&department=SE&isCommon=false
```

### Performance
- Client-side filtering for fast response
- Optimized re-rendering with useCallback
- Efficient state management
- Lazy loading for modal

### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Dependencies
No new dependencies required. Uses existing:
- React 18+
- Tailwind CSS
- Existing icons/assets

---

## Future Enhancements

### Planned Features
- [ ] **Advanced Filters**
  - Filter by prerequisites
  - Filter by semester availability
  - Filter by instructor
  - Filter by academic year
  - Custom date range filters

- [ ] **UI Improvements**
  - Multi-select departments
  - Range slider for credits
  - Filter presets/favorites
  - Quick filter buttons
  - Filter history

- [ ] **Data Export**
  - Export filtered results to Excel
  - Export to PDF
  - Export to CSV
  - Share filtered view URL

- [ ] **Performance**
  - Server-side filtering for large datasets
  - Debounced input for code prefix
  - Virtualized list for many results
  - Cache filter results

- [ ] **Analytics**
  - Track popular filters
  - Filter usage statistics
  - Performance metrics
  - User behavior analysis

### Known Issues
- ⚠️ Mobile responsive needs more testing
- ⚠️ Special characters in code prefix need validation
- ⚠️ Large datasets (>1000 items) may slow down

### Breaking Changes
None - This is a new feature

---

## Version History

### v1.0.0 (28/01/2026)
- Initial release of Subject Filter feature
- Complete filter modal with 4 filter types
- Full documentation and test cases
- Dark mode support
- Responsive design

---

**Maintainer**: Finance Feature Team  
**Last Updated**: 28/01/2026  
**Status**: ✅ Ready for Testing
