# Mentorship Matching System

A comprehensive mentorship platform enabling students to connect with mentors through an application, matching, and scheduling system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Mentorship System                           │
├─────────────────────────────────────────────────────────────────────┤
│  MentorApplications → MentorProfiles → Recommendations              │
│         ↓                    ↓              ↓                       │
│  (Admin Review)        (Availability)  (Student Preferences)        │
│         ↓                    ↓              ↓                       │
│  MentorshipRequests → Meetings → Mentorships → Messages             │
│         ↓                ↓           ↓           ↓                  │
│  (Scheduler)        (No Double   (Lifecycle)  (Threads)             │
│                      Booking)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Modules

| Module | Description |
|--------|-------------|
| `mentor-applications` | Mentor application submission and review |
| `mentor-profiles` | Mentor profiles and availability management |
| `student-preferences` | Versioned student preference storage |
| `recommendations` | Mentor-student matching and scoring |
| `mentorship-requests` | Booking request management |
| `meetings` | Meeting scheduling with double-booking prevention |
| `mentorships` | Mentorship lifecycle management |
| `messages` | Thread-based messaging system |
| `notifications` | In-app notification system |
| `scheduler` | Background jobs for expiry and reminders |

## Roles

| Role | Permissions |
|------|-------------|
| `student` | Submit applications, set preferences, request mentors, view public profiles, send messages |
| `mentor` | Update profile, set availability, accept/decline requests, manage meetings |
| `admin` | Review applications, revoke mentor status, force end mentorships, view audit logs |

## API Endpoints

### Mentor Applications
```
POST   /mentor-applications         # Submit application
GET    /mentor-applications/mine    # Get my applications
GET    /mentor-applications/:id     # Get application details
DELETE /mentor-applications/:id     # Withdraw application
```

### Mentor Profiles
```
GET    /mentor-profiles             # Search/list mentors
GET    /mentor-profiles/:id         # View public profile
GET    /mentor-profiles/me          # Get my profile (mentor)
PUT    /mentor-profiles/me          # Update my profile (mentor)
PUT    /mentor-profiles/me/availability  # Set availability (mentor)
```

### Student Preferences
```
PUT    /student-preferences         # Create/update preferences
GET    /student-preferences         # Get latest preferences
GET    /student-preferences/history # Get version history
```

### Recommendations
```
GET    /recommendations             # Get ranked mentor recommendations
GET    /recommendations/mentor/:id  # Get match score for specific mentor
```

### Mentorship Requests
```
POST   /mentorship-requests         # Create request
GET    /mentorship-requests         # List my requests
GET    /mentorship-requests/:id     # Get request details
POST   /mentorship-requests/:id/accept   # Accept (mentor)
POST   /mentorship-requests/:id/decline  # Decline (mentor)
DELETE /mentorship-requests/:id     # Cancel (student)
```

### Meetings
```
GET    /meetings                    # List my meetings
GET    /meetings/:id                # Get meeting details
POST   /meetings/:id/reschedule     # Reschedule meeting
POST   /meetings/:id/cancel         # Cancel meeting
POST   /meetings/:id/complete       # Mark as completed
```

### Mentorships
```
GET    /mentorships                 # List my mentorships
GET    /mentorships/:id             # Get mentorship details
POST   /mentorships/:id/end         # End mentorship
```

### Messages
```
GET    /threads/:type/:id/messages  # Get thread messages
POST   /threads/:type/:id/messages  # Send message
POST   /threads/:type/:id/mark-read # Mark thread as read
```

### Notifications
```
GET    /notifications               # List notifications
GET    /notifications/unread-count  # Get unread count
POST   /notifications/mark-read     # Mark as read
```

### Admin Endpoints
```
GET    /admin/mentor-applications   # List all applications
GET    /admin/mentor-applications/:id  # Get application with history
POST   /admin/mentor-applications/:id/review     # Approve/decline
POST   /admin/mentor-applications/:id/under-review  # Mark under review
POST   /admin/users/:id/revoke-mentor  # Revoke mentor status
POST   /admin/mentorships/:id/force-end  # Force end mentorship
GET    /admin/audit-logs            # View audit logs
```

## Configuration

Environment variables for the mentorship system:

```env
# Request expiry (hours until pending requests auto-expire)
MENTORSHIP_REQUEST_EXPIRY_HOURS=72

# Reapply cooldown (days after decline before user can reapply)
MENTOR_REAPPLY_COOLDOWN_DAYS=30

# Maximum message length
MAX_MESSAGE_LENGTH=5000

# Default meeting duration in minutes
DEFAULT_MEETING_DURATION_MINUTES=60

# Hours before meeting to send reminder
MEETING_REMINDER_HOURS=24
```

## Request Status Flow

```
pending → accepted → (creates meeting)
        → declined
        → cancelled (by student)
        → expired (auto, via scheduler)
```

## Meeting Status Flow

```
scheduled → rescheduled → completed
          → cancelled
```

## Mentorship Status Flow

```
active → ended (by participant or admin)
       → paused (future feature)
```

## Double-Booking Prevention

The system uses PostgreSQL exclusion constraints to prevent mentor double-booking:

```sql
ALTER TABLE "meetings" 
ADD CONSTRAINT "meeting_no_overlap" 
EXCLUDE USING gist (
  mentor_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status IN ('scheduled', 'rescheduled'))
```

## Gemini Integration (Future)

The recommendations module uses a `ScoringStrategy` interface for pluggable scoring:

```typescript
interface ScoringStrategy {
  score(preferences: StudentPreferenceData, mentor: MentorProfile): Promise<ScoringResult>;
  getName(): string;
}
```

To integrate Gemini AI scoring:

1. Create `GeminiScoringStrategy` implementing `ScoringStrategy`
2. Use existing `genai` config from `app.config.ts`:
   - `GENAI_API_KEY`
   - `GENAI_MODEL`
   - `GENAI_TEMPERATURE`
3. Build prompt describing student preferences and mentor profile
4. Parse Gemini response for score and reasons
5. Swap strategy via dependency injection or feature flag

Example implementation approach:
```typescript
const prompt = `
Score mentor-student compatibility (0-100):
Student: domains=${preferences.domains}, goals=${preferences.goals}
Mentor: expertise=${mentor.expertise}, skills=${mentor.skills}
Return JSON: { score: number, reasons: string[] }
`;
```

## Rate Limiting

Endpoint-specific rate limits:
- `POST /mentor-applications`: 10 requests/hour
- `POST /mentorship-requests`: 10 requests/hour
- `POST /threads/:type/:id/messages`: 60 messages/minute

## Background Jobs

The scheduler module runs these cron jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| `expireStaleRequests` | Every hour | Expires pending requests past expiry time |
| `sendMeetingReminders` | Every 30 min | Sends reminders for upcoming meetings |
| `cleanupOldNotifications` | Daily at 3 AM | Removes read notifications older than 90 days |

## Audit Logging

All state transitions are logged with:
- `actor_id`: User who performed the action
- `action`: Action type (e.g., `application_approved`)
- `entity_type`: Entity type (e.g., `mentor_application`)
- `entity_id`: Entity UUID
- `changes`: JSON diff of changes
- `metadata`: Additional context

## Security & RBAC

### Role-Based Access Control
- **Admin**: Full access to all endpoints; can review applications, revoke mentor status, force end mentorships, view audit logs
- **Mentor**: Can update profile, manage availability, accept/decline requests, reschedule/cancel meetings
- **Student**: Can submit preferences, search mentors, create requests, view own mentorships

### Admin Protection
**Important:** Administrators are prevented from applying to be mentors to preserve their administrative privileges.

- When an admin attempts to apply, they receive a `403 Forbidden` error with message: "Administrators cannot apply to be mentors. Admin privileges supersede mentor roles."
- During the approval process, an additional safety check verifies the applicant's current role. If an admin user somehow has a pending application, approval will fail with a `400 Bad Request` error.
- This prevents accidental role demotion where an admin would lose their administrative privileges by becoming a mentor.

### Data Privacy
- Declined application reasons are **not** visible to students (only to admins and via specific participant access)
- Admin notes on applications are **only** visible to administrators
- Message threads enforce participant-only access (sender, recipient, or admin)
- Personal data (email, phone) is protected by RBAC guards

## Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Coverage
yarn test:cov
```

## Migration

Run the migration to create mentorship tables:

```bash
yarn migration:run
```

To revert:
```bash
yarn migration:revert
```

