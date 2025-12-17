import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'

describe('AssessmentsController (e2e)', () => {
  let app: INestApplication
  let authToken: string
  let assessmentId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    )
    await app.init()

    // Register a test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'User'
      })
      .expect(201)

    authToken = registerResponse.body.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  describe('/assessments (POST)', () => {
    it('should create a new assessment', async () => {
      const response = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domain: 'TypeScript fundamentals',
          difficulty: 'medium',
          questionCount: 10
        })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.domain).toBe('TypeScript fundamentals')
      expect(response.body.difficulty).toBe('medium')
      expect(response.body.questionCount).toBe(10)
      expect(response.body.status).toBe('pending')
      expect(Array.isArray(response.body.questions)).toBe(true)
      expect(response.body.questions.length).toBe(10)

      assessmentId = response.body.id
    })

    it('should reject invalid domain', async () => {
      await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domain: 'dating advice',
          difficulty: 'medium',
          questionCount: 10
        })
        .expect(400)
    })

    it('should reject requests without auth', async () => {
      await request(app.getHttpServer())
        .post('/assessments')
        .send({
          domain: 'JavaScript',
          difficulty: 'easy',
          questionCount: 10
        })
        .expect(401)
    })
  })

  describe('/assessments (GET)', () => {
    it('should return user assessments', async () => {
      const response = await request(app.getHttpServer())
        .get('/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it('should reject requests without auth', async () => {
      await request(app.getHttpServer()).get('/assessments').expect(401)
    })
  })

  describe('/assessments/:id (GET)', () => {
    it('should return specific assessment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.id).toBe(assessmentId)
      expect(response.body).toHaveProperty('domain')
      expect(response.body).toHaveProperty('questions')
    })

    it('should return 404 for non-existent assessment', async () => {
      await request(app.getHttpServer())
        .get('/assessments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('/assessments/:id/start (POST)', () => {
    it('should start an assessment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/assessments/${assessmentId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.status).toBe('in_progress')
    })
  })

  describe('/assessments/:id/answers (POST)', () => {
    it('should submit an answer', async () => {
      // First get the assessment to get a question ID
      const assessmentResponse = await request(app.getHttpServer())
        .get(`/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const questionId = assessmentResponse.body.questions[0].id

      const response = await request(app.getHttpServer())
        .post(`/assessments/${assessmentId}/answers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId,
          selectedAnswerIndex: 0,
          timeSpent: 30
        })
        .expect(200)

      expect(response.body).toHaveProperty('isCorrect')
      expect(typeof response.body.isCorrect).toBe('boolean')
    })

    it('should reject duplicate answer submission', async () => {
      const assessmentResponse = await request(app.getHttpServer())
        .get(`/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)

      const questionId = assessmentResponse.body.questions[0].id

      await request(app.getHttpServer())
        .post(`/assessments/${assessmentId}/answers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId,
          selectedAnswerIndex: 0
        })
        .expect(400)
    })
  })

  describe('/assessments/:id (DELETE)', () => {
    it('should delete an assessment', async () => {
      // Create a new assessment to delete
      const createResponse = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domain: 'Python basics',
          difficulty: 'easy',
          questionCount: 10
        })
        .expect(201)

      const newAssessmentId = createResponse.body.id

      await request(app.getHttpServer())
        .delete(`/assessments/${newAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/assessments/${newAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })
})
