# Score Component Integration Guide

## 📍 Integration Points

You need to integrate ScoreComponent into 2 methods in `grades.service.js`:

1. **updateEnrollmentGrade()** - Line 211 onwards (used when updating single enrollment via PATCH)
2. **submitGrades()** - Line 763 onwards (used when submitting batch or single grades)

---

## Step A: Integrate into updateEnrollmentGrade()

### Location: backend-api/src/services/grades.service.js, line ~211

**BEFORE (Current):**
```javascript
async updateEnrollmentGrade(enrollmentId, payload = {}, requester = {}) {
  // ... validation code ...
  
  const enrollment = await ClassEnrollment.findById(enrollmentId)
    .populate('student', 'studentCode fullName')
    .populate('classSection', 'classCode teacher');  // ← line 224
  
  // ... permission check ...
  
  const beforeScores = this.buildScoreSnapshot(enrollment);

  this.applyScoresToEnrollment(  // ← line 268-271 - THIS IS THE PART TO REPLACE
    enrollment,
    { midtermScore, finalScore, otherScore, continuousScore, ptScores },
    true
  );

  // ... rest of method ...
}
```

**AFTER (With Dynamic Score Component):**

Replace lines **268-271** with:

```javascript
  const beforeScores = this.buildScoreSnapshot(enrollment);

  // ========== NEW CODE START ==========
  // Fetch score component for this enrollment's subject
  const scoreComponent = await this.getScoreComponentForClassSection(enrollment.classSection?._id);
  
  if (scoreComponent) {
    // Use dynamic formula for this subject
    console.log('[updateEnrollmentGrade] Using scoreComponent for subject calculation');
    await this.applyScoresToEnrollmentWithComponent(
      enrollment,
      { midtermScore, finalScore, otherScore, continuousScore, ptScores },
      scoreComponent
    );
  } else {
    // Fallback to default formula (30-50-20)
    console.log('[updateEnrollmentGrade] No scoreComponent found, using default weights');
    this.applyScoresToEnrollment(
      enrollment,
      { midtermScore, finalScore, otherScore, continuousScore, ptScores },
      true
    );
  }
  // ========== NEW CODE END ==========
```

**Key Changes:**
- Added `scoreComponent` fetch before applying scores
- Check if ScoreComponent exists for the subject
- If exists: use `applyScoresToEnrollmentWithComponent()` (DYNAMIC)
- If not: use `applyScoresToEnrollment()` (DEFAULT FALLBACK)
- This ensures backward compatibility

---

## Step B: Integrate into submitGrades()

### Location: backend-api/src/services/grades.service.js, line ~763

**BEFORE (Current - Single Payload Mode):**
```javascript
async submitGrades(payload, options = {}) {
  // ... validation code ...
  
  if (isSinglePayload) {
    // ... student/section validation ...
    
    const enrollment = await ClassEnrollment.findOne({
      student: studentId,
      classSection: classSectionId,
      status: { $in: ['enrolled', 'completed'] }
    });

    this.ensureEnrollmentEditable(enrollment);

    this.applyScoresToEnrollment(  // ← line 825-829 - THIS NEEDS UPDATING
      enrollment,
      { midtermScore, finalScore, otherScore, ptScores },
      autoCalculate
    );

    const saved = await enrollment.save();
    // ...
  }
}
```

**AFTER (With Dynamic Score Component):**

Replace lines **825-829** with:

```javascript
    this.ensureEnrollmentEditable(enrollment);

    // ========== NEW CODE START ==========
    // Fetch score component for this enrollment's subject
    const encodedScoreComponent = await this.getScoreComponentForClassSection(classSectionId);
    
    if (encodedScoreComponent) {
      console.log('[submitGrades] Using scoreComponent for grade calculation');
      await this.applyScoresToEnrollmentWithComponent(
        enrollment,
        { midtermScore, finalScore, otherScore, ptScores },
        encodedScoreComponent
      );
    } else {
      console.log('[submitGrades] No scoreComponent found, using default weights');
      this.applyScoresToEnrollment(
        enrollment,
        { midtermScore, finalScore, otherScore, ptScores },
        autoCalculate
      );
    }
    // ========== NEW CODE END ==========

    const saved = await enrollment.save();
    // ... rest unchanged ...
```

**Key Changes:**
- Same pattern as updateEnrollmentGrade()
- Uses classSectionId instead of enrollment.classSection._id
- Dynamic formula if scoreComponent exists
- Fallback to default if not

---

## Step C: Verify Integration

### 1. Check imports at top of file

```javascript
// Around line 1-20, verify this import exists:
const scoreComponentService = require('./scoreComponent.service');

// If not present, add it after other service imports
```

### 2. Verify ClassEnrollment model includes classSection in populate

```javascript
// Line ~224 should have:
.populate('classSection', 'classCode teacher');  // ← must include 'classSection'

// Line ~817 retrieves classSectionId from payload, so should work as-is
```

### 3. Run test to verify

```bash
cd backend-api
node test-score-component.js
```

Expected output:
```
✓ Score Component created successfully
✓ Score Component retrieved successfully
✓ Final Grade calculated: [some number]
✓ Calculation verified ✓
✓ All tests passed! ✨
```

---

## Step D: Test End-to-End Flow

### 1. Seed score components

```bash
cd backend-api
node seed-score-components.js
```

### 2. Create test enrollment with WDP301 class

```bash
# Use your API client (Postman/curl) to:
# Find student ID and WDP301 class section ID first

# Create enrollment:
POST /api/classes/:classId/enrollments
{
  "student": "{studentId}",
  "enrollmentDate": "2024-01-01"
}
```

### 3. Submit grades using ScoreComponent

```bash
# Single mode (new):
PATCH /api/grades/{enrollmentId}
{
  "grade": {
    "midtermScore": 7.5,
    "finalScore": 8.5,
    "ptScores": [
      {"type": "PT1", "score": 8.0},
      {"type": "PT2", "score": 9.0},
      {"type": "PT3", "score": 8.5}
    ]
  }
}
```

### 4. Verify grade was calculated correctly

```javascript
// Expected calculation for WDP301:
// PT1: 8.0 × 0.1 = 0.80
// PT2: 9.0 × 0.1 = 0.90
// PT3: 8.5 × 0.1 = 0.85
// GK: 7.5 × 0.2 = 1.50
// BT: (depends on formula, maybe average of PT?) = 0.2 weight
// CK: 8.5 × 0.3 = 2.55
// TOTAL ≈ 8.20 (approximately)

GET /api/grades/{enrollmentId}
// Check response.grade field equals calculated value
```

---

## Step E: Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Cannot read property '_id' of undefined` | enrollment.classSection not populated | Add `.populate('classSection')` at line 224 |
| `scoreComponentService is not defined` | Missing import | Add `const scoreComponentService = require('./scoreComponent.service');` |
| `Method not found` | Using wrong method name | Check method names: `applyScoresToEnrollmentWithComponent`, `getScoreComponentForClassSection` |
| Grade not calculated | No ScoreComponent for subject | Run `seed-score-components.js` first |
| Grade = 0 | Missing required component | Ensure all `isRequired: true` components have scores |

---

## Code Diff Summary

### File: backend-api/src/services/grades.service.js

```diff
  async updateEnrollmentGrade(enrollmentId, payload = {}, requester = {}) {
    // ... existing code ...
    
    const beforeScores = this.buildScoreSnapshot(enrollment);

-   this.applyScoresToEnrollment(
-     enrollment,
-     { midtermScore, finalScore, otherScore, continuousScore, ptScores },
-     true
-   );

+   // Fetch score component for this enrollment's subject
+   const scoreComponent = await this.getScoreComponentForClassSection(enrollment.classSection?._id);
+   
+   if (scoreComponent) {
+     console.log('[updateEnrollmentGrade] Using scoreComponent for subject calculation');
+     await this.applyScoresToEnrollmentWithComponent(
+       enrollment,
+       { midtermScore, finalScore, otherScore, continuousScore, ptScores },
+       scoreComponent
+     );
+   } else {
+     console.log('[updateEnrollmentGrade] No scoreComponent found, using default weights');
+     this.applyScoresToEnrollment(
+       enrollment,
+       { midtermScore, finalScore, otherScore, continuousScore, ptScores },
+       true
+     );
+   }

    console.log('[updateEnrollmentGrade] After apply - enrollment.ptScores:', ...);
    // ... rest unchanged ...
  }
```

```diff
  async submitGrades(payload, options = {}) {
    // ... existing code ...
    if (isSinglePayload) {
      // ... validation ...
      this.ensureEnrollmentEditable(enrollment);

-     this.applyScoresToEnrollment(
-       enrollment,
-       { midtermScore, finalScore, otherScore, ptScores },
-       autoCalculate
-     );

+     // Fetch score component for this enrollment's subject
+     const scoreComponent = await this.getScoreComponentForClassSection(classSectionId);
+     
+     if (scoreComponent) {
+       console.log('[submitGrades] Using scoreComponent for grade calculation');
+       await this.applyScoresToEnrollmentWithComponent(
+         enrollment,
+         { midtermScore, finalScore, otherScore, ptScores },
+         scoreComponent
+       );
+     } else {
+       console.log('[submitGrades] No scoreComponent found, using default weights');
+       this.applyScoresToEnrollment(
+         enrollment,
+         { midtermScore, finalScore, otherScore, ptScores },
+         autoCalculate
+       );
+     }

      const saved = await enrollment.save();
      // ... rest unchanged ...
    }
  }
```

---

## What NOT to Change

❌ Do NOT modify:
- `applyScoresToEnrollment()` method itself
- `buildScoreSnapshot()` method
- `validateScore()` validation logic
- Batch mode in submitGrades() (lines 850+)
- Permission checking logic
- GradeChangeLog creation

✅ Only change:
- The 2 applyScoresToEnrollment() calls
- Wrap with scoreComponent fetch and conditional logic

---

## Rollback Plan

If something breaks:

1. Revert the changes in updateEnrollmentGrade() and submitGrades()
2. Return to using only `applyScoresToEnrollment()` with hardcoded weights
3. System will work with default 30-50-20 formula again
4. Check logs for specific error messages

---

## Expected Behavior After Integration

| Scenario | Before | After |
|----------|--------|-------|
| Enroll in WDP301 | Grade = (GK×0.3 + CK×0.5 + BT×0.2) | Grade = (PT1×0.1 + PT2×0.1 + PT3×0.1 + GK×0.2 + BT×0.2 + CK×0.3) |
| Enroll in WDP303 | Grade = (GK×0.3 + CK×0.5 + BT×0.2) | Grade = (PT1×0.15 + PT2×0.15 + GK×0.3 + CK×0.4) |
| No ScoreComponent | Uses 30-50-20 | Uses 30-50-20 (fallback) |
| PT scores submitted | Ignored | Included in calculation |

---

## Support

- Documentation: See `/backend-api/SCORE_COMPONENT_API.md`
- Tests: Run `node test-score-component.js`
- Seed data: Run `node seed-score-components.js`
- Admin UI: Available at `/admin/score-components`
