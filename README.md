# Pathfinder - Backend

A NestJS backend for career pathfinding with assessments, roadmaps, and mentorship matching.

## Features

- **Authentication**: JWT-based auth with role-based access control (student, mentor, admin)
- **Assessments**: AI-generated skill assessments with Gemini integration
- **Roadmaps**: Personalized learning paths
- **Mentorship System**: Complete mentor-student matching platform

## Mentorship System

The mentorship module enables students to connect with mentors through:

- **Mentor Applications**: Users apply to become mentors; admins review and approve
- **Mentor Profiles**: Mentors maintain public profiles with expertise, skills, and availability
- **Student Preferences**: Students define their mentoring needs and goals
- **Recommendations**: Rule-based (+ Gemini-ready) mentor matching
- **Booking**: Multi-slot requests with mentor acceptance
- **Meetings**: Scheduling with double-booking prevention
- **Messaging**: Thread-based communication for applications, requests, and mentorships
- **Notifications**: In-app notifications for all key events

See [Mentorship README](src/modules/mentorship/README.md) for detailed documentation.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Yarn 4.x

### Installation

```bash
yarn install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=pathfinder

# JWT
JWT_SECRET=your-32-char-secret-key-here

# Email Verification
EMAIL_VERIFICATION_REQUIRED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS=24

# IP Tracking & Privacy (GDPR-compliant)
IP_HASH_SALT=your-random-salt-string-min-16-chars

# Content Validation for Mentor Applications
CONTENT_VALIDATION_ENABLED=true
MIN_CONTENT_QUALITY_SCORE=60
SPAM_KEYWORDS=buy now,click here,limited offer,click below,act now

# Gemini AI
GENAI_API_KEY=your_api_key

# Mentorship (optional - defaults shown)
MENTORSHIP_REQUEST_EXPIRY_HOURS=72
MENTOR_REAPPLY_COOLDOWN_DAYS=30
MAX_MESSAGE_LENGTH=5000
IP_BASED_RATE_LIMIT_PER_WEEK=10
```

### Database Migration

```bash
yarn migration:run
```

### Running

```bash
# Development
yarn dev

# Production
yarn build
yarn start
```

### Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Coverage
yarn test:cov
```

## API Documentation

Swagger documentation is available at `/api/docs` when `ENABLE_SWAGGER=true`.

## User Roles & Registration

### Default Role on Registration
All new user registrations are automatically assigned the **STUDENT** role by default. This ensures secure role management and prevents privilege escalation during registration.

### Role Hierarchy
- **STUDENT** (default) - Can search mentors, create requests, participate in mentorships
- **MENTOR** - Granted through application approval, can update profiles and accept requests
- **ADMIN** - Full system access, manages applications and mentorships

### Role Transitions
- **Student → Mentor**: Submit and get approval for a mentor application
- **Admin Protection**: Administrators cannot apply to become mentors to preserve their administrative privileges

## Mentor Application Security

To prevent fake mentor applications, the system implements multiple security layers:

### 1. Email Verification (Required)
- All users must verify their email address before applying to become a mentor
- Verification emails expire after 24 hours (configurable)
- Users can resend verification emails with rate limiting (2-minute cooldown)

### 2. Rate Limiting
- **Per-user**: 5 applications per week (enforced via @Throttle decorator)
- **Per-IP**: 10 applications per week from the same IP address (configurable)

### 3. IP-Based Tracking
- Client IP addresses are hashed using SHA-256 with a configurable salt
- GDPR-compliant: stores only hashed IPs, never plain IPs
- Admins can view IP hash statistics to identify suspicious patterns

### 4. Content Quality Validation
Applications are automatically scanned for:
- Repeated characters (spam detection)
- Spam keywords (configurable list)
- Suspicious URLs (non-HTTPS, URL shorteners)
- Low word diversity (copy-paste detection)
- Excessive special characters
- Gibberish content (vowel/consonant ratio analysis)

Applications flagged by content validation receive a quality score (0-100). If the score is below the threshold (default: 60), the application is marked as **FLAGGED** and requires additional admin review before entering the normal approval queue.

### 5. Admin Review Tools
Admins have access to:
- `/admin/applications/flagged` - List all flagged applications with content flags
- `/admin/applications/:id/unflag` - Manually move flagged application to PENDING status
- `/admin/applications/ip-statistics` - View IP hashes with multiple applications

### Security Configuration
See environment variables above for:
- `EMAIL_VERIFICATION_REQUIRED` - Enforce email verification
- `IP_HASH_SALT` - Salt for IP hashing (min 16 characters)
- `CONTENT_VALIDATION_ENABLED` - Enable/disable content validation
- `MIN_CONTENT_QUALITY_SCORE` - Threshold for flagging (0-100)
- `SPAM_KEYWORDS` - Comma-separated list of spam keywords
- `IP_BASED_RATE_LIMIT_PER_WEEK` - Max applications per IP hash per week

## Project Structure

```
src/
├── common/           # Shared entities, services, filters
├── config/           # App configuration
├── migrations/       # TypeORM migrations
└── modules/
    ├── admin/        # Admin dashboard and management
    ├── assessments/  # Skill assessments
    ├── auth/         # Authentication
    ├── mail/         # Email service
    ├── meetings/     # Meeting scheduling
    ├── mentor-applications/   # Mentor applications
    ├── mentor-profiles/       # Mentor profiles
    ├── mentorship-requests/   # Booking requests
    ├── mentorships/  # Mentorship lifecycle
    ├── messages/     # Thread messaging
    ├── notifications/ # In-app notifications
    ├── recommendations/       # Mentor matching
    ├── roadmaps/     # Learning roadmaps
    ├── scheduler/    # Background jobs
    ├── student-preferences/   # Student preferences
    └── users/        # User management
```

## License

See [LICENSE](LICENSE) file.
