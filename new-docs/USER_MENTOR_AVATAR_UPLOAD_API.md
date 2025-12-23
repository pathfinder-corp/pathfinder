## Avatar Upload API for Students & Mentors

Tài liệu này mô tả API cho **upload avatar** của user (student hoặc mentor).  
Mentor profile sử dụng cùng avatar với `User` (`user.avatar`), nên chỉ cần upload 1 lần cho user là đủ.

---

## 1. Mô hình dữ liệu liên quan

### 1.1. User entity

```ts
export class User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'mentor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;          // URL ảnh avatar (ImageKit)
  createdAt: Date;
  updatedAt: Date;
  // ...
}
```

### 1.2. UserResponseDto (API response)

```ts
export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'mentor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;       // FE sử dụng field này để hiển thị avatar
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

> Mentor profile (bên module `mentor-profiles`) không có field avatar riêng, mà các màn hình mentor đang hiển thị avatar từ `user.avatar`.

---

## 2. REST API – Upload avatar cho current user

### 2.1. Endpoint

```http
POST /api/users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### 2.2. Request Body (multipart/form-data)

- **Fields:**

```ts
{
  file: File;   // Bắt buộc - ảnh avatar
}
```

- Yêu cầu:
  - `file` là **ảnh**:
    - MIME type bắt đầu bằng `image/` (ví dụ: `image/jpeg`, `image/png`, `image/gif`, `image/webp`).
  - Kích thước:
    - `size` ≤ `UPLOAD_MAX_FILE_SIZE_BYTES` (default 5MB, cấu hình trong env).

### 2.3. Ví dụ request (frontend)

```ts
async function uploadAvatar(file: File): Promise<UserResponseDto> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/users/me/avatar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Avatar upload failed');
  }

  const user: UserResponseDto = await res.json();
  return user;
}
```

### 2.4. Response

```ts
// 201 Created
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "mentor",
  "status": "active",
  "avatar": "https://ik.imagekit.io/.../optimized-avatar.jpg",
  "emailVerified": true,
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-02T12:00:00.000Z"
}
```

Back-end sẽ:

1. Validate file:
   - Bắt buộc có file.
   - `size > 0`.
   - `size <= upload.maxFileSizeBytes`.
   - `mimetype` bắt đầu bằng `'image/'`.
2. Kiểm tra ImageKit:
   - Nếu `ImageKitService.isEnabled() === false` → trả lỗi.
3. Upload lên ImageKit:
   - Folder: `/avatars/users/{userId}`.
   - Tags: `['avatar', userId]`.
4. Lấy URL tối ưu:
   - Dùng `ImageKitService.getOptimizedUrl(filePath, 512)` để generate URL cho web.
5. Gán `user.avatar = optimizedUrl` và lưu user.

---

## 3. Error handling

Các lỗi có thể gặp:

- `400 Bad Request`:
  - `File is required`
  - `File is empty`
  - `Avatar size exceeds maximum allowed size of ... bytes`
  - `Only image files are allowed for avatar`
  - `Avatar upload service is not available. Please contact administrator.`
- `401 Unauthorized`:
  - Không có/invalid token.
- `404 Not Found`:
  - User không tồn tại (trường hợp rất hiếm khi token không sync).
- `500 Internal Server Error`:
  - Lỗi từ ImageKit hoặc hệ thống.

Frontend nên:

- Đọc message lỗi và hiển thị thông báo thân thiện:
  - Ví dụ nếu chứa `'Only image files are allowed for avatar'` → "Chỉ hỗ trợ upload file ảnh".
  - Nếu size vượt quá → "Ảnh quá lớn, tối đa 5MB".

---

## 4. Hướng dẫn implement trên frontend

### 4.1. Component upload avatar

Pseudo-code (React):

```tsx
function AvatarUploader({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const updated = await uploadAvatar(file);
      onUpdated(updated);
      // Cập nhật store user/global state nếu có
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      // show toast
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="relative w-24 h-24 rounded-full overflow-hidden">
        <img
          src={user.avatar || '/default-avatar.png'}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
        <label className="absolute bottom-0 right-0 p-2 bg-black/60 text-white text-xs cursor-pointer">
          Change
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
}
```

### 4.2. Đồng bộ avatar trên toàn app

- Sau khi API trả về `UserResponseDto` với `avatar` mới:
  - Cập nhật **global user store** (ví dụ `useUserStore` / context) để:
    - Header/avatar corner,
    - Chat,
    - Mentor profile UI,
    - v.v. cùng update ngay.

### 4.3. Mentor Profile UI

- Tại các màn hiển thị mentor:
  - Sử dụng `mentor.user.avatar` hoặc trực tiếp `conversation.participant*.avatar` như hiện tại.
- Không cần thêm API riêng cho avatar mentor profile; chỉ cần dùng avatar của `User`.

---

## 5. Tóm tắt

- **Một API duy nhất** để upload avatar: `POST /users/me/avatar`.
- Áp dụng cho cả **student** và **mentor** (vì avatar nằm trên entity `User`).
- File phải là **image**, tuân thủ kích thước giới hạn, được upload lên ImageKit.
- FE:
  - Gửi `multipart/form-data` với field `file`.
  - Cập nhật global user khi response trả về để đồng bộ avatar trên toàn UI.