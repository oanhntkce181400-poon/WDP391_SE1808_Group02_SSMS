# Feedback Management Feature Documentation

## Overview

This feature allows Academic Admins to create and manage feedback templates for evaluating teaching quality. Students can then use these templates to provide feedback on teachers, courses, or programs.

## Features

### Backend Features

1. **Feedback Template Management**
   - Create feedback templates with multiple questions
   - Define question types: rating (1-5 stars), free-text, multiple choice
   - Set feedback period (start and end dates)
   - Change template status (draft, active, closed, archived)

2. **Question Management**
   - Add/edit/delete questions within templates
   - Reorder questions
   - Support for:
     - Rating scale questions (3, 4, or 5-star ratings)
     - Free-text questions with max length
     - Multiple choice questions

3. **Feedback Submissions**
   - Store student feedback responses
   - Track submission metadata (IP, user agent)
   - Support draft and submitted status

## Database Models

### FeedbackTemplate Model

```javascript
{
  templateName: String,              // Template name
  description: String,               // Template description
  questions: Array,                  // Array of question objects
  feedbackPeriod: {                  // Feedback period
    startDate: Date,
    endDate: Date
  },
  status: String,                    // 'draft', 'active', 'closed', 'archived'
  evaluationTarget: String,          // 'teacher', 'course', 'program'
  subject: ObjectId,                 // Reference to Subject (optional)
  classSection: ObjectId,            // Reference to ClassSection (optional)
  createdBy: ObjectId,               // Reference to User
  updatedBy: ObjectId,               // Reference to User (optional)
  timestamps: true                   // Created/Updated timestamps
}
```

### Question Structure

```javascript
{
  _id: ObjectId,
  questionText: String,              // Question content
  questionType: String,              // 'rating', 'text', 'multipleChoice'
  ratingScale: Number,               // 3, 4, or 5 (for rating type)
  options: Array,                    // For multiple choice
  isRequired: Boolean,               // Whether question is required
  maxLength: Number,                 // Max length for text questions
  displayOrder: Number               // Order to display question
}
```

### FeedbackSubmission Model

```javascript
{
  feedbackTemplate: ObjectId,        // Reference to template
  submittedBy: ObjectId,             // Reference to Student
  evaluatedEntity: ObjectId,         // What's being evaluated
  evaluationType: String,            // 'teacher', 'course', 'program'
  responses: Array,                  // Array of responses
  status: String,                    // 'submitted', 'draft'
  submissionScore: Number,           // Points awarded (if any)
  submissionIp: String,              // IP address of submitter
  submissionUserAgent: String,       // Browser user agent
  timestamps: true                   // Created/Updated timestamps
}
```

## API Endpoints

### Feedback Templates CRUD

#### Create Template
```
POST /api/feedback-templates
Authorization: Required (admin, staff, academicAdmin)

Request Body:
{
  templateName: "Đánh giá chất lượng giảng dạy",
  description: "Optional description",
  feedbackStartDate: "2024-01-15T00:00:00Z",
  feedbackEndDate: "2024-01-31T23:59:59Z",
  status: "draft",
  evaluationTarget: "teacher",
  questions: [...]
}

Response:
{
  success: true,
  message: "Feedback template created successfully",
  data: { template object }
}
```

#### Get All Templates
```
GET /api/feedback-templates
Authorization: Required (admin, staff, academicAdmin)

Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- keyword: string
- status: 'draft' | 'active' | 'closed' | 'archived'
- evaluationTarget: 'teacher' | 'course' | 'program'

Response:
{
  success: true,
  data: [template objects],
  total: number,
  page: number,
  totalPages: number
}
```

#### Get Template by ID
```
GET /api/feedback-templates/:id
Authorization: Required (admin, staff, academicAdmin)

Response:
{
  success: true,
  data: { template object }
}
```

#### Update Template
```
PATCH /api/feedback-templates/:id
Authorization: Required (admin, staff, academicAdmin)

Request Body: Same as Create

Response:
{
  success: true,
  message: "Feedback template updated successfully",
  data: { updated template object }
}
```

#### Delete Template
```
DELETE /api/feedback-templates/:id
Authorization: Required (admin, staff, academicAdmin)

Response:
{
  success: true,
  message: "Feedback template deleted successfully"
}
```

### Question Management

#### Add Question
```
POST /api/feedback-templates/:id/questions
Authorization: Required (admin, staff, academicAdmin)

Request Body:
{
  questionText: "Question content",
  questionType: "rating",
  ratingScale: 5,
  options: [],
  isRequired: true,
  maxLength: 500
}

Response:
{
  success: true,
  message: "Question added successfully",
  data: { updated template object }
}
```

#### Update Question
```
PATCH /api/feedback-templates/:templateId/questions/:questionId
Authorization: Required (admin, staff, academicAdmin)

Request Body: Same as Add Question

Response:
{
  success: true,
  message: "Question updated successfully",
  data: { updated template object }
}
```

#### Delete Question
```
DELETE /api/feedback-templates/:templateId/questions/:questionId
Authorization: Required (admin, staff, academicAdmin)

Response:
{
  success: true,
  message: "Question removed successfully",
  data: { updated template object }
}
```

### Status Management

#### Change Template Status
```
PATCH /api/feedback-templates/:id/status
Authorization: Required (admin, staff, academicAdmin)

Request Body:
{
  status: "active" | "closed" | "archived" | "draft"
}

Response:
{
  success: true,
  message: "Feedback template status updated successfully",
  data: { updated template object }
}
```

#### Get Active Templates
```
GET /api/feedback-templates/active
Authorization: Required

Response:
{
  success: true,
  data: [active template objects]
}
```

## Frontend Components

### 1. FeedbackTemplateList Component
- Main component for managing feedback templates
- Features:
  - Display list of templates with pagination
  - Filter by status, evaluation target, and search keyword
  - Create, edit, delete operations
  - View template details
  - Change template status

**Usage:**
```jsx
import FeedbackTemplateList from './components/features/FeedbackTemplateList';

function AdminPage() {
  return <FeedbackTemplateList />;
}
```

### 2. FeedbackTemplateFormBuilder Component
- Modal form for creating/editing feedback templates
- Features:
  - Template basic information form
  - Feedback period date picker
  - Question management (add/edit/delete/reorder)
  - Real-time validation
  - Integrated question editor

**Usage:**
```jsx
import FeedbackTemplateFormBuilder from './components/features/FeedbackTemplateFormBuilder';

function Page() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>Create Template</button>
      <FeedbackTemplateFormBuilder
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { /* refresh list */ }}
      />
    </>
  );
}
```

### 3. FeedbackQuestionEditor Component
- Modal for editing individual questions
- Features:
  - Question text input
  - Question type selection (rating/text/multipleChoice)
  - Dynamic field rendering based on type
  - Option management for multiple choice
  - Required field checkbox

**Usage:**
```jsx
import FeedbackQuestionEditor from './components/features/FeedbackQuestionEditor';

function Page() {
  const [showEditor, setShowEditor] = useState(false);
  
  return (
    <FeedbackQuestionEditor
      isOpen={showEditor}
      onClose={() => setShowEditor(false)}
      onSave={(question) => { /* handle save */ }}
    />
  );
}
```

## Frontend Service

### feedbackTemplateService

```javascript
import feedbackTemplateService from './services/feedbackTemplateService';

// Get all templates
feedbackTemplateService.getFeedbackTemplates(params)

// Get single template
feedbackTemplateService.getFeedbackTemplate(id)

// Get active templates
feedbackTemplateService.getActiveFeedbackTemplates()

// Create template
feedbackTemplateService.createFeedbackTemplate(data)

// Update template
feedbackTemplateService.updateFeedbackTemplate(id, data)

// Delete template
feedbackTemplateService.deleteFeedbackTemplate(id)

// Manage questions
feedbackTemplateService.addQuestion(templateId, questionData)
feedbackTemplateService.updateQuestion(templateId, questionId, questionData)
feedbackTemplateService.removeQuestion(templateId, questionId)

// Change status
feedbackTemplateService.changeStatus(id, status)
```

## Usage Examples

### Create a Feedback Template

```javascript
const data = {
  templateName: "Course Quality Evaluation",
  description: "Evaluate teaching quality",
  feedbackStartDate: "2024-02-01",
  feedbackEndDate: "2024-02-15",
  status: "draft",
  evaluationTarget: "teacher",
  questions: [
    {
      questionText: "Was the content clear?",
      questionType: "rating",
      ratingScale: 5,
      isRequired: true,
      displayOrder: 1
    },
    {
      questionText: "Please provide additional feedback",
      questionType: "text",
      isRequired: false,
      maxLength: 500,
      displayOrder: 2
    }
  ]
};

await feedbackTemplateService.createFeedbackTemplate(data);
```

### Integration with Pages

To integrate into an admin dashboard page:

```jsx
import { useState } from 'react';
import FeedbackTemplateList from './components/features/FeedbackTemplateList';

export default function FeedbackManagementPage() {
  return (
    <div className="p-6">
      <FeedbackTemplateList />
    </div>
  );
}
```

## File Structure

```
backend-api/
├── src/
│   ├── models/
│   │   ├── feedbackTemplate.model.js
│   │   └── feedbackSubmission.model.js
│   ├── controllers/
│   │   └── feedbackTemplate.controller.js
│   ├── services/
│   │   └── feedbackTemplate.service.js
│   ├── routes/
│   │   └── feedbackTemplate.routes.js
│   └── index.js (updated)

frontend-web/
├── src/
│   ├── components/
│   │   └── features/
│   │       ├── FeedbackTemplateList.jsx
│   │       ├── FeedbackTemplateFormBuilder.jsx
│   │       └── FeedbackQuestionEditor.jsx
│   └── services/
│       └── feedbackTemplateService.js
```

## Status Workflow

1. **Draft** - Template under preparation, not accessible to students
2. **Active** - Template is open and accepting feedback (must be within feedbackPeriod)
3. **Closed** - Feedback period ended, no longer accepting responses
4. **Archived** - Template archived for records

## Security Considerations

1. All endpoints require authentication
2. Only admin/staff/academicAdmin can manage templates
3. Submission IPs and user agents are tracked
4. Unique constraint on (feedbackTemplate, submittedBy) to prevent duplicate submissions

## Future Enhancements

1. Export feedback statistics/reports
2. Bulk template management
3. Question templates library for reuse
4. Anonymous feedback option
5. Feedback analytics dashboard
6. Email notifications
7. Template versioning
8. Conditional question logic

## Troubleshooting

### Common Issues

1. **Templates not appearing in list**
   - Check user roles (must be admin/staff/academicAdmin)
   - Verify status filter is correct
   - Check date range filters

2. **Cannot add questions**
   - Verify form validation passes
   - Check question type specific fields are filled
   - Ensure template exists

3. **API errors**
   - Check request format matches schema
   - Verify date formats are ISO 8601
   - Ensure all required fields are provided

## Support

For issues or questions, please contact the development team or refer to the main project documentation.
