# Academic Module

Module quản lý academic profiles, courses, và enrollments cho hệ thống Pathfinder.

## 📋 Features

- ✅ Academic Profile Management
- ✅ Course Catalog & Management
- ✅ Course Enrollment System
- ✅ Progress Tracking
- ✅ Role-based Access Control

---

## 🗄️ Entities

### AcademicProfile
- Lưu thông tin học tập của student
- Fields: currentLevel, GPA, major, interests, strengths, etc.
- One-to-One relationship với User

### Course
- Thông tin về các khóa học
- Fields: name, category, level, skills, prerequisites
- Có thể filter by category/level

### Enrollment
- Quản lý việc đăng ký khóa học
- Track progress (0-100%)
- Status: enrolled, in_progress, completed, dropped

---

## 🔐 Authorization

### Student Role
- ✅ Create/update own academic profile
- ✅ Browse courses
- ✅ Enroll in courses
- ✅ Track own progress

### Counselor Role
- ✅ View all student profiles
- ✅ View student enrollments

### Admin Role
- ✅ Full access
- ✅ CRUD courses
- ✅ Manage all profiles

---

## 📡 API Endpoints

### Academic Profile

```http
POST   /api/academic/profile
GET    /api/academic/profile
PATCH  /api/academic/profile
DELETE /api/academic/profile

GET    /api/academic/profile/all          # Admin/Counselor
GET    /api/academic/profile/:userId      # Admin/Counselor
```

### Courses

```http
POST   /api/courses                       # Admin only
GET    /api/courses?category=&level=&search=
GET    /api/courses/:id
PATCH  /api/courses/:id                   # Admin only
DELETE /api/courses/:id                   # Admin only
GET    /api/courses/stats/by-category
```

### Enrollments

```http
POST   /api/enrollments                   # Body: { courseId }
GET    /api/enrollments
GET    /api/enrollments/stats
GET    /api/enrollments/:id
PATCH  /api/enrollments/:id/progress      # Body: { progress }
DELETE /api/enrollments/:id               # Drop course
```

---

## 🧪 Testing Flow

### 1. Create Academic Profile (Student)

```bash
POST /api/academic/profile
Authorization: Bearer {token}

{
  "currentLevel": "undergraduate",
  "currentGrade": "Year 2",
  "institution": "HCMC University of Technology",
  "major": "Computer Science",
  "gpa": 3.5,
  "academicInterests": ["AI", "Web Development"],
  "subjectStrengths": ["Math", "Programming"]
}
```

### 2. Create Course (Admin)

```bash
POST /api/courses
Authorization: Bearer {admin-token}

{
  "name": "Introduction to Machine Learning",
  "description": "Learn ML fundamentals",
  "category": "technology",
  "level": "intermediate",
  "credits": 3,
  "skills": ["Python", "ML", "Data Science"],
  "durationHours": 40
}
```

### 3. Browse Courses

```bash
GET /api/courses?category=technology&level=intermediate
```

### 4. Enroll Course (Student)

```bash
POST /api/enrollments
Authorization: Bearer {token}

{
  "courseId": "course-uuid-here"
}
```

### 5. Update Progress

```bash
PATCH /api/enrollments/{enrollment-id}/progress
Authorization: Bearer {token}

{
  "progress": 50
}
```

---

## 📊 Course Categories

- `math` - Mathematics
- `science` - Science
- `technology` - Technology
- `engineering` - Engineering
- `business` - Business
- `arts` - Arts
- `humanities` - Humanities
- `language` - Languages
- `social_science` - Social Science
- `other` - Other

## 📈 Course Levels

- `beginner` - Beginner
- `intermediate` - Intermediate
- `advanced` - Advanced
- `expert` - Expert

## 🎓 Education Levels

- `high_school` - High School
- `undergraduate` - Undergraduate
- `graduate` - Graduate
- `postgraduate` - Postgraduate

---

## 🔄 Enrollment Status Flow

```
enrolled → in_progress → completed
                ↓
            dropped
```

---

## 💡 Tips

1. Student phải tạo Academic Profile trước khi sử dụng recommendation features
2. Progress tự động set status = completed khi đạt 100%
3. Không thể drop course đã completed
4. Admin có thể deactivate course bằng `isActive: false`

