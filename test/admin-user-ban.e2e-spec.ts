import { HttpStatus, INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import { Repository } from 'typeorm'

import { AppModule } from '../src/app.module'
import { User, UserRole, UserStatus } from '../src/modules/users/entities/user.entity'

describe('Admin User Ban (e2e)', () => {
  let app: INestApplication
  let usersRepository: Repository<User>
  let adminToken: string
  let studentUser: User
  let anotherAdminUser: User

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    usersRepository = moduleFixture.get('UserRepository')
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Create admin user and get token
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User'
      })

    // Manually set admin role
    const admin = await usersRepository.findOne({
      where: { email: 'admin@test.com' }
    })
    if (admin) {
      admin.role = UserRole.ADMIN
      await usersRepository.save(admin)
    }

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!'
      })

    adminToken = loginResponse.body.accessToken

    // Create a student user to test ban
    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'student@test.com',
        password: 'Student123!',
        firstName: 'Student',
        lastName: 'User'
      })

    studentUser = await usersRepository.findOne({
      where: { email: 'student@test.com' }
    })

    // Create another admin user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin2@test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'Two'
      })

    anotherAdminUser = await usersRepository.findOne({
      where: { email: 'admin2@test.com' }
    })
    if (anotherAdminUser) {
      anotherAdminUser.role = UserRole.ADMIN
      await usersRepository.save(anotherAdminUser)
    }
  })

  describe('PATCH /admin/users/:id/ban', () => {
    it('should ban a student user successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)

      expect(response.body).toMatchObject({
        id: studentUser.id,
        email: 'student@test.com',
        status: UserStatus.SUSPENDED
      })

      // Verify in database
      const updatedUser = await usersRepository.findOne({
        where: { id: studentUser.id }
      })
      expect(updatedUser?.status).toBe(UserStatus.SUSPENDED)
    })

    it('should prevent banned user from accessing API', async () => {
      // Ban the user
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)

      // Get student token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'Student123!'
        })

      const studentToken = loginResponse.body.accessToken

      // Try to access protected route
      await request(app.getHttpServer())
        .get('/roadmaps')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(HttpStatus.UNAUTHORIZED)
    })

    it('should not allow banning admin users', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${anotherAdminUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.message).toBe('Cannot ban admin users')
    })

    it('should not allow admin to ban themselves', async () => {
      const admin = await usersRepository.findOne({
        where: { email: 'admin@test.com' }
      })

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${admin?.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.FORBIDDEN)

      expect(response.body.message).toBe('Cannot ban yourself')
    })

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      await request(app.getHttpServer())
        .patch(`/admin/users/${fakeId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.NOT_FOUND)
    })

    it('should require admin role', async () => {
      // Login as student
      const studentLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'Student123!'
        })

      const studentToken = studentLoginResponse.body.accessToken

      // Try to ban another user
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(HttpStatus.FORBIDDEN)
    })
  })

  describe('PATCH /admin/users/:id/unban', () => {
    beforeEach(async () => {
      // Ban the student user first
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
    })

    it('should unban a suspended user successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)

      expect(response.body).toMatchObject({
        id: studentUser.id,
        email: 'student@test.com',
        status: UserStatus.ACTIVE
      })

      // Verify in database
      const updatedUser = await usersRepository.findOne({
        where: { id: studentUser.id }
      })
      expect(updatedUser?.status).toBe(UserStatus.ACTIVE)
    })

    it('should allow unbanned user to access API', async () => {
      // Unban the user
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)

      // Get student token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'Student123!'
        })

      const studentToken = loginResponse.body.accessToken

      // Should be able to access protected route
      await request(app.getHttpServer())
        .get('/roadmaps')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(HttpStatus.OK)
    })

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      await request(app.getHttpServer())
        .patch(`/admin/users/${fakeId}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.NOT_FOUND)
    })

    it('should require admin role', async () => {
      // Login as another student
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'student2@test.com',
          password: 'Student123!',
          firstName: 'Student',
          lastName: 'Two'
        })

      const studentLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student2@test.com',
          password: 'Student123!'
        })

      const studentToken = studentLoginResponse.body.accessToken

      // Try to unban another user
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/unban`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(HttpStatus.FORBIDDEN)
    })
  })

  describe('Ban/Unban Flow', () => {
    it('should handle complete ban and unban cycle', async () => {
      // 1. Initial state - user is active
      let user = await usersRepository.findOne({
        where: { id: studentUser.id }
      })
      expect(user?.status).toBe(UserStatus.ACTIVE)

      // 2. Ban user
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)

      user = await usersRepository.findOne({
        where: { id: studentUser.id }
      })
      expect(user?.status).toBe(UserStatus.SUSPENDED)

      // 3. Verify user cannot login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'Student123!'
        })

      const studentToken = loginResponse.body.accessToken

      await request(app.getHttpServer())
        .get('/roadmaps')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(HttpStatus.UNAUTHORIZED)

      // 4. Unban user
      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)

      user = await usersRepository.findOne({
        where: { id: studentUser.id }
      })
      expect(user?.status).toBe(UserStatus.ACTIVE)

      // 5. Verify user can login again
      const newLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'Student123!'
        })

      const newStudentToken = newLoginResponse.body.accessToken

      await request(app.getHttpServer())
        .get('/roadmaps')
        .set('Authorization', `Bearer ${newStudentToken}`)
        .expect(HttpStatus.OK)
    })
  })
})

