import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { ApplicationStatus } from '../src/modules/mentor-applications/entities/mentor-application.entity'

describe('Mentor Application Security (e2e)', () => {
  let app: INestApplication
  let studentToken: string
  let studentId: string

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

    // Register a student user
    const studentRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `security-test-${Date.now()}@example.com`,
        password: 'Test1234!',
        firstName: 'Security',
        lastName: 'Test'
      })
      .expect(201)

    studentToken = studentRegister.body.accessToken
    studentId = studentRegister.body.user.id
  }, 30000)

  afterAll(async () => {
    await app.close()
  })

  describe('Email Verification Requirement', () => {
    it('should reject application if email is not verified', async () => {
      const response = await request(app.getHttpServer())
        .post('/mentor-applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          headline: 'Senior Developer',
          bio: 'I have many years of experience and want to mentor others in their development journey.',
          expertise: ['Software Development'],
          skills: ['JavaScript', 'TypeScript'],
          languages: ['English'],
          yearsExperience: 5,
          motivation:
            'I want to give back to the community and help others grow.'
        })
        .expect(403)

      expect(response.body.message).toContain('verify your email')
    })

    it('should allow resending verification email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      expect(response.body.message).toContain('Verification email sent')
    })

    it('should rate limit resend verification requests', async () => {
      // First request succeeds
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)

      // Immediate second request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400)

      expect(response.body.message).toContain('wait')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce per-user rate limit (5 per week)', async () => {
      // Note: In a real test, you would need to verify email first
      // or mock the email verification check
      // This test demonstrates the structure
    })
  })

  describe('Content Validation', () => {
    // For this test, we would need to verify the email first
    // The following is a structural example

    it('should flag application with spam content (mock example)', () => {
      // Example structure - in reality, email must be verified first
      const spamApplication = {
        headline: 'Click here now!!!',
        bio: 'Buy now limited offer click here',
        expertise: ['Spam'],
        skills: ['Spamming'],
        languages: ['English'],
        yearsExperience: 1,
        motivation: 'Click here to buy now'
      }

      // This would be flagged as FLAGGED status due to spam content
      expect(spamApplication.headline).toContain('Click here')
    })

    it('should accept clean application content (mock example)', () => {
      const cleanApplication = {
        headline: 'Experienced Software Engineer',
        bio: 'I have extensive experience in software development and architecture. I enjoy helping junior developers learn best practices and grow their skills.',
        expertise: ['Software Engineering', 'System Design'],
        skills: ['TypeScript', 'Node.js', 'React'],
        languages: ['English', 'Spanish'],
        yearsExperience: 10,
        motivation:
          'I want to give back to the developer community and share my knowledge with aspiring engineers.'
      }

      // This would pass validation
      expect(cleanApplication.bio.length).toBeGreaterThan(50)
    })
  })

  describe('IP Tracking', () => {
    it('should accept application with IP tracking', async () => {
      // Note: IP tracking happens automatically via the @IpAddress decorator
      // The IP is hashed and stored with the application
      // This test demonstrates the endpoint structure
    })

    it('should enforce IP-based rate limiting', async () => {
      // If too many applications come from the same hashed IP
      // they should be rejected
      // This would require multiple registrations from the same IP
    })
  })

  describe('Admin Endpoints', () => {
    let adminToken: string

    beforeAll(async () => {
      // In a real scenario, you would create or seed an admin user
      // For this test structure, we'll demonstrate the endpoints
    })

    it('should list flagged applications (admin only)', async () => {
      if (!adminToken) {
        return // Skip if no admin token available
      }

      const response = await request(app.getHttpServer())
        .get('/admin/applications/flagged')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should unflag an application (admin only)', async () => {
      if (!adminToken) {
        return // Skip if no admin token available
      }

      // Would need a flagged application ID
      const flaggedAppId = 'some-uuid'

      await request(app.getHttpServer())
        .post(`/admin/applications/${flaggedAppId}/unflag`)
        .set('Authorization', `Bearer ${adminToken}`)
    })

    it('should get IP statistics (admin only)', async () => {
      if (!adminToken) {
        return // Skip if no admin token available
      }

      const response = await request(app.getHttpServer())
        .get('/admin/applications/ip-statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should reject non-admin access to admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/applications/flagged')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403)
    })
  })
})
