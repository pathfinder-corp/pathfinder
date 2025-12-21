# Admin Mentorship Management API

Comprehensive API documentation for admin to manage mentors, mentorships, applications, and documents.

---

## 📋 Table of Contents

1. [Mentor Management](#mentor-management)
2. [Mentorship Management](#mentorship-management)
3. [Application Management](#application-management)
4. [Document Verification](#document-verification)
5. [Statistics & Analytics](#statistics--analytics)
6. [Audit Logs](#audit-logs)

---

## 🎓 Mentor Management

### 1. List All Mentors

Get paginated list of all mentor profiles with filters.

**Endpoint:** `GET /api/admin/mentors`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `isActive` | boolean | No | Filter by active status |
| `isAcceptingMentees` | boolean | No | Filter by accepting mentees status |
| `search` | string | No | Search by name, email, headline, bio |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "mentors": [
    {
      "id": "profile-uuid",
      "userId": "user-uuid",
      "user": {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://..."
      },
      "headline": "Senior Software Engineer | 10+ Years Experience",
      "bio": "Experienced software engineer...",
      "expertise": ["Software Engineering", "Cloud Architecture"],
      "skills": ["TypeScript", "Node.js", "React"],
      "industries": ["FinTech", "Healthcare"],
      "languages": ["English", "Spanish"],
      "yearsExperience": 10,
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "portfolioUrl": "https://johndoe.com",
      "isActive": true,
      "isAcceptingMentees": true,
      "maxMentees": 5,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-12-21T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Example Requests:**

```bash
# Get all active mentors
GET /api/admin/mentors?isActive=true

# Get mentors accepting new mentees
GET /api/admin/mentors?isAcceptingMentees=true

# Search mentors
GET /api/admin/mentors?search=software engineer

# Paginated results
GET /api/admin/mentors?page=2&limit=50
```

---

### 2. Get Mentor Statistics

Get overview statistics about mentors.

**Endpoint:** `GET /api/admin/mentors/stats`

**Response:**
```json
{
  "total": 150,
  "active": 142,
  "inactive": 8,
  "acceptingMentees": 120
}
```

---

### 3. Get Mentor Profile Details

Get detailed information about a specific mentor.

**Endpoint:** `GET /api/admin/mentors/:id`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Mentor profile ID |

**Response:**
```json
{
  "id": "profile-uuid",
  "userId": "user-uuid",
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://..."
  },
  "headline": "Senior Software Engineer",
  "bio": "Experienced software engineer...",
  "expertise": ["Software Engineering"],
  "skills": ["TypeScript", "Node.js"],
  "industries": ["FinTech"],
  "languages": ["English"],
  "yearsExperience": 10,
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "portfolioUrl": "https://johndoe.com",
  "isActive": true,
  "isAcceptingMentees": true,
  "maxMentees": 5,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-12-21T10:00:00Z"
}
```

---

### 4. Revoke Mentor Status

Remove mentor status from a user and deactivate their profile.

**Endpoint:** `POST /api/admin/users/:id/revoke-mentor`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | User ID |

**Request Body:**
```json
{
  "reason": "Violation of community guidelines"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mentor status revoked successfully"
}
```

**What happens:**
1. User role changed from `MENTOR` to `STUDENT`
2. Mentor profile deactivated
3. User receives notification
4. Action logged in audit logs

---

## 🤝 Mentorship Management

### 1. List All Mentorships

Get paginated list of all mentorships with filters.

**Endpoint:** `GET /api/admin/mentorships`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mentorId` | UUID | No | Filter by mentor ID |
| `menteeId` | UUID | No | Filter by mentee ID |
| `status` | string | No | Filter by status: `pending`, `active`, `completed`, `cancelled` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "mentorships": [
    {
      "id": "mentorship-uuid",
      "mentorId": "mentor-uuid",
      "studentId": "student-uuid",
      "mentor": {
        "id": "mentor-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      },
      "student": {
        "id": "student-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com",
        "avatar": "https://..."
      },
      "status": "active",
      "startedAt": "2024-01-15T10:00:00Z",
      "endedAt": null,
      "endReason": null,
      "endedBy": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 320,
    "page": 1,
    "limit": 20,
    "totalPages": 16
  }
}
```

**Example Requests:**

```bash
# Get all active mentorships
GET /api/admin/mentorships?status=active

# Get mentorships for a specific mentor
GET /api/admin/mentorships?mentorId=mentor-uuid

# Get mentorships for a specific mentee
GET /api/admin/mentorships?menteeId=student-uuid
```

---

### 2. Get Mentorship Statistics

Get overview statistics about mentorships.

**Endpoint:** `GET /api/admin/mentorships/stats`

**Response:**
```json
{
  "total": 320,
  "active": 180,
  "completed": 120,
  "cancelled": 20
}
```

---

### 3. Get Mentorship Details

Get detailed information about a specific mentorship.

**Endpoint:** `GET /api/admin/mentorships/:id`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Mentorship ID |

**Response:**
```json
{
  "id": "mentorship-uuid",
  "mentorId": "mentor-uuid",
  "studentId": "student-uuid",
  "mentor": {
    "id": "mentor-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "avatar": "https://..."
  },
  "student": {
    "id": "student-uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "avatar": "https://..."
  },
  "status": "active",
  "startedAt": "2024-01-15T10:00:00Z",
  "endedAt": null,
  "endReason": null,
  "endedBy": null,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

---

### 4. Force End Mentorship

Admin can forcefully end an active mentorship.

**Endpoint:** `POST /api/admin/mentorships/:id/force-end`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Mentorship ID |

**Request Body:**
```json
{
  "reason": "Inappropriate behavior reported"
}
```

**Response:**
```json
{
  "id": "mentorship-uuid",
  "status": "cancelled",
  "endReason": "Inappropriate behavior reported",
  "endedBy": "admin-uuid",
  "endedAt": "2024-12-21T10:00:00Z"
}
```

**What happens:**
1. Mentorship status changed to `cancelled`
2. Both mentor and mentee receive notifications
3. Action logged in audit logs

---

## 📝 Application Management

### 1. List All Applications

Get paginated list of all mentor applications.

**Endpoint:** `GET /api/admin/mentor-applications`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `pending`, `under_review`, `approved`, `declined`, `withdrawn`, `flagged` |
| `userId` | UUID | No | Filter by user ID |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "applications": [
    {
      "id": "app-uuid",
      "userId": "user-uuid",
      "status": "pending",
      "applicationData": {
        "headline": "Senior Software Engineer",
        "bio": "Experienced developer...",
        "expertise": ["Software Engineering"],
        "skills": ["TypeScript", "Node.js"],
        "industries": ["FinTech"],
        "languages": ["English"],
        "yearsExperience": 10,
        "linkedinUrl": "https://linkedin.com/in/johndoe",
        "portfolioUrl": "https://johndoe.com",
        "motivation": "I want to give back..."
      },
      "documents": [
        {
          "id": "doc-uuid",
          "type": "certificate",
          "title": "AWS Solutions Architect",
          "verificationStatus": "pending",
          "createdAt": "2024-12-20T10:00:00Z"
        }
      ],
      "statusHistory": [
        {
          "id": "history-uuid",
          "previousStatus": null,
          "newStatus": "pending",
          "changedAt": "2024-12-20T10:00:00Z"
        }
      ],
      "createdAt": "2024-12-20T10:00:00Z",
      "updatedAt": "2024-12-20T10:00:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 2. Get Application Details

Get detailed information about a specific application.

**Endpoint:** `GET /api/admin/mentor-applications/:id`

**Response:** Same structure as list item above with full details.

---

### 3. Review Application

Approve or decline a mentor application.

**Endpoint:** `POST /api/admin/mentor-applications/:id/review`

**Request Body:**
```json
{
  "action": "approve",
  "notes": "Strong background and excellent motivation"
}
```

Or for decline:
```json
{
  "action": "decline",
  "reason": "Insufficient experience in the field"
}
```

**Response:**
```json
{
  "id": "app-uuid",
  "status": "approved",
  "reviewedBy": "admin-uuid",
  "reviewedAt": "2024-12-21T10:00:00Z"
}
```

**What happens on approval:**
1. Application status → `approved`
2. User role → `MENTOR`
3. Mentor profile created
4. User receives approval notification
5. Action logged in audit logs

**What happens on decline:**
1. Application status → `declined`
2. User receives decline notification with reason
3. Action logged in audit logs

---

### 4. Mark Application Under Review

Mark an application as being actively reviewed.

**Endpoint:** `POST /api/admin/mentor-applications/:id/under-review`

**Response:**
```json
{
  "id": "app-uuid",
  "status": "under_review",
  "reviewedBy": "admin-uuid"
}
```

---

### 5. Get Flagged Applications

Get all applications flagged by the system for suspicious activity.

**Endpoint:** `GET /api/admin/applications/flagged`

**Response:**
```json
[
  {
    "id": "app-uuid",
    "userId": "user-uuid",
    "status": "flagged",
    "applicationData": {...},
    "flagReason": "Multiple applications from same IP",
    "createdAt": "2024-12-20T10:00:00Z"
  }
]
```

---

### 6. Unflag Application

Manually unflag a flagged application.

**Endpoint:** `POST /api/admin/applications/:id/unflag`

**Response:**
```json
{
  "id": "app-uuid",
  "status": "pending",
  "unflaggedBy": "admin-uuid"
}
```

---

### 7. Get IP Statistics

Get statistics about applications from same IP addresses (fraud detection).

**Endpoint:** `GET /api/admin/applications/ip-statistics`

**Response:**
```json
[
  {
    "ipHash": "hashed-ip-1",
    "count": 5
  },
  {
    "ipHash": "hashed-ip-2",
    "count": 3
  }
]
```

---

## 📄 Document Verification

### 1. Get All Pending Documents

Get all documents pending verification across all applications.

**Endpoint:** `GET /api/admin/documents/pending`

**Response:**
```json
[
  {
    "id": "doc-uuid",
    "applicationId": "app-uuid",
    "type": "certificate",
    "originalFilename": "aws-cert.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1234567,
    "title": "AWS Solutions Architect Certificate",
    "description": "Professional certification",
    "issuedYear": 2023,
    "issuingOrganization": "Amazon Web Services",
    "verificationStatus": "pending",
    "displayOrder": 0,
    "createdAt": "2024-12-20T10:00:00Z",
    "uploader": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "application": {
      "id": "app-uuid",
      "userId": "user-uuid",
      "status": "approved"
    }
  }
]
```

**Use case:** This endpoint shows ALL pending documents, including:
- Documents from new applications
- Documents uploaded by existing mentors (need re-verification)

---

### 2. Get Application Documents

Get all documents for a specific application.

**Endpoint:** `GET /api/admin/mentor-applications/:applicationId/documents`

**Response:**
```json
[
  {
    "id": "doc-uuid",
    "applicationId": "app-uuid",
    "type": "certificate",
    "title": "AWS Certificate",
    "verificationStatus": "verified",
    "createdAt": "2024-12-20T10:00:00Z"
  }
]
```

---

### 3. Get Document Details

Get detailed information about a specific document.

**Endpoint:** `GET /api/admin/mentor-applications/:applicationId/documents/:documentId`

**Response:**
```json
{
  "id": "doc-uuid",
  "applicationId": "app-uuid",
  "type": "certificate",
  "originalFilename": "aws-cert.pdf",
  "storedFilename": "uuid.pdf",
  "filePath": "/uploads/documents/uuid.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1234567,
  "title": "AWS Solutions Architect Certificate",
  "description": "Professional certification",
  "issuedYear": 2023,
  "issuingOrganization": "Amazon Web Services",
  "verificationStatus": "pending",
  "verificationNotes": null,
  "verifiedBy": null,
  "verifiedAt": null,
  "displayOrder": 0,
  "createdAt": "2024-12-20T10:00:00Z"
}
```

---

### 4. Verify or Reject Document

Verify or reject a document.

**Endpoint:** `POST /api/admin/mentor-applications/:applicationId/documents/:documentId/verify`

**Request Body (Verify):**
```json
{
  "verified": true,
  "notes": "Valid AWS certification confirmed"
}
```

**Request Body (Reject):**
```json
{
  "verified": false,
  "notes": "Document appears to be altered"
}
```

**Response:**
```json
{
  "id": "doc-uuid",
  "verificationStatus": "verified",
  "verifiedBy": "admin-uuid",
  "verifiedAt": "2024-12-21T10:00:00Z",
  "verificationNotes": "Valid AWS certification confirmed"
}
```

---

### 5. Get Document Statistics

Get statistics about documents for an application.

**Endpoint:** `GET /api/admin/mentor-applications/:applicationId/documents-stats`

**Response:**
```json
{
  "total": 5,
  "verified": 3,
  "pending": 1,
  "rejected": 1,
  "byType": {
    "certificate": 3,
    "award": 1,
    "portfolio": 1
  }
}
```

---

## 📊 Statistics & Analytics

### Mentor Statistics

**Endpoint:** `GET /api/admin/mentors/stats`

```json
{
  "total": 150,
  "active": 142,
  "inactive": 8,
  "acceptingMentees": 120
}
```

### Mentorship Statistics

**Endpoint:** `GET /api/admin/mentorships/stats`

```json
{
  "total": 320,
  "active": 180,
  "completed": 120,
  "cancelled": 20
}
```

---

## 📋 Audit Logs

### Get Audit Logs

View system audit logs for tracking all admin actions.

**Endpoint:** `GET /api/admin/audit-logs`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityType` | string | No | Filter by entity type: `user`, `mentor_profile`, `application`, etc. |
| `entityId` | UUID | No | Filter by entity ID |
| `actorId` | UUID | No | Filter by actor (admin) ID |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 50, max: 100) |

**Response:**
```json
{
  "logs": [
    {
      "id": "log-uuid",
      "actorId": "admin-uuid",
      "actor": {
        "id": "admin-uuid",
        "firstName": "Admin",
        "lastName": "User"
      },
      "action": "application_approved",
      "entityType": "mentor_application",
      "entityId": "app-uuid",
      "changes": {
        "status": "approved",
        "notes": "Strong background"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-12-21T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 50,
    "totalPages": 25
  }
}
```

---

## 🔐 Authorization

All admin endpoints require:
1. Valid JWT token in `Authorization` header
2. User role must be `ADMIN`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Error Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## 🎯 Common Use Cases

### 1. Review New Mentor Application

```bash
# 1. Get pending applications
GET /api/admin/mentor-applications?status=pending

# 2. View application details
GET /api/admin/mentor-applications/{id}

# 3. Check documents
GET /api/admin/mentor-applications/{id}/documents

# 4. Verify each document
POST /api/admin/mentor-applications/{id}/documents/{docId}/verify
{
  "verified": true,
  "notes": "Valid certificate"
}

# 5. Approve application
POST /api/admin/mentor-applications/{id}/review
{
  "action": "approve",
  "notes": "Excellent candidate"
}
```

### 2. Monitor Active Mentors

```bash
# Get all active mentors
GET /api/admin/mentors?isActive=true

# Get mentor statistics
GET /api/admin/mentors/stats

# View specific mentor details
GET /api/admin/mentors/{id}
```

### 3. Handle Mentor Document Update

```bash
# Get all pending documents (includes new uploads from existing mentors)
GET /api/admin/documents/pending

# Verify the new document
POST /api/admin/mentor-applications/{appId}/documents/{docId}/verify
{
  "verified": true,
  "notes": "New certificate verified"
}
```

### 4. Manage Problematic Mentorship

```bash
# Find the mentorship
GET /api/admin/mentorships?mentorId={mentorId}

# Force end it
POST /api/admin/mentorships/{id}/force-end
{
  "reason": "Violation of community guidelines"
}

# Optionally revoke mentor status
POST /api/admin/users/{userId}/revoke-mentor
{
  "reason": "Multiple violations"
}
```

---

## 📝 Notes

1. **Pagination:** All list endpoints support pagination with `page` and `limit` parameters
2. **Filtering:** Most endpoints support filtering by relevant fields
3. **Audit Logging:** All admin actions are automatically logged
4. **Notifications:** Users are automatically notified of relevant actions
5. **Document Verification:** Documents must be verified before appearing on public profiles

---

## 🚀 Quick Reference

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Mentors | `/api/admin/mentors` | GET |
| Mentor Stats | `/api/admin/mentors/stats` | GET |
| List Mentorships | `/api/admin/mentorships` | GET |
| Mentorship Stats | `/api/admin/mentorships/stats` | GET |
| List Applications | `/api/admin/mentor-applications` | GET |
| Review Application | `/api/admin/mentor-applications/:id/review` | POST |
| Pending Documents | `/api/admin/documents/pending` | GET |
| Verify Document | `/api/admin/mentor-applications/:appId/documents/:docId/verify` | POST |
| Revoke Mentor | `/api/admin/users/:id/revoke-mentor` | POST |
| Force End Mentorship | `/api/admin/mentorships/:id/force-end` | POST |
| Audit Logs | `/api/admin/audit-logs` | GET |

