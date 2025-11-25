# AI-Generated Assessment Feature

## Overview

This module provides a comprehensive AI-powered assessment system that allows users to test their knowledge in various domains, topics, or skills. The system generates multiple-choice questions using Google Gemini AI, tracks user responses, provides detailed feedback, and suggests personalized learning roadmaps.

## Features

- **AI-Generated Questions**: Automatically generate 10-20 multiple-choice questions on any educational topic
- **Difficulty Levels**: Choose between easy, medium (default), or hard difficulty
- **Randomized Questions**: Questions and answer options are randomized for fairness
- **Real-time Feedback**: Get immediate feedback on whether answers are correct
- **Detailed Results**: Comprehensive performance analysis with AI-generated insights
- **Roadmap Suggestions**: Automatic generation of personalized learning roadmaps based on weak areas
- **Sharing**: Share assessments with specific users or make them publicly accessible
- **Analytics**: Long-term storage of assessment history for progress tracking

## API Endpoints

### Assessment Management

#### Create Assessment
```http
POST /assessments
Authorization: Bearer {token}
Content-Type: application/json

{
  "domain": "JavaScript fundamentals",
  "difficulty": "medium",  // optional: "easy" | "medium" | "hard"
  "questionCount": 15      // optional: 10-20
}
```

**Response**: Assessment object with questions (without correct answers)

#### Get User's Assessments
```http
GET /assessments
Authorization: Bearer {token}
```

**Response**: Array of assessment objects

#### Get Specific Assessment
```http
GET /assessments/:id
Authorization: Bearer {token}
```

**Response**: Assessment details with questions

#### Delete Assessment
```http
DELETE /assessments/:id
Authorization: Bearer {token}
```

**Response**: 204 No Content

### Taking Assessments

#### Start Assessment
```http
POST /assessments/:id/start
Authorization: Bearer {token}
```

**Response**: Assessment object with status "in_progress"

#### Submit Answer
```http
POST /assessments/:id/answers
Authorization: Bearer {token}
Content-Type: application/json

{
  "questionId": "uuid",
  "selectedAnswerIndex": 2,  // 0-3
  "timeSpent": 45            // optional: seconds
}
```

**Response**: `{ "isCorrect": true }`

#### Complete Assessment
```http
POST /assessments/:id/complete
Authorization: Bearer {token}
```

**Response**: Full results with AI analysis and roadmap suggestions

### Results

#### Get Results
```http
GET /assessments/:id/results
Authorization: Bearer {token}
```

**Response**: Complete results including:
- Score and statistics
- AI-generated performance summary
- Question-by-question breakdown with explanations
- Suggested learning roadmaps

### Sharing

#### Get Sharing Configuration
```http
GET /assessments/:id/share
Authorization: Bearer {token}
```

**Response**: Current sharing settings

#### Update Sharing Settings
```http
POST /assessments/:id/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "shareWithAll": false,
  "userIds": ["user-uuid-1", "user-uuid-2"]
}
```

**Response**: Updated sharing configuration

#### Revoke User Access
```http
DELETE /assessments/:id/share/:userId
Authorization: Bearer {token}
```

**Response**: 204 No Content

## Database Schema

### Tables

1. **assessments**
   - id (UUID, PK)
   - user_id (UUID, FK → users)
   - domain (string)
   - difficulty (enum: easy, medium, hard)
   - question_count (integer, 10-20)
   - status (enum: pending, in_progress, completed)
   - is_shared_with_all (boolean)
   - created_at, updated_at (timestamps)

2. **assessment_questions**
   - id (UUID, PK)
   - assessment_id (UUID, FK → assessments)
   - question_text (text)
   - options (jsonb, array of 4 strings)
   - correct_answer_index (integer, 0-3)
   - explanation (text)
   - order_index (integer)
   - resources (jsonb, array of resource objects)

3. **assessment_responses**
   - id (UUID, PK)
   - assessment_id (UUID, FK → assessments)
   - question_id (UUID, FK → assessment_questions)
   - selected_answer_index (integer, 0-3)
   - is_correct (boolean)
   - time_spent (integer, nullable)
   - created_at (timestamp)
   - UNIQUE constraint: (assessment_id, question_id)

4. **assessment_results**
   - id (UUID, PK)
   - assessment_id (UUID, FK → assessments, UNIQUE)
   - score (decimal, 0-100)
   - correct_count (integer)
   - total_questions (integer)
   - summary (jsonb, performance analysis)
   - suggested_roadmaps (jsonb, array of roadmap suggestions)
   - completed_at (timestamp)

5. **assessment_shares**
   - id (UUID, PK)
   - assessment_id (UUID, FK → assessments)
   - shared_with_user_id (UUID, FK → users)
   - created_at (timestamp)
   - UNIQUE constraint: (assessment_id, shared_with_user_id)

## Services

### AssessmentsService
Main orchestrator for assessment lifecycle:
- Generates assessments via AI
- Manages CRUD operations
- Handles answer submission
- Enforces access control

### AssessmentResultsService
Handles completion and analysis:
- Calculates scores and statistics
- Generates AI performance summaries
- Creates roadmap suggestions
- Provides detailed result breakdowns

### AssessmentSharingService
Manages sharing permissions:
- Configure public/private sharing
- Share with specific users
- Revoke access
- Query sharing state

### AssessmentContentPolicyService
Content safety and validation:
- Validates domain/topic inputs
- Filters harmful content
- Ensures educational focus
- Reviews AI-generated questions

## Usage Example

```typescript
// 1. Create an assessment
const assessment = await POST('/assessments', {
  domain: 'React Hooks',
  difficulty: 'medium',
  questionCount: 15
})

// 2. Start the assessment
await POST(`/assessments/${assessment.id}/start`)

// 3. Submit answers for each question
for (const question of assessment.questions) {
  await POST(`/assessments/${assessment.id}/answers`, {
    questionId: question.id,
    selectedAnswerIndex: userChoice,
    timeSpent: timeInSeconds
  })
}

// 4. Complete and get results
const results = await POST(`/assessments/${assessment.id}/complete`)

// Results include:
// - score: 86.67
// - correctCount: 13
// - totalQuestions: 15
// - summary: AI-generated performance analysis
// - questionBreakdown: Detailed review of each question
// - suggestedRoadmaps: Personalized learning paths

// 5. Share assessment (optional)
await POST(`/assessments/${assessment.id}/share`, {
  shareWithAll: false,
  userIds: ['friend-user-id']
})
```

## AI Integration

The module uses Google Gemini AI for three key functions:

1. **Question Generation**: Creates relevant, accurate multiple-choice questions tailored to the domain and difficulty level
2. **Performance Analysis**: Analyzes user responses to identify strengths and weaknesses
3. **Roadmap Suggestions**: Recommends personalized learning paths based on assessment results

All AI interactions include content safety filters to ensure educational appropriateness.

## Testing

### Unit Tests
- `assessments.service.spec.ts`: Core service logic
- `assessment-content-policy.service.spec.ts`: Content validation
- `assessment-sharing.service.spec.ts`: Sharing functionality

### Integration Tests
- `test/assessments.e2e-spec.ts`: End-to-end API testing

Run tests:
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Migration

Run the database migration to create all necessary tables:

```bash
npm run migration:run
```

Migration file: `src/migrations/1732617600000-CreateAssessmentTables.ts`

## Security

- **Authentication**: All endpoints require JWT authentication
- **Authorization**: Owner-only operations (delete, share management)
- **Content Filtering**: Validates against harmful/inappropriate content
- **Rate Limiting**: Protected by application-wide throttler
- **Access Control**: Sharing-based permissions for viewing assessments
- **SQL Injection Prevention**: TypeORM parameterized queries

## Configuration

Required environment variables (already configured in existing `.env`):
- `GENAI_API_KEY`: Google Gemini API key
- `GENAI_MODEL`: Model name (default: gemini-2.5-flash)
- `GENAI_TEMPERATURE`: Creativity control (default: 0.4)
- `GENAI_TOP_P`: Nucleus sampling (default: 0.95)
- `GENAI_TOP_K`: Token limit (default: 32)
- `GENAI_MAX_OUTPUT_TOKENS`: Max response tokens (default: 32768)

## Architecture Notes

- **Standalone Module**: Fully independent, can be used without other features
- **Consistent Patterns**: Follows the same architecture as RoadmapsModule
- **Type Safety**: Comprehensive TypeScript types and DTOs
- **Validation**: Class-validator decorators on all inputs
- **Documentation**: Swagger/OpenAPI annotations on all endpoints
- **Error Handling**: Consistent exception handling with meaningful messages


