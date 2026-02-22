# Feedback Management Integration Guide

## How to Integrate into Your Admin Dashboard

### Step 1: Create Admin Page

Create a new page in your frontend for feedback management:

```jsx
// src/pages/admin/FeedbackManagementPage.jsx

import FeedbackTemplateList from '../../components/features/FeedbackTemplateList';

export default function FeedbackManagementPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <FeedbackTemplateList />
    </div>
  );
}
```

### Step 2: Add Route to Navigation

Update your router configuration:

```jsx
// src/App.jsx or routes configuration

import FeedbackManagementPage from './pages/admin/FeedbackManagementPage';

const routes = [
  // ... other routes
  {
    path: '/admin/feedback-management',
    element: <FeedbackManagementPage />,
    requiresAuth: true,
    roles: ['admin', 'staff', 'academicAdmin']
  }
];
```

### Step 3: Add Menu Item

Add navigation link in your sidebar/menu:

```jsx
// src/components/layout/Sidebar.jsx or Navigation.jsx

const menuItems = [
  // ... other items
  {
    label: 'Quản lý đánh giá',
    path: '/admin/feedback-management',
    icon: 'icon-feedback',
    roles: ['admin', 'staff', 'academicAdmin']
  }
];
```

## API Integration Examples

### Creating a Feedback Template Programmatically

```javascript
// src/services/feedbackTemplateService.js

import feedbackTemplateService from '../../services/feedbackTemplateService';

async function createTeacherFeedbackTemplate() {
  const template = {
    templateName: 'Đánh giá chất lượng giảng dạy - Học kỳ II 2023-2024',
    description: 'Mẫu đánh giá chất lượng giảng dạy dành cho sinh viên',
    feedbackStartDate: new Date('2024-02-01'),
    feedbackEndDate: new Date('2024-02-15'),
    status: 'draft',
    evaluationTarget: 'teacher',
    questions: [
      {
        questionText: 'Thầy/cô có truyền tải nội dung đầy đủ và rõ ràng?',
        questionType: 'rating',
        ratingScale: 5,
        isRequired: true,
        displayOrder: 1
      },
      {
        questionText: 'Thầy/cô có tổ chức lớp học một cách hiệu quả?',
        questionType: 'rating',
        ratingScale: 5,
        isRequired: true,
        displayOrder: 2
      },
      {
        questionText: 'Thầy/cô có tạo môi trường học tập tích cực?',
        questionType: 'rating',
        ratingScale: 5,
        isRequired: true,
        displayOrder: 3
      },
      {
        questionText: 'Hãy chia sẻ những ý kiến hoặc đề xuất để cải thiện chất lượng giảng dạy',
        questionType: 'text',
        isRequired: false,
        maxLength: 1000,
        displayOrder: 4
      }
    ]
  };

  try {
    const result = await feedbackTemplateService.createFeedbackTemplate(template);
    console.log('Template created:', result);
    return result;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}
```

### Adding Questions to Existing Template

```javascript
async function addQuestionsToTemplate(templateId) {
  const questions = [
    {
      questionText: 'Bạn sẽ khuyên bạn bè học môn này với thầy/cô này?',
      questionType: 'multipleChoice',
      options: [
        { label: 'Rất có khả năng', value: 'very_likely' },
        { label: 'Có khả năng', value: 'likely' },
        { label: 'Không chắc', value: 'uncertain' },
        { label: 'Không có khả năng', value: 'unlikely' },
        { label: 'Rất không có khả năng', value: 'very_unlikely' }
      ],
      isRequired: true,
      displayOrder: 5
    }
  ];

  for (const question of questions) {
    try {
      const result = await feedbackTemplateService.addQuestion(templateId, question);
      console.log('Question added:', result);
    } catch (error) {
      console.error('Error adding question:', error);
    }
  }
}
```

### Fetching and Displaying Templates

```javascript
async function loadFeedbackTemplates() {
  try {
    const result = await feedbackTemplateService.getFeedbackTemplates({
      page: 1,
      limit: 10,
      status: 'active',
      evaluationTarget: 'teacher'
    });

    console.log('Active teacher feedback templates:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error loading templates:', error);
    throw error;
  }
}
```

### Changing Template Status

```javascript
async function publishTemplate(templateId) {
  try {
    const result = await feedbackTemplateService.changeStatus(templateId, 'active');
    console.log('Template published:', result);
    alert('Mẫu đánh giá đã được công bố!');
    return result;
  } catch (error) {
    console.error('Error publishing template:', error);
    alert('Lỗi khi công bố mẫu!');
    throw error;
  }
}

async function closeTemplate(templateId) {
  try {
    const result = await feedbackTemplateService.changeStatus(templateId, 'closed');
    console.log('Template closed:', result);
    alert('Mẫu đánh giá đã được đóng!');
    return result;
  } catch (error) {
    console.error('Error closing template:', error);
    throw error;
  }
}
```

## UI Customization

### Customize Styling

The components use Tailwind CSS classes. You can customize by:

1. Modifying the component className values
2. Extending Tailwind in your tailwind.config.js:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'feedback': '#4F46E5',
      }
    }
  }
};
```

### Customize Colors

```jsx
// In FeedbackTemplateList.jsx or other components
// Change the colors in className attributes:

// Blue theme (default)
className="px-6 py-2 bg-blue-600 text-white"

// Purple theme
className="px-6 py-2 bg-purple-600 text-white"

// Green theme
className="px-6 py-2 bg-green-600 text-white"
```

## Notification Integration

### Add Success Notifications

```jsx
// Using toast/notification library if available
import { showNotification } from '../../utils/notifications';

const handleSuccess = () => {
  showNotification({
    type: 'success',
    message: 'Mẫu đánh giá đã được tạo thành công',
    duration: 3000
  });
};
```

## Validation Rules

### Template Level Validation

- Template name: Required, max 255 characters
- Description: Optional, max 1000 characters
- Start date: Required, must be before end date
- End date: Required, must be after start date
- Questions: Required, at least 1 question

### Question Level Validation

- Question text: Required, max 500 characters
- Question type: Required (rating, text, or multipleChoice)
- For rating: Scale must be 3, 4, or 5
- For text: Max length between 10 and 5000
- For multipleChoice: At least 1 option required

## Error Handling

### Global Error Handler Example

```javascript
// src/utils/errorHandler.js

export function handleFeedbackError(error) {
  const errorMessage = error.response?.data?.message || error.message;
  
  if (error.response?.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    alert('Bạn không có quyền thực hiện hành động này');
  } else if (error.response?.status === 400) {
    alert(`Lỗi: ${errorMessage}`);
  } else {
    alert('Có lỗi xảy ra, vui lòng thử lại');
  }
}

// Usage in components
catch (error) {
  handleFeedbackError(error);
}
```

## Performance Optimization

### Lazy Loading Components

```jsx
import { lazy, Suspense } from 'react';

const FeedbackTemplateList = lazy(() => import('./components/features/FeedbackTemplateList'));

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <FeedbackTemplateList />
    </Suspense>
  );
}
```

### Pagination Best Practices

The FeedbackTemplateList component handles pagination automatically, but you can customize:

```jsx
// Limit items per page
limit: 20  // Default: 10, increase for better performance with large datasets

// Implement infinite scroll (alternative to pagination)
// Use Intersection Observer API
```

## Testing

### Example Test Cases

```javascript
// __tests__/feedbackTemplate.test.js

import feedbackTemplateService from '../../services/feedbackTemplateService';

describe('FeedbackTemplateService', () => {
  test('should fetch templates with filters', async () => {
    const result = await feedbackTemplateService.getFeedbackTemplates({
      page: 1,
      limit: 10,
      status: 'active'
    });
    expect(result.data).toBeDefined();
  });

  test('should create a new template', async () => {
    const data = {
      templateName: 'Test Template',
      feedbackStartDate: new Date(),
      feedbackEndDate: new Date(),
      questions: []
    };
    const result = await feedbackTemplateService.createFeedbackTemplate(data);
    expect(result.success).toBe(true);
  });
});
```

## Troubleshooting Checklist

- [ ] Check user authentication status
- [ ] Verify user has required roles (admin/staff/academicAdmin)
- [ ] Check that feedback-templates route is registered in backend
- [ ] Verify feedbackTemplateService is properly imported
- [ ] Check browser console for any errors
- [ ] Verify API endpoint URLs match backend routes
- [ ] Check date format (should be ISO 8601)
- [ ] Ensure all required fields are provided

## Next Steps

1. **Submit Feedback Feature** - Create endpoint for students to submit feedback
2. **Feedback Analytics** - Dashboard to view feedback statistics
3. **Bulk Operations** - Export/import templates
4. **Template Library** - Reusable question templates
5. **Scheduling** - Automatic status changes based on dates
6. **Notifications** - Alert users when feedback is available/closing

## Support

For integration support or issues, please refer to:
- [Main Documentation](./FEEDBACK_MANAGEMENT_DOCUMENTATION.md)
- Backend API Documentation
- Component JSDoc comments
