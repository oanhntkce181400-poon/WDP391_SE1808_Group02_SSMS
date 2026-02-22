# Feedback Management API Quick Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Required Roles
- `admin`
- `staff`
- `academicAdmin`

## Feedback Templates

### 1. Create Feedback Template
```
POST /feedback-templates
Content-Type: application/json

{
  "templateName": "Đánh giá chất lượng giảng dạy",
  "description": "Mô tả mẫu đánh giá",
  "feedbackStartDate": "2024-02-01T00:00:00Z",
  "feedbackEndDate": "2024-02-15T23:59:59Z",
  "status": "draft",
  "evaluationTarget": "teacher",
  "subject": "60a7b8c9d1e2f3g4h5i6j7k8l",
  "classSection": "60a7b8c9d1e2f3g4h5i6j7k9m",
  "questions": [
    {
      "questionText": "Câu hỏi ví dụ",
      "questionType": "rating",
      "ratingScale": 5,
      "isRequired": true
    }
  ]
}

Response 201:
{
  "success": true,
  "message": "Feedback template created successfully",
  "data": {
    "_id": "60a7b8c9d1e2f3g4h5i6j7k0",
    "templateName": "Đánh giá chất lượng giảng dạy",
    ...
  }
}
```

### 2. List Feedback Templates
```
GET /feedback-templates?page=1&limit=10&status=active&evaluationTarget=teacher&keyword=quality

Query Parameters:
- page: integer (minimum: 1, default: 1)
- limit: integer (minimum: 1, default: 10)
- status: string (draft|active|closed|archived)
- evaluationTarget: string (teacher|course|program)
- keyword: string (search in name and description)

Response 200:
{
  "success": true,
  "data": [
    {
      "_id": "60a7b8c9d1e2f3g4h5i6j7k0",
      "templateName": "Đánh giá chất lượng giảng dạy",
      "status": "active",
      "evaluationTarget": "teacher",
      "feedbackPeriod": {
        "startDate": "2024-02-01T00:00:00.000Z",
        "endDate": "2024-02-15T23:59:59.000Z"
      },
      "questions": [...],
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

### 3. Get Feedback Template Detail
```
GET /feedback-templates/:id

[Replace :id with template ID]

Response 200:
{
  "success": true,
  "data": {
    "_id": "60a7b8c9d1e2f3g4h5i6j7k0",
    "templateName": "Đánh giá chất lượng giảng dạy",
    "description": "Mô tả chi tiết",
    "status": "active",
    "evaluationTarget": "teacher",
    "feedbackPeriod": {
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-02-15T23:59:59.000Z"
    },
    "questions": [
      {
        "_id": "60a7b8c9d1e2f3g4h5i6j7k1",
        "questionText": "Câu hỏi 1",
        "questionType": "rating",
        "ratingScale": 5,
        "isRequired": true,
        "displayOrder": 1
      }
    ],
    "subject": {
      "_id": "60a7b8c9d1e2f3g4h5i6j7k2",
      "subjectCode": "CS101",
      "subjectName": "Introduction to CS"
    },
    "createdBy": {
      "_id": "60a7b8c9d1e2f3g4h5i6j7k3",
      "email": "admin@university.edu",
      "fullName": "Admin User"
    }
  }
}
```

### 4. Update Feedback Template
```
PATCH /feedback-templates/:id
Content-Type: application/json

{
  "templateName": "Updated name",
  "description": "Updated description",
  "feedbackStartDate": "2024-02-05T00:00:00Z",
  "feedbackEndDate": "2024-02-20T23:59:59Z",
  "status": "active",
  "evaluationTarget": "teacher",
  "questions": [...]
}

Response 200:
{
  "success": true,
  "message": "Feedback template updated successfully",
  "data": { updated template object }
}
```

### 5. Delete Feedback Template
```
DELETE /feedback-templates/:id

Response 200:
{
  "success": true,
  "message": "Feedback template deleted successfully"
}

Note: Cannot delete if there are existing submissions
```

### 6. Change Template Status
```
PATCH /feedback-templates/:id/status
Content-Type: application/json

{
  "status": "active"
}

Allowed statuses: "draft" | "active" | "closed" | "archived"

Response 200:
{
  "success": true,
  "message": "Feedback template status updated successfully",
  "data": { updated template object }
}
```

### 7. Get Active Templates
```
GET /feedback-templates/active

Returns only templates with:
- status: "active"
- feedbackPeriod.startDate <= now
- feedbackPeriod.endDate >= now

Response 200:
{
  "success": true,
  "data": [active template objects]
}
```

## Question Management

### 1. Add Question to Template
```
POST /feedback-templates/:templateId/questions
Content-Type: application/json

{
  "questionText": "Nội dung câu hỏi mới",
  "questionType": "rating",
  "ratingScale": 5,
  "options": [],
  "isRequired": true,
  "maxLength": 500
}

Question Types:
- "rating": Đánh giá sao (1-5)
- "text": Ý kiến tự luận
- "multipleChoice": Chọn một lựa chọn

Response 200:
{
  "success": true,
  "message": "Question added successfully",
  "data": { updated template with new question }
}
```

### 2. Update Question in Template
```
PATCH /feedback-templates/:templateId/questions/:questionId
Content-Type: application/json

{
  "questionText": "Updated question text",
  "questionType": "text",
  "isRequired": false,
  "maxLength": 1000
}

Response 200:
{
  "success": true,
  "message": "Question updated successfully",
  "data": { updated template }
}
```

### 3. Delete Question from Template
```
DELETE /feedback-templates/:templateId/questions/:questionId

Response 200:
{
  "success": true,
  "message": "Question removed successfully",
  "data": { updated template }
}
```

## Question Type Examples

### Rating Question
```json
{
  "questionText": "Thầy/cô có truyền tải nội dung rõ ràng?",
  "questionType": "rating",
  "ratingScale": 5,
  "isRequired": true,
  "displayOrder": 1
}
```

### Text Question
```json
{
  "questionText": "Vui lòng chia sẻ nhận xét của bạn",
  "questionType": "text",
  "isRequired": false,
  "maxLength": 1000,
  "displayOrder": 2
}
```

### Multiple Choice Question
```json
{
  "questionText": "Bạn sẽ khuyên bạn bè học với giáo viên này?",
  "questionType": "multipleChoice",
  "options": [
    { "label": "Rất có khả năng", "value": "very_likely" },
    { "label": "Có khả năng", "value": "likely" },
    { "label": "Không chắc", "value": "neutral" },
    { "label": "Không có khả năng", "value": "unlikely" },
    { "label": "Rất không có khả năng", "value": "very_unlikely" }
  ],
  "isRequired": true,
  "displayOrder": 3
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Start date must be before end date"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Feedback template not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal server error |

## Useful Curl Examples

### Create Template
```bash
curl -X POST http://localhost:3000/api/feedback-templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "Test Template",
    "feedbackStartDate": "2024-02-01T00:00:00Z",
    "feedbackEndDate": "2024-02-15T23:59:59Z",
    "status": "draft",
    "evaluationTarget": "teacher",
    "questions": []
  }'
```

### List Templates
```bash
curl http://localhost:3000/api/feedback-templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Template by ID
```bash
curl http://localhost:3000/api/feedback-templates/60a7b8c9d1e2f3g4h5i6j7k0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add Question
```bash
curl -X POST http://localhost:3000/api/feedback-templates/60a7b8c9d1e2f3g4h5i6j7k0/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Sample question",
    "questionType": "rating",
    "ratingScale": 5,
    "isRequired": true
  }'
```

### Update Status
```bash
curl -X PATCH http://localhost:3000/api/feedback-templates/60a7b8c9d1e2f3g4h5i6j7k0/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

## Rate Limiting

- No specific rate limiting implemented yet
- Consider implementing for production use

## Pagination Guidelines

- Maximum limit: 100 items per page
- Default limit: 10 items per page
- First page: 1 (not 0)

## Validation Rules Quick Ref

| Field | Rules |
|-------|-------|
| templateName | Required, max 255 chars |
| description | Optional, max 1000 chars |
| feedbackStartDate | Required, ISO 8601 date |
| feedbackEndDate | Required, > startDate |
| status | draft\|active\|closed\|archived |
| evaluationTarget | teacher\|course\|program |
| questionText | Required, max 500 chars |
| questionType | rating\|text\|multipleChoice |
| ratingScale | 3, 4, or 5 |
| maxLength | 10-5000 (for text) |

## Testing the API

Use tools like:
- Postman
- Insomnia
- Thunder Client VS Code extension
- curl (command line)

Import the above examples into your API testing tool for quick reference.
