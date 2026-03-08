# USE CASE SPECIFICATION DOCUMENT

**Project:** WDP391_SE1808_Group02_SSMS - Student School Management System  
**Document Version:** 1.0  
**Date Created:** 24/Feb/2026  
**Created By:** AI Assistant

---

## TABLE OF CONTENTS

### Manage Student
1. [UC01 - View Student List](#uc01---view-student-list)
2. [UC02 - Search/Filter Student](#uc02---searchfilter-student)
3. [UC03 - Create Student](#uc03---create-student)
4. [UC04 - Update/Delete Student](#uc04---updatedelete-student)

### Registration Period Management
5. [UC05 - View Registration Period List](#uc05---view-registration-period-list)
6. [UC06 - Create Registration Period](#uc06---create-registration-period)
7. [UC07 - Configure Registration Period](#uc07---configure-registration-period)

---

<div style="page-break-after: always;"></div>

## UC01 - View Student List

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC01_View_Student_List |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin, Staff |
| **Secondary Actors** | System, Database |
| **Trigger** | Admin/Staff opens "Student Management" page and views student list. |
| **Description** | Allows Admin/Staff to view the list of all students in the system with filtering, searching, and pagination capabilities. The system retrieves student data from database and displays it in a structured table format. |

### Preconditions:
1. Admin/Staff is authenticated and logged into the system.
2. Admin/Staff has permission to view student list.
3. Database connection is available.

### Postconditions:
1. Student list is displayed with relevant information.
2. System logs the view action for audit purposes.

### Normal Flow:
1. Admin/Staff navigates to Student Management page.
2. System retrieves all student records from database.
3. System displays student list in table format with columns:
   - Student Code
   - Full Name
   - Email
   - Major Code
   - Cohort
   - Academic Status
   - Actions (Edit/Delete buttons)
4. System shows pagination controls (if records > page size).
5. Admin/Staff can:
   - Search by student code, name, or email
   - Filter by major, cohort, or academic status
   - Sort by any column
   - Navigate through pages
6. System updates display based on search/filter/sort criteria.
7. Use case ends.

### Alternative Flows:
- **1a** - No students found:
  - System displays "No students found" message.
  - Admin/Staff can click "Add Student" button to create new student.
- **6a** - Filter/Search returns no results:
  - System displays "No results match your criteria" message.
  - Admin/Staff can clear filters to see all students.

### Exceptions:
- **Exception at Step 2** - Database connection error:
  - System returns 500 with error message.
  - System logs error to ErrorLog collection.
  - Error message displayed: "Unable to retrieve student data. Please try again."
- **Exception at Step 2** - Query timeout:
  - System returns 408 with timeout message.
  - System suggests reducing filter criteria.
- **Exception at Step 6** - Invalid filter parameters:
  - System returns 400 with validation error.
  - System highlights invalid filter fields.

### Priority:
**High**

### Frequency of Use:
**High** - Multiple times per day by Admin/Staff

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR01 | Pagination | Display maximum 20 students per page to optimize performance. |
| BR02 | Access Control | Only Admin and Staff roles can view student list. Student role cannot access. |
| BR03 | Data Privacy | Sensitive fields (identityNumber) are masked/hidden in list view. |
| BR04 | Soft Delete | Deleted students (isActive=false) are not shown by default unless "Show Inactive" filter is enabled. |
| BR05 | Real-time Data | Student list must reflect latest data including recently added/updated students. |

---

<div style="page-break-after: always;"></div>

## UC02 - Search/Filter Student

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC02_Search_Filter_Student |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin, Staff |
| **Secondary Actors** | System, Database |
| **Trigger** | Admin/Staff enters search criteria or applies filters on Student Management page. |
| **Description** | Allows Admin/Staff to search and filter the student list using various criteria such as student code, name, email, major, cohort, and academic status. The system processes the search/filter request, queries the database with appropriate conditions, and returns matching results with pagination. |

### Preconditions:
1. Admin/Staff is authenticated and logged into the system.
2. Admin/Staff has permission to view student list.
3. Admin/Staff is on the Student Management page.
4. Database connection is available.

### Postconditions:
1. Filtered student list is displayed based on search criteria.
2. Search/filter parameters are preserved in the UI.
3. Result count is displayed to the user.
4. Search action is logged for analytics purposes.

### Normal Flow:
1. Admin/Staff is viewing the Student Management page with full student list.
2. System displays search bar and filter options:
   - **Search Bar**: Free text search across student code, name, email
   - **Filter Panel**:
     - Major (dropdown, multi-select)
     - Cohort (dropdown, multi-select)
     - Academic Status (dropdown, multi-select)
     - Gender (dropdown)
     - Active Status (checkbox: Active/Inactive)
     - Date Range (enrollment year range)
3. Admin/Staff enters search keyword in search bar (e.g., "Nguyen Van").
4. System performs real-time search as user types (debounced 500ms).
5. System queries database with search criteria:
   - Uses regex search on: studentCode, fullName, email
   - Case-insensitive search
   - Matches partial strings
6. System returns matching students and displays count (e.g., "Found 15 students").
7. Admin/Staff applies additional filters:
   - Selects Major: "SE" (Software Engineering)
   - Selects Cohort: "18, 19"
   - Selects Academic Status: "enrolled"
8. System combines search and filter criteria with AND logic.
9. System queries database with combined criteria.
10. System displays filtered results in table format with pagination.
11. System shows active filters as chips/tags above the table.
12. Admin/Staff can:
    - Remove individual filter chips to refine search
    - Click "Clear All Filters" to reset to full list
    - Export filtered results to Excel
    - Refine search by adding more filters
13. Use case ends.

### Alternative Flows:
- **4a** - Real-time search disabled:
  - Admin/Staff must press Enter or click "Search" button.
  - System performs search only on button click.
- **6a** - No results found:
  - System displays "No students match your search criteria".
  - System suggests:
    - "Try different keywords"
    - "Clear some filters"
    - "Check spelling"
  - System shows "Clear All" button to reset search.
- **7a** - Apply single filter without search:
  - Admin/Staff uses only filters without entering search keyword.
  - System queries database with filter criteria only.
  - All students matching filter are displayed.
- **10a** - Large result set:
  - If results > 1000 records, system shows warning.
  - Warning: "Too many results ({count}). Consider refining your search."
  - System displays first 20 records with pagination.
- **12a** - Export filtered results:
  - Admin/Staff clicks "Export to Excel" button.
  - System generates Excel file with filtered student list.
  - File includes all columns visible in the table.
  - File downloaded with name: `Students_{date}_{time}.xlsx`.
- **3a** - Advanced search mode:
  - Admin/Staff clicks "Advanced Search" toggle.
  - System displays additional search fields:
    - Student Code (exact match)
    - Email (exact match)
    - Identity Number (exact/partial)
    - Phone Number (partial)
    - Address (contains)
  - Admin/Staff can combine multiple field searches with AND logic.

### Exceptions:
- **Exception at Step 5** - Database query timeout:
  - System returns 408 with timeout message.
  - Message: "Search query is taking too long. Please refine your criteria."
  - System suggests using more specific filters.
- **Exception at Step 5** - Invalid search query:
  - System returns 400 with validation error.
  - Message: "Invalid search characters detected."
  - System removes special characters and retries.
- **Exception at Step 9** - Database connection error:
  - System returns 500 with error message.
  - System logs error to ErrorLog collection.
  - Message: "Unable to perform search. Please try again."
  - System retains search criteria so user can retry.
- **Exception at Step 5** - Search string too short:
  - If search keyword < 2 characters, system shows hint.
  - Hint: "Please enter at least 2 characters to search."
  - No query is sent to database (client-side validation).
- **Exception at Step 12** - Export fails:
  - System returns 500 with error message.
  - Message: "Failed to export data. Please try again."
  - Error logged to ErrorLog collection.
- **Exception at Step 9** - Invalid filter combination:
  - System returns 400 with validation error.
  - Message: "Invalid filter combination detected."
  - System resets to last valid filter state.

### Priority:
**High**

### Frequency of Use:
**Very High** - Used constantly throughout the day by Admin/Staff to find specific students

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR01 | Search Scope | Free text search searches across studentCode, fullName, and email fields simultaneously. |
| BR02 | Case-Insensitive Search | All text searches are case-insensitive for better user experience. |
| BR03 | Partial Match | Search supports partial string matching (e.g., "Nguyen" matches "Nguyen Van A" and "Tran Nguyen B"). |
| BR04 | AND Logic | Multiple filters are combined with AND logic (all conditions must be satisfied). |
| BR05 | Filter Persistence | Applied filters persist in UI until explicitly cleared by user or session ends. |
| BR06 | Debounced Search | Real-time search is debounced by 500ms to prevent excessive database queries while user is typing. |
| BR07 | Result Limit | Search results are paginated with maximum 20 records per page to optimize performance. |
| BR08 | Active by Default | By default, only active students (isActive=true) are shown. User must explicitly filter to show inactive students. |
| BR09 | Export Limit | Export to Excel is limited to maximum 5,000 records. If filtered results > 5000, user must refine search further. |
| BR10 | Search Optimization | Database queries use indexed fields (studentCode, fullName, majorCode, cohort) for optimal performance. |
| BR11 | Filter Validation | All filter values are validated against allowed values before query execution. |
| BR12 | Empty Search | Empty search (no keyword, no filters) returns full active student list with pagination. |
| BR13 | Search Analytics | All searches are logged (anonymously) for system analytics and performance monitoring. |
| BR14 | Multi-Select Filters | Major, Cohort, and Academic Status filters support multi-select with OR logic within same filter type. |
| BR15 | Special Characters | Search automatically escapes special regex characters to prevent regex injection attacks. |

---

<div style="page-break-after: always;"></div>

## UC03 - Create Student

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC03_Create_Student |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin, Staff |
| **Secondary Actors** | System, Database, User Service, Wallet Service |
| **Trigger** | Admin/Staff clicks "Add Student" button on Student Management page. |
| **Description** | Allows Admin/Staff to create a new student record by filling a form and submitting it. The system validates the input, creates both Student record and linked User account, initializes Wallet, and returns the newly created student. |

### Preconditions:
1. Admin/Staff is authenticated and logged into the system.
2. Admin/Staff has permission to create students.
3. Major codes are available in the system.

### Postconditions:
1. New Student record is created in database.
2. New User account is created with default password.
3. Wallet is initialized for the student with 0 balance.
4. System sends email notification to student with login credentials (optional).
5. Success message is displayed to Admin/Staff.
6. Student appears in the student list.

### Normal Flow:
1. Admin/Staff clicks "Add Student" button.
2. System displays Create Student form with fields:
   - Student Code (auto-generated or manual)
   - Full Name (required)
   - Email (required, unique)
   - Major Code (dropdown, required)
   - Cohort (number, required)
   - Identity Number (CCCD/CMND, optional)
   - Date of Birth (optional)
   - Phone Number (optional)
   - Address (optional)
   - Gender (dropdown: male/female/other)
   - Class Section (optional)
3. Admin/Staff fills in the required information.
4. Admin/Staff clicks "Create" button.
5. System validates all input fields:
   - Required fields are not empty
   - Email format is valid and unique
   - Student code is unique
   - Identity number is unique (if provided)
   - Cohort is valid number (e.g., 18, 19, 20)
   - Major code exists in Major collection
6. System creates User account:
   - Email from student email
   - Default password: identityNumber or "123456"
   - Role: "student"
   - mustChangePassword: true
   - Status: "active"
7. System creates Student record with provided data and links to User._id.
8. System creates Wallet for the student with balance = 0.
9. System returns success response with student data.
10. FE displays success message: "Student created successfully".
11. FE redirects to Student List page or Student Detail page.
12. Use case ends.

### Alternative Flows:
- **3a** - Auto-generate student code:
  - System generates student code based on pattern: {MajorCode}{Cohort}{Sequential3Digits}
  - Example: SE18001, AI19002, GD20015
- **5a** - Email already exists:
  - System returns 400 error: "Email already exists in the system"
  - Admin/Staff must use different email
- **5b** - Student code already exists:
  - System returns 400 error: "Student code already exists"
  - Admin/Staff must use different student code or let system auto-generate

### Exceptions:
- **Exception at Step 5** - Validation error:
  - System returns 400 with detailed validation errors.
  - System highlights invalid fields in the form.
  - Admin/Staff corrects errors and resubmits.
- **Exception at Step 6** - User creation failed:
  - System returns 500 with error message.
  - Transaction is rolled back (no Student or Wallet created).
  - Error logged to ErrorLog collection.
- **Exception at Step 7** - Database error:
  - System returns 500 with error message: "Failed to create student record"
  - Transaction is rolled back.
  - Error logged with full stack trace.
- **Exception at Step 8** - Wallet creation failed:
  - System logs warning but continues (wallet can be created later).
  - Student and User are still created successfully.
- **Exception at Step 6-8** - Network timeout:
  - System returns 408 timeout error.
  - Admin/Staff can retry the operation.

### Priority:
**High**

### Frequency of Use:
**Medium** - Several times per week during enrollment periods

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR01 | Unique Student Code | Student code must be unique across the entire system. Format: {MajorCode}{Cohort}{3-digit-sequential}. |
| BR02 | Email Validation | Email must be valid format and unique. Cannot reuse email from deleted students. |
| BR03 | Default Password | Default password is Student's Identity Number (if provided) or "123456". Student must change on first login. |
| BR04 | User Account Linking | Each Student must have a linked User account for authentication. One-to-one relationship. |
| BR05 | Major Code Validation | Major code must exist in Major collection and be active (isActive=true). |
| BR06 | Cohort Range | Cohort must be valid number between current year - 10 and current year + 5. |
| BR07 | Identity Number | Identity Number (CCCD/CMND) must be unique if provided. Can be null. |
| BR08 | Auto Wallet Creation | System automatically creates a Wallet with 0 balance when student is created. |
| BR09 | Audit Trail | System records createdBy (Admin/Staff user ID) and createdAt timestamp. |
| BR10 | Academic Status | New students have default academic status = "enrolled". |

---

<div style="page-break-after: always;"></div>

## UC04 - Update/Delete Student

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC04_Update_Delete_Student |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin, Staff |
| **Secondary Actors** | System, Database, ClassEnrollment Service |
| **Trigger** | Admin/Staff clicks "Edit" or "Delete" button on a student record in the student list. |
| **Description** | Allows Admin/Staff to update existing student information or delete (soft delete) a student record. For updates, the system validates changes and maintains audit trail. For deletion, the system validates no active enrollments exist before soft deleting the record. |

### Preconditions:
1. Admin/Staff is authenticated and logged into the system.
2. Admin/Staff has permission to update/delete students.
3. Target student exists in the database.
4. Student is active (isActive=true).

### Postconditions:

**For Update:**
1. Student record is updated with new values.
2. updatedBy and updatedAt fields are updated with current user and timestamp.
3. Success message is displayed to Admin/Staff.
4. Updated student data is reflected in the student list.

**For Delete:**
1. Student record is soft deleted (isActive=false).
2. Student no longer appears in default student list view.
3. Associated User account status is set to 'inactive'.
4. Success message is displayed to Admin/Staff.
5. Deletion action is logged for audit purposes.

### Normal Flow:

#### **Flow A: Update Student**
1. Admin/Staff clicks "Edit" button next to a student in the list.
2. System retrieves current student data by student ID.
3. System displays Update Student form pre-filled with current data:
   - Student Code (read-only, cannot change)
   - Full Name (editable)
   - Email (editable, must remain unique)
   - Major Code (dropdown, editable)
   - Cohort (editable)
   - Identity Number (editable)
   - Date of Birth (editable)
   - Phone Number (editable)
   - Address (editable)
   - Gender (dropdown, editable)
   - Class Section (editable)
   - Academic Status (dropdown: enrolled/on-leave/dropped/graduated)
   - Enrollment Year (editable)
4. Admin/Staff modifies the desired fields.
5. Admin/Staff clicks "Update" button.
6. System validates modified fields:
   - Required fields are not empty
   - Email format is valid and unique (if changed)
   - Identity number is unique (if changed)
   - Major code exists and is active
   - Cohort is valid number
7. System updates Student record with new values.
8. System sets updatedBy = current Admin/Staff user ID.
9. System sets updatedAt = current timestamp.
10. System returns success response with updated student data.
11. FE displays success message: "Student updated successfully".
12. FE updates the student list to reflect changes.
13. Use case ends.

#### **Flow B: Delete Student**
1. Admin/Staff clicks "Delete" button next to a student in the list.
2. System displays confirmation dialog:
   - Message: "Are you sure you want to delete student {studentCode} - {fullName}?"
   - Buttons: "Cancel" and "Confirm Delete"
3. Admin/Staff clicks "Confirm Delete".
4. System validates deletion eligibility:
   - Checks if student has any active class enrollments (status='enrolled').
   - Checks if student has any pending requests or payments.
5. If no active enrollments found:
   - System sets Student.isActive = false
   - System sets User.status = 'inactive' (for linked user account)
   - System does NOT physically delete the record (soft delete)
6. System logs deletion action with timestamp and admin/staff ID.
7. System returns success response.
8. FE displays success message: "Student deleted successfully".
9. FE removes student from the displayed list.
10. Use case ends.

### Alternative Flows:

**For Update:**
- **A4a** - No changes made:
  - Admin/Staff clicks "Update" without modifying any fields.
  - System detects no changes and returns success without database update.
  - Message: "No changes detected".
- **A6a** - Email changed to existing email:
  - System returns 400 error: "Email already exists".
  - Admin/Staff must use different email or keep original.
- **A6b** - Identity number changed to existing number:
  - System returns 400 error: "Identity number already exists".
  - Admin/Staff must use different identity number or keep original.

**For Delete:**
- **B3a** - Admin/Staff cancels deletion:
  - Admin/Staff clicks "Cancel" button.
  - Dialog closes without any changes.
  - Use case ends.
- **B4a** - Student has no linked User account:
  - System skips User status update (step 5).
  - Only Student.isActive is set to false.
  - Deletion continues successfully.
- **B4b** - Force delete option (Admin only):
  - Admin can check "Force delete even with active enrollments" option.
  - System displays additional warning.
  - If confirmed, system proceeds with deletion regardless of enrollments.
  - System logs this as "Force Delete" in audit log.

### Exceptions:

**For Update:**
- **Exception at Step A2** - Student not found:
  - System returns 404 error: "Student not found".
  - FE redirects back to student list.
- **Exception at Step A6** - Validation error:
  - System returns 400 with detailed validation errors.
  - System highlights invalid fields.
  - Admin/Staff corrects errors and resubmits.
- **Exception at Step A7** - Database error:
  - System returns 500 with error message.
  - Changes are not saved.
  - Error logged to ErrorLog collection.
- **Exception at Step A7** - Concurrent update conflict:
  - System detects that record was modified by another user.
  - System returns 409 conflict error.
  - Admin/Staff must refresh and try again.
- **Exception at Step A2-A10** - Network timeout:
  - System returns 408 timeout error.
  - Admin/Staff can retry the operation.

**For Delete:**
- **Exception at Step B4** - Student has active enrollments:
  - System returns 400 error with message: "Cannot delete student with active class enrollments. Total active enrollments: {count}".
  - System lists the enrolled classes.
  - Options provided:
    - "View Enrollments" - Navigate to student's enrollment list
    - "Cancel" - Cancel deletion
  - Admin/Staff must drop student from all classes first, then retry deletion.
- **Exception at Step B4** - Student has pending exams:
  - System returns 400 error: "Cannot delete student with pending exam registrations".
  - Admin/Staff must cancel exam registrations first.
- **Exception at Step B5** - Database error:
  - System returns 500 with error message.
  - No changes are made (transaction rolled back).
  - Error logged to ErrorLog collection.
- **Exception at Step B1** - Student not found:
  - System returns 404 error: "Student not found".
  - FE displays error message and refreshes list.
- **Exception at Step B5** - Concurrent deletion:
  - System detects student was already deleted by another user.
  - System returns 409 conflict error.
  - FE displays: "Student was already deleted" and refreshes list.

### Priority:
**High**

### Frequency of Use:
**High** - Multiple times per day for updates, occasional for deletions

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| **UPDATE RULES** | | |
| BR01 | Immutable Student Code | Student code cannot be changed once created. It is the permanent identifier. |
| BR02 | Email Uniqueness | If email is changed, new email must not exist in any other Student or User record. |
| BR03 | Identity Number Uniqueness | If identity number is changed, new identity number must be unique across all students. |
| BR04 | Major Code Validation | If major code is changed, new major must exist and be active. |
| BR05 | Academic Status Transition | Academic status can transition: enrolled → on-leave/dropped/graduated, but not backward (e.g., graduated cannot become enrolled). |
| BR06 | Audit Trail | System must record who updated (updatedBy) and when (updatedAt) for every update. |
| BR07 | User Account Sync | If email is changed, linked User account email should also be updated (optional feature). |
| BR08 | Active Students Only | Only active students (isActive=true) can be updated. Deleted students must be restored first. |
| BR09 | Required Fields | Full Name, Email, Major Code, and Cohort remain required and cannot be cleared. |
| BR10 | Data Validation | All field-level validations (email format, number ranges, etc.) must pass before update. |
| **DELETE RULES** | | |
| BR11 | Soft Delete Only | Students are never physically deleted from database. isActive is set to false for data integrity and audit trail. |
| BR12 | No Active Enrollments | Cannot delete student with active class enrollments (status='enrolled'). Must drop from all classes first. |
| BR13 | User Account Deactivation | When student is deleted, linked User account status is set to 'inactive' to prevent login. |
| BR14 | Delete Audit Trail | All deletions are logged with timestamp, admin/staff ID, and reason (if provided). |
| BR15 | Restore Capability | Deleted students (isActive=false) can be restored by Admin by setting isActive back to true. |
| BR16 | Data Retention | Deleted student records are retained permanently for compliance and historical records. |
| BR17 | Cascade Rules | Deleting a student does NOT delete: ClassEnrollment records (kept for history), Exam registrations (kept for history), Payment records (kept for accounting). |
| BR18 | Force Delete | Admin can force delete with active enrollments, but this requires additional confirmation and is logged separately. |
| BR19 | Permission Level | Staff can delete students without enrollments. Only Admin can force delete students with enrollments. |
| BR20 | Deletion Confirmation | System must always show confirmation dialog before deletion to prevent accidental deletions. |

---

<div style="page-break-after: always;"></div>

## UC05 - View Registration Period List

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC05_View_Registration_Period_List |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin, Staff |
| **Secondary Actors** | System, Database |
| **Trigger** | Admin/Staff navigates to "Registration Period Management" page. |
| **Description** | Allows Admin/Staff to view the list of all registration periods in the system with their status, dates, and configurations. The system retrieves registration period data from database and displays it in a structured table format with filtering and sorting capabilities. |

### Preconditions:
1. Admin/Staff is authenticated and logged into the system.
2. Admin/Staff has permission to view registration periods.
3. Database connection is available.

### Postconditions:
1. Registration period list is displayed with relevant information.
2. System logs the view action for audit purposes.

### Normal Flow:
1. Admin/Staff navigates to Registration Period Management page.
2. System retrieves all registration period records from database.
3. System displays registration period list in table format with columns:
   - Period Name
   - Start Date
   - End Date
   - Status (upcoming/active/closed/cancelled)
   - Allowed Cohorts
   - Description
   - Created By
   - Actions (View Details/Edit/Delete buttons)
4. System highlights current active periods (status='active').
5. System updates period status automatically based on current date:
   - If current date < startDate → status = 'upcoming'
   - If startDate ≤ current date ≤ endDate → status = 'active'
   - If current date > endDate → status = 'closed'
6. Admin/Staff can:
   - Filter by status (upcoming/active/closed/cancelled)
   - Search by period name
   - Sort by start date, end date, or created date
   - View details of each period
7. System updates display based on filter/sort criteria.
8. Use case ends.

### Alternative Flows:
- **2a** - No registration periods found:
  - System displays "No registration periods found" message.
  - Admin/Staff can click "Create Registration Period" button to add new period.
- **7a** - Filter/Search returns no results:
  - System displays "No results match your criteria" message.
  - Admin/Staff can clear filters to see all periods.
- **5a** - Auto-status update disabled:
  - System displays periods with their stored status.
  - Admin/Staff can manually update status via Edit function.

### Exceptions:
- **Exception at Step 2** - Database connection error:
  - System returns 500 with error message.
  - System logs error to ErrorLog collection.
  - Error message displayed: "Unable to retrieve registration period data. Please try again."
- **Exception at Step 2** - Query timeout:
  - System returns 408 with timeout message.
  - System suggests refreshing the page.
- **Exception at Step 7** - Invalid filter parameters:
  - System returns 400 with validation error.
  - System resets to default view (all periods).

### Priority:
**High**

### Frequency of Use:
**Medium** - Checked regularly during registration seasons

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR01 | Status Auto-Update | System automatically updates status based on current date and time ranges. |
| BR02 | Active Period Highlight | Active registration periods are highlighted in the UI (e.g., green background). |
| BR03 | Access Control | Only Admin and Staff can view registration period list. Students cannot access. |
| BR04 | Sort Default | Default sort is by start date descending (newest first). |
| BR05 | Cancelled Periods | Cancelled periods are shown but visually distinguished (e.g., strikethrough or gray color). |
| BR06 | Pagination | If more than 20 periods, use pagination to optimize performance. |
| BR07 | Real-time Status | Status display must reflect real-time date/time calculations. |
| BR08 | Creator Information | Created By field shows the Admin/Staff who created the period. |

---

<div style="page-break-after: always;"></div>

## UC06 - Create Registration Period

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC06_Create_Registration_Period |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin |
| **Secondary Actors** | System, Database |
| **Trigger** | Admin clicks "Create Registration Period" button on Registration Period Management page. |
| **Description** | Allows Admin to create a new registration period by specifying the period name, start/end dates, allowed cohorts, and description. The system validates the input, ensures no overlapping periods for same cohorts, creates the RegistrationPeriod record, and returns the newly created period. |

### Preconditions:
1. Admin is authenticated and logged into the system.
2. Admin has permission to create registration periods.
3. System has valid cohort data available.

### Postconditions:
1. New RegistrationPeriod record is created in database.
2. Period status is set based on current date vs. start/end dates.
3. Success message is displayed to Admin.
4. New period appears in the registration period list.
5. Creation action is logged for audit purposes.

### Normal Flow:
1. Admin clicks "Create Registration Period" button.
2. System displays Create Registration Period form with fields:
   - Period Name (required) - e.g., "Đăng ký môn học Kỳ 1 2025-2026"
   - Start Date (required, date-time picker)
   - End Date (required, date-time picker)
   - Allowed Cohorts (multi-select, optional) - e.g., [18, 19, 20, 21]
   - Description (optional, text area)
3. Admin fills in all required information.
4. Admin selects allowed cohorts or leaves empty for "all cohorts".
5. Admin clicks "Create" button.
6. System validates input:
   - Period name is not empty
   - Start date is not empty and is valid date
   - End date is not empty and is valid date
   - End date is after start date
   - Allowed cohorts are valid numbers (if provided)
7. System checks for overlapping periods:
   - Queries existing periods with same allowed cohorts
   - Checks if new period's date range overlaps with any active/upcoming periods
   - If overlap found for same cohort, returns error
8. System determines initial status:
   - If current date < start date → status = 'upcoming'
   - If start date ≤ current date ≤ end date → status = 'active'
   - If current date > end date → status = 'closed'
9. System creates RegistrationPeriod record:
   - Sets periodName, startDate, endDate, allowedCohorts, description
   - Sets status from step 8
   - Sets createdBy = current Admin user ID
   - Sets createdAt = current timestamp
10. System returns success response with created period data.
11. FE displays success message: "Registration period created successfully".
12. FE redirects to Registration Period List page or shows Period Detail.
13. Use case ends.

### Alternative Flows:
- **4a** - Allow all cohorts:
  - Admin leaves "Allowed Cohorts" field empty.
  - System sets allowedCohorts = [] (empty array).
  - This means all cohorts can register during this period.
- **7a** - No overlap checking for "all cohorts" periods:
  - If allowedCohorts is empty, system shows warning.
  - Warning: "This period allows ALL cohorts. Proceed with caution."
  - Admin confirms and creation continues.
- **8a** - Creating past period:
  - Admin creates period with end date in the past.
  - System sets status = 'closed'.
  - System shows warning: "This period is already in the past and will be closed".
  - Admin confirms and creation continues.

### Exceptions:
- **Exception at Step 6** - End date before start date:
  - System returns 400 validation error: "End date must be after start date".
  - FE highlights date fields.
  - Admin corrects dates and resubmits.
- **Exception at Step 7** - Overlapping period detected:
  - System returns 400 conflict error: "Registration period overlaps with existing period '{periodName}' for cohorts {overlappingCohorts}".
  - System suggests:
    - Different date range, or
    - Different cohorts, or
    - Editing/cancelling existing period first
  - Admin adjusts configuration and resubmits.
- **Exception at Step 6** - Invalid date format:
  - System returns 400 validation error: "Invalid date format".
  - FE shows error message.
  - Admin selects valid dates using date picker.
- **Exception at Step 9** - Database error:
  - System returns 500 with error message.
  - No record is created.
  - Error logged to ErrorLog collection.
- **Exception at Step 6** - Invalid cohort values:
  - System returns 400 validation error: "Allowed cohorts must be valid numbers".
  - FE highlights cohort field.
  - Admin corrects cohort values.

### Priority:
**High**

### Frequency of Use:
**Low** - Created 2-3 times per semester

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR01 | Date Validation | End date must be strictly after start date. Minimum duration is 1 day. |
| BR02 | Status Auto-Set | System automatically determines initial status based on current date and date range. |
| BR03 | Overlap Prevention | Cannot create overlapping registration periods for the same cohort(s). Different cohorts can have overlapping periods. |
| BR04 | Empty Cohorts = All Cohorts | If allowedCohorts is empty array [], it means ALL cohorts are allowed. |
| BR05 | Cohort Validation | Cohort numbers must be valid positive integers, typically between current year - 10 and current year + 5. |
| BR06 | Period Naming Convention | Recommended format: "Đăng ký môn học Kỳ {semester} {academicYear}". |
| BR07 | Future Planning | Admin can create periods with start dates far in the future (upcoming periods). |
| BR08 | Past Period Creation | Admin can create periods with dates in the past (will be immediately closed), useful for archival purposes. |
| BR09 | Audit Trail | System records createdBy (Admin user ID) and createdAt timestamp for all periods. |
| BR10 | Only Admin Can Create | Only Admin role can create registration periods. Staff can only view and configure. |
| BR11 | Description Optional | Description field is optional but recommended for clarity. |
| BR12 | Multiple Active Periods | System allows multiple active periods simultaneously if they target different cohorts. |

---

<div style="page-break-after: always;"></div>

## UC07 - Configure Registration Period

| Field | Details |
|-------|---------|
| **UC ID and Name** | UC07_Configure_Registration_Period |
| **Created By** | HuyHM | **Date Created:** | 24/Feb/2026 |
| **Primary Actor** | Admin, Staff |
| **Secondary Actors** | System, Database |
| **Trigger** | Admin/Staff clicks "Edit" or "Configure" button on a registration period in the list. |
| **Description** | Allows Admin/Staff to modify an existing registration period's configuration including period name, dates, allowed cohorts, status, and description. The system validates changes, prevents invalid transitions, and updates the record with audit trail. |

### Preconditions:
1. Admin/Staff is authenticated and logged into the system.
2. Admin/Staff has permission to configure registration periods.
3. Target registration period exists in database.
4. Period status is not 'cancelled' (cancelled periods cannot be reconfigured).

### Postconditions:
1. RegistrationPeriod record is updated with new values.
2. updatedBy and updatedAt fields are updated with current user and timestamp.
3. Status transitions are validated and applied correctly.
4. Success message is displayed to Admin/Staff.
5. Updated period data is reflected in the registration period list.
6. Configuration change is logged for audit purposes.

### Normal Flow:
1. Admin/Staff clicks "Edit" or "Configure" button next to a period in the list.
2. System retrieves current registration period data by period ID.
3. System displays Configure Registration Period form pre-filled with current data:
   - Period Name (editable)
   - Start Date (editable)
   - End Date (editable)
   - Allowed Cohorts (multi-select, editable)
   - Status (dropdown: upcoming/active/closed/cancelled)
   - Description (editable)
4. Admin/Staff modifies desired fields.
5. Admin/Staff clicks "Update" button.
6. System validates modified fields:
   - Period name is not empty
   - Start date is valid date
   - End date is valid date and after start date
   - Allowed cohorts are valid numbers (if provided)
   - Status transition is valid (see BR05)
7. System checks for overlapping periods (if dates or cohorts changed):
   - Queries other periods with overlapping cohorts
   - Checks if modified date range overlaps with other active/upcoming periods
   - Excludes current period from overlap check
8. System validates status transition:
   - Can change from 'upcoming' to 'active' or 'cancelled'
   - Can change from 'active' to 'closed' or 'cancelled'
   - Cannot change from 'closed' back to 'active' or 'upcoming'
   - Cannot change from 'cancelled' to any other status
9. System updates RegistrationPeriod record with new values.
10. System sets updatedBy = current Admin/Staff user ID.
11. System sets updatedAt = current timestamp.
12. System returns success response with updated period data.
13. FE displays success message: "Registration period updated successfully".
14. FE updates the period list to reflect changes.
15. Use case ends.

### Alternative Flows:
- **4a** - No changes made:
  - Admin/Staff clicks "Update" without modifying any fields.
  - System detects no changes and returns success without database update.
  - Message: "No changes detected".
- **4b** - Extend end date for active period:
  - Admin extends end date of currently active period.
  - System validates and allows the change.
  - Useful for extending registration deadline.
- **4c** - Early closure:
  - Admin changes status from 'active' to 'closed' before end date.
  - System shows confirmation: "Close this period early? Students will no longer be able to register."
  - If confirmed, status is updated to 'closed'.
- **8a** - Auto-status correction:
  - If Admin changes dates and new dates don't match current status:
    - System auto-adjusts status based on current date and new date range.
    - System shows message: "Status automatically adjusted to '{newStatus}' based on dates".

### Exceptions:
- **Exception at Step 2** - Period not found:
  - System returns 404 error: "Registration period not found".
  - FE redirects back to period list.
- **Exception at Step 6** - End date before start date:
  - System returns 400 validation error: "End date must be after start date".
  - FE highlights date fields.
  - Admin/Staff corrects dates and resubmits.
- **Exception at Step 7** - Overlapping period conflict:
  - System returns 400 conflict error: "Modified period overlaps with existing period '{periodName}' for cohorts {overlappingCohorts}".
  - Admin/Staff must adjust dates or cohorts to avoid overlap.
- **Exception at Step 8** - Invalid status transition:
  - System returns 400 validation error: "Cannot change status from '{currentStatus}' to '{newStatus}'".
  - System explains valid transitions.
  - Admin/Staff selects valid status.
- **Exception at Step 9** - Database error:
  - System returns 500 with error message.
  - Changes are not saved.
  - Error logged to ErrorLog collection.
- **Exception at Step 9** - Concurrent update conflict:
  - System detects that period was modified by another user.
  - System returns 409 conflict error with message: "Period was modified by another user. Please refresh and try again."
  - Admin/Staff refreshes and reapplies changes.
- **Exception at Step 2** - Attempting to configure cancelled period:
  - System returns 400 error: "Cannot configure cancelled registration period".
  - Cancelled periods are read-only.

### Priority:
**High**

### Frequency of Use:
**Medium** - Adjusted occasionally during registration seasons when dates need extension or cohorts need updating

### Business Rules:

| ID | Business Rule | Business Rule Description |
|----|---------------|---------------------------|
| BR01 | Date Validation | End date must always be after start date. Cannot set overlapping dates (endDate < startDate). |
| BR02 | Overlap Prevention | Modified period cannot overlap with other active/upcoming periods for same cohort(s). |
| BR03 | Status Auto-Adjustment | If dates are changed such that current date falls outside date range, status is auto-adjusted accordingly. |
| BR04 | Cancelled Periods Locked | Cancelled periods cannot be reconfigured. They are read-only for historical record. |
| BR05 | Valid Status Transitions | Allowed transitions: upcoming→active/cancelled, active→closed/cancelled, closed→(no changes), cancelled→(no changes). |
| BR06 | Extend Active Period | Admin can extend end date of active period to give students more time. |
| BR07 | Early Closure | Admin can close active period early by changing status to 'closed' before end date. Requires confirmation. |
| BR08 | Cohort Modification | Changing allowed cohorts may affect overlap validation. System re-validates overlap with new cohort set. |
| BR09 | Audit Trail | All configuration changes are logged with updatedBy (Admin/Staff user ID) and updatedAt timestamp. |
| BR10 | Staff Limitations | Staff can configure periods but cannot cancel them. Only Admin can set status to 'cancelled'. |
| BR11 | Active Period Warning | Modifying an active period shows warning: "This period is currently active. Changes may affect students." |
| BR12 | Description Updates | Description can be updated anytime without affecting functionality or validation. |
| BR13 | Name Uniqueness | Period names should be unique for clarity, but system does not enforce (only warning shown). |
| BR14 | Concurrent Edit Prevention | System uses version control or timestamp to prevent concurrent edit conflicts. |

---

<div style="page-break-after: always;"></div>

## APPENDIX A - Common Definitions

### Status Definitions

**Student Academic Status:**
- `enrolled` - Student is currently active and attending classes
- `on-leave` - Student has temporarily suspended studies (bảo lưu)
- `dropped` - Student has withdrawn from the program
- `graduated` - Student has completed all requirements and graduated

**Registration Period Status:**
- `upcoming` - Period has not started yet (current date < start date)
- `active` - Period is currently open for registration (start date ≤ current date ≤ end date)
- `closed` - Period has ended (current date > end date)
- `cancelled` - Period was cancelled by Admin and is no longer valid

**User Status:**
- `active` - User can login and use the system
- `inactive` - User is temporarily deactivated
- `blocked` - User is blocked due to violations
- `pending` - User account is awaiting activation

### User Roles

- `admin` - Full system access, can manage all entities including users, students, registration periods
- `staff` - Can manage students, view/configure registration periods, limited admin functions
- `student` - Can view own information, register for classes during registration periods

### Data Privacy Rules

- Identity Number (CCCD/CMND) is sensitive data and masked in list views
- Only Admin and assigned Staff can view full student details including identity numbers
- Student passwords are hashed using bcrypt with salt rounds = 10
- Login attempts are logged for security audit

### Error Handling

All errors follow standard HTTP status codes:
- `400` - Bad Request (validation errors, business rule violations)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but no permission)
- `404` - Not Found (entity doesn't exist)
- `408` - Request Timeout
- `409` - Conflict (concurrent update, duplicate values)
- `500` - Internal Server Error (database errors, unexpected errors)

All errors are logged to ErrorLog collection for monitoring and debugging.

---

## APPENDIX B - Database Schema References

### Student Collection
```javascript
{
  _id: ObjectId,
  studentCode: String (unique, required),
  fullName: String (required),
  email: String (unique, required),
  majorCode: String (required, FK → Major),
  cohort: Number (required),
  identityNumber: String (unique, sparse),
  dateOfBirth: Date,
  phoneNumber: String,
  address: String,
  gender: String [male, female, other],
  classSection: String,
  academicStatus: String [enrolled, on-leave, dropped, graduated],
  enrollmentYear: Number,
  userId: ObjectId (FK → User, unique, sparse),
  isActive: Boolean (default: true),
  createdBy: ObjectId (FK → User),
  updatedBy: ObjectId (FK → User),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### RegistrationPeriod Collection
```javascript
{
  _id: ObjectId,
  periodName: String (required),
  startDate: Date (required),
  endDate: Date (required),
  allowedCohorts: [Number] (default: []),
  description: String,
  status: String [upcoming, active, closed, cancelled],
  createdBy: ObjectId (FK → User),
  updatedBy: ObjectId (FK → User),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Major Collection
```javascript
{
  _id: ObjectId,
  majorCode: String (unique, required),
  majorName: String (required),
  studentCount: Number (default: 0),
  isActive: Boolean (default: true),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### User Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed),
  fullName: String (required),
  authProvider: String [google, local],
  mustChangePassword: Boolean (default: false),
  role: String [admin, staff, student],
  isActive: Boolean (default: true),
  status: String [active, inactive, blocked, pending],
  lastLoginAt: Date,
  createdBy: ObjectId (FK → User),
  updatedBy: ObjectId (FK → User),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

---

## DOCUMENT REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 24/Feb/2026 | HuyHM | Initial creation - All 7 use cases documented |
| 1.1 | 24/Feb/2026 | HuyHM | Added UC02 - Search/Filter Student. Total: 8 use cases |
| 1.2 | 24/Feb/2026 | HuyHM | Merged UC04 (Update) and UC05 (Delete) into UC04 - Update/Delete Student. Total: 7 use cases |

---

**END OF DOCUMENT**
