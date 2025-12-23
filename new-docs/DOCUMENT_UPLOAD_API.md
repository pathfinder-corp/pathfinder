# Document Upload API Documentation

## Overview

Tính năng upload hình ảnh (chứng chỉ, giải thưởng, portfolio) cho mentor applications đã được tích hợp hoàn chỉnh.

## Features

### 1. **Upload Documents**

- Hỗ trợ định dạng: JPG, PNG, GIF, WEBP, PDF
- Kích thước tối đa: 5MB/file
- Tối đa 10 documents/application
- Xác minh file signature (magic bytes) để bảo mật
- Chỉ cho phép upload khi application ở trạng thái: `pending`, `under_review`, `flagged`

### 2. **Document Types**

- `certificate` - Chứng chỉ
- `award` - Giải thưởng
- `portfolio` - Portfolio/Dự án
- `recommendation` - Thư giới thiệu
- `other` - Khác

### 3. **Verification Status**

- `pending` - Chờ xác minh
- `verified` - Đã xác minh
- `rejected` - Bị từ chối

## API Endpoints

### User Endpoints

#### 1. Upload Document

```http
POST /api/mentor-applications/:id/documents
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  file: File,                    // Required: Image or PDF file
  type: DocumentType,            // Required: certificate|award|portfolio|recommendation|other
  title?: string,                // Optional: Title (3-200 chars)
  description?: string,          // Optional: Description (max 1000 chars)
  issuedYear?: number,           // Optional: Year issued (1990-current)
  issuingOrganization?: string   // Optional: Organization name (max 255 chars)
}
```

**Response:**

```typescript
{
  id: string,
  applicationId: string,
  type: DocumentType,
  originalFilename: string,
  mimeType: string,
  fileSize: number,
  title?: string,
  description?: string,
  issuedYear?: number,
  issuingOrganization?: string,
  verificationStatus: 'pending' | 'verified' | 'rejected',
  displayOrder: number,
  createdAt: Date
}
```

#### 2. Get All Documents for Application

```http
GET /api/mentor-applications/:id/documents
Authorization: Bearer <token>
```

**Response:** Array of `DocumentResponseDto`

#### 3. Get Single Document

```http
GET /api/mentor-applications/:applicationId/documents/:documentId
Authorization: Bearer <token>
```

#### 4. Download Document

```http
GET /api/mentor-applications/:applicationId/documents/:documentId/download
Authorization: Bearer <token>
```

**Response:** File download

#### 5. Update Document Metadata

```http
PATCH /api/mentor-applications/:applicationId/documents/:documentId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```typescript
{
  type?: DocumentType,
  title?: string,
  description?: string,
  issuedYear?: number,
  issuingOrganization?: string,
  displayOrder?: number
}
```

#### 6. Delete Document

```http
DELETE /api/mentor-applications/:applicationId/documents/:documentId
Authorization: Bearer <token>
```

**Response:** 204 No Content

### Admin Endpoints

#### 1. Get Application Documents (Admin View)

```http
GET /api/admin/mentor-applications/:applicationId/documents
Authorization: Bearer <admin-token>
```

#### 2. Get Document Details (Admin View)

```http
GET /api/admin/mentor-applications/:applicationId/documents/:documentId
Authorization: Bearer <admin-token>
```

**Response:** `AdminDocumentResponseDto` (includes verification details)

#### 3. Verify/Reject Document

```http
POST /api/admin/mentor-applications/:applicationId/documents/:documentId/verify
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**

```typescript
{
  verified: boolean,    // true = verify, false = reject
  notes?: string        // Optional: Verification notes (max 1000 chars)
}
```

#### 4. Get Document Statistics

```http
GET /api/admin/mentor-applications/:applicationId/documents-stats
Authorization: Bearer <admin-token>
```

**Response:**

```typescript
{
  total: number,
  verified: number,
  pending: number,
  rejected: number,
  byType: {
    certificate: number,
    award: number,
    portfolio: number,
    recommendation: number,
    other: number
  }
}
```

## Application Response Structure

Khi fetch application (GET /api/mentor-applications/:id hoặc /api/mentor-applications/mine), response sẽ bao gồm:

```typescript
{
  id: string,
  userId: string,
  status: ApplicationStatus,
  applicationData: {...},
  documents: [              // ✅ Documents array được include
    {
      id: string,
      type: DocumentType,
      originalFilename: string,
      mimeType: string,
      fileSize: number,
      title?: string,
      verificationStatus: string,
      createdAt: Date,
      ...
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## Configuration

Thêm vào `.env`:

```env
# File Upload Configuration
UPLOAD_DOCUMENTS_PATH=./uploads/documents
UPLOAD_MAX_FILE_SIZE_BYTES=5242880              # 5MB
UPLOAD_MAX_DOCUMENTS_PER_APPLICATION=10
UPLOAD_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf
```

## Database Migration

Chạy migration để tạo bảng `application_documents`:

```bash
yarn migration:run
```

Migration file: `src/migrations/1734700000000-CreateApplicationDocuments.ts`

## Security Features

1. **File Type Validation**
   - Kiểm tra MIME type
   - Xác minh file signature (magic bytes)
   - Chống giả mạo file type

2. **Access Control**
   - User chỉ upload/xem documents của application mình
   - Admin có quyền xem tất cả documents
   - Chỉ upload được khi application đang pending/under_review

3. **File Storage**
   - Filename được generate bằng UUID
   - Lưu trong thư mục phân cấp theo application ID
   - Metadata lưu trong database

4. **Audit Logging**
   - Log tất cả actions: upload, update, delete, verify
   - Track user và timestamp

## Example Usage

### Upload Certificate

```typescript
const formData = new FormData()
formData.append('file', certificateFile)
formData.append('type', 'certificate')
formData.append('title', 'AWS Solutions Architect Certificate')
formData.append(
  'description',
  'Professional certification for cloud architecture'
)
formData.append('issuedYear', '2023')
formData.append('issuingOrganization', 'Amazon Web Services')

const response = await fetch('/api/mentor-applications/app-123/documents', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
})

const document = await response.json()
console.log('Uploaded:', document.id)
```

### Admin Verify Document

```typescript
await fetch('/api/admin/mentor-applications/app-123/documents/doc-123/verify', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    verified: true,
    notes: 'Certificate verified successfully'
  })
})
```

## Error Codes

- `400` - Invalid file, size exceeded, max documents reached
- `403` - Not authorized, email not verified
- `404` - Application/Document not found
- `409` - Conflict (e.g., cannot upload to approved application)

## Notes

- Documents được load tự động khi fetch application
- Empty array `[]` được trả về cho application mới tạo (chưa có documents)
- Documents có `displayOrder` để sắp xếp thứ tự hiển thị
- Admin có thể xem verification details (notes, verifiedBy, verifiedAt)
