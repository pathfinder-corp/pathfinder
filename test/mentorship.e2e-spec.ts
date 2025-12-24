import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'

describe('Mentorship Flow (e2e)', () => {
  let app: INestApplication
  let studentToken: string
  let mentorToken: string
  let adminToken: string
  let studentId: string
  let mentorId: string
  let applicationId: string
  let requestId: string
  let mentorshipId: string

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

    // Register student
    const studentRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `student-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'Student'
      })
      .expect(201)

    studentToken = studentRegister.body.accessToken
    studentId = studentRegister.body.user.id

    // Register mentor (will become mentor after approval)
    const mentorRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `mentor-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'Mentor'
      })
      .expect(201)

    mentorToken = mentorRegister.body.accessToken
    mentorId = mentorRegister.body.user.id

    // Note: In a real test, you'd need to create an admin user
    // For now, we'll skip admin-specific tests or use a seeded admin
  }, 30000)

  afterAll(async () => {
    await app.close()
  })

  describe('Mentor Application Flow', () => {
    it('should submit a mentor application', async () => {
      const response = await request(app.getHttpServer())
        .post('/mentor-applications')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          headline: 'Senior Software Engineer with 10 years experience',
          bio: 'I have extensive experience in software development and enjoy mentoring junior developers to help them grow in their careers.',
          expertise: [
            'Software Engineering',
            'System Design',
            'Career Development'
          ],
          skills: ['TypeScript', 'Node.js', 'React', 'AWS', 'PostgreSQL'],
          industries: ['FinTech', 'SaaS', 'E-commerce'],
          languages: ['English', 'Spanish'],
          yearsExperience: 10,
          motivation:
            'I want to give back to the community and help the next generation of developers succeed in their careers.'
        })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.status).toBe('pending')
      applicationId = response.body.id
    })

    it('should get my applications', async () => {
      const response = await request(app.getHttpServer())
        .get('/mentor-applications/mine')
        .set('Authorization', `Bearer ${mentorToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it('should not allow duplicate pending applications', async () => {
      await request(app.getHttpServer())
        .post('/mentor-applications')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          headline: 'Another application',
          bio: 'This should fail because I already have a pending application.',
          expertise: ['Testing'],
          skills: ['Jest'],
          languages: ['English'],
          yearsExperience: 5,
          motivation: 'Testing duplicate prevention'
        })
        .expect(409) // Conflict
    })
  })

  describe('Notifications', () => {
    it('should get notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${mentorToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('notifications')
      expect(response.body).toHaveProperty('unreadCount')
    })

    it('should get unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${mentorToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('count')
    })

    it('should mark notifications as read', async () => {
      const response = await request(app.getHttpServer())
        .post('/notifications/mark-read')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({})
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('Mentor Profiles (Search)', () => {
    it('should search for mentors', async () => {
      const response = await request(app.getHttpServer())
        .get('/mentor-profiles')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('mentors')
      expect(response.body).toHaveProperty('total')
    })

    it('should search with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/mentor-profiles')
        .query({
          skills: 'TypeScript,Node.js',
          languages: 'English',
          limit: 10
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('mentors')
    })
  })

  describe('Mentorships (Viewing)', () => {
    it('should list mentorships', async () => {
      const response = await request(app.getHttpServer())
        .get('/mentorships')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('mentorships')
      expect(response.body).toHaveProperty('total')
    })

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/mentorships')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('mentorships')
    })
  })

  describe('Application Withdrawal', () => {
    it('should allow withdrawing pending application', async () => {
      // First, register a new user and create an application
      const newUserRegister = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `withdraw-test-${Date.now()}@example.com`,
          password: 'Test1234!',
          firstName: 'Withdraw',
          lastName: 'Test'
        })
        .expect(201)

      const newToken = newUserRegister.body.accessToken

      // Submit application
      const appResponse = await request(app.getHttpServer())
        .post('/mentor-applications')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          headline: 'Application to withdraw',
          bio: 'This application will be withdrawn to test the withdrawal flow.',
          expertise: ['Testing'],
          skills: ['Jest', 'Cypress'],
          languages: ['English'],
          yearsExperience: 3,
          motivation: 'Testing the withdrawal functionality'
        })
        .expect(201)

      const appId = appResponse.body.id

      // Withdraw the application
      await request(app.getHttpServer())
        .delete(`/mentor-applications/${appId}`)
        .set('Authorization', `Bearer ${newToken}`)
        .expect(204)
    })
  })

  describe('Unauthorized Access', () => {
    it('should reject requests without auth token', async () => {
      await request(app.getHttpServer())
        .get('/mentor-applications/mine')
        .expect(401)
    })

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/mentor-applications/mine')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })
})
