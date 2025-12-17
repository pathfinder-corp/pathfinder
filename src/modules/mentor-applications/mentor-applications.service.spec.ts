import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { NotificationsService } from '../notifications/notifications.service'
import { User, UserRole } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { CreateApplicationDto } from './dto/create-application.dto'
import { ReviewDecision } from './dto/review-application.dto'
import { ApplicationStatusHistory } from './entities/application-status-history.entity'
import {
  ApplicationStatus,
  MentorApplication
} from './entities/mentor-application.entity'
import { MentorApplicationsService } from './mentor-applications.service'

describe('MentorApplicationsService', () => {
  let service: MentorApplicationsService
  let applicationRepository: Repository<MentorApplication>
  let historyRepository: Repository<ApplicationStatusHistory>
  let usersService: UsersService

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.STUDENT,
    status: 'active' as any,
    createdAt: new Date(),
    updatedAt: new Date()
  } as User

  const mockApplication: MentorApplication = {
    id: 'app-123',
    userId: 'user-123',
    status: ApplicationStatus.PENDING,
    applicationData: {
      headline: 'Senior Developer',
      bio: 'Experienced engineer',
      expertise: ['JavaScript'],
      skills: ['TypeScript'],
      languages: ['English'],
      yearsExperience: 5,
      motivation: 'Want to help others'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  } as MentorApplication

  const mockCreateDto: CreateApplicationDto = {
    headline: 'Senior Software Engineer',
    bio: 'I have 10 years of experience in software development and love mentoring junior developers.',
    expertise: ['Software Engineering', 'System Design'],
    skills: ['TypeScript', 'Node.js', 'React'],
    languages: ['English', 'Spanish'],
    yearsExperience: 10,
    motivation:
      'I want to give back to the community and help others grow in their careers.'
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorApplicationsService,
        {
          provide: getRepositoryToken(MentorApplication),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            update: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(ApplicationStatusHistory),
          useValue: {
            save: jest.fn()
          }
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn()
          }
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
            logStateTransition: jest.fn()
          }
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(30) // reapply cooldown days
          }
        }
      ]
    }).compile()

    service = module.get<MentorApplicationsService>(MentorApplicationsService)
    applicationRepository = module.get<Repository<MentorApplication>>(
      getRepositoryToken(MentorApplication)
    )
    historyRepository = module.get<Repository<ApplicationStatusHistory>>(
      getRepositoryToken(ApplicationStatusHistory)
    )
    usersService = module.get<UsersService>(UsersService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a new application successfully', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(null)
      jest
        .spyOn(applicationRepository, 'create')
        .mockReturnValue(mockApplication)
      jest
        .spyOn(applicationRepository, 'save')
        .mockResolvedValue(mockApplication)

      const result = await service.create('user-123', mockCreateDto)

      expect(result).toBeDefined()
      expect(applicationRepository.create).toHaveBeenCalled()
      expect(applicationRepository.save).toHaveBeenCalled()
    })

    it('should throw ConflictException if user is already a mentor', async () => {
      const mentorUser = { ...mockUser, role: UserRole.MENTOR }
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mentorUser)

      await expect(service.create('user-123', mockCreateDto)).rejects.toThrow(
        ConflictException
      )
    })

    it('should throw ConflictException if pending application exists', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser)
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValueOnce(mockApplication) // existing pending

      await expect(service.create('user-123', mockCreateDto)).rejects.toThrow(
        ConflictException
      )
    })

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null)

      await expect(service.create('user-123', mockCreateDto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw ForbiddenException if user is an admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN }
      jest.spyOn(usersService, 'findOne').mockResolvedValue(adminUser)

      await expect(service.create('admin-123', mockCreateDto)).rejects.toThrow(
        ForbiddenException
      )
      await expect(service.create('admin-123', mockCreateDto)).rejects.toThrow(
        'Administrators cannot apply to be mentors'
      )
    })
  })

  describe('review', () => {
    it('should approve application and update user role', async () => {
      const pendingApp = {
        ...mockApplication,
        status: ApplicationStatus.PENDING,
        user: mockUser
      }

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(pendingApp)
      jest.spyOn(applicationRepository, 'save').mockResolvedValue({
        ...pendingApp,
        status: ApplicationStatus.APPROVED
      })
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(usersService, 'update').mockResolvedValue(undefined)

      const result = await service.review('app-123', 'admin-123', {
        decision: ReviewDecision.APPROVE
      })

      expect(usersService.update).toHaveBeenCalledWith(
        pendingApp.userId,
        expect.objectContaining({ role: UserRole.MENTOR })
      )
    })

    it('should decline application with reason', async () => {
      const pendingApp = {
        ...mockApplication,
        status: ApplicationStatus.PENDING,
        user: mockUser
      }

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(pendingApp)
      jest.spyOn(applicationRepository, 'save').mockResolvedValue({
        ...pendingApp,
        status: ApplicationStatus.DECLINED,
        declineReason: 'Not enough experience'
      })

      const result = await service.review('app-123', 'admin-123', {
        decision: ReviewDecision.DECLINE,
        declineReason: 'Not enough experience'
      })

      expect(applicationRepository.save).toHaveBeenCalled()
    })

    it('should throw BadRequestException if declining without reason', async () => {
      const pendingApp = {
        ...mockApplication,
        status: ApplicationStatus.PENDING,
        user: mockUser
      }

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(pendingApp)

      await expect(
        service.review('app-123', 'admin-123', {
          decision: ReviewDecision.DECLINE
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for already reviewed application', async () => {
      const approvedApp = {
        ...mockApplication,
        status: ApplicationStatus.APPROVED
      }

      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(approvedApp)

      await expect(
        service.review('app-123', 'admin-123', {
          decision: ReviewDecision.APPROVE
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if trying to approve an admin user', async () => {
      const pendingApp = {
        ...mockApplication,
        status: ApplicationStatus.PENDING,
        user: mockUser,
        userId: 'admin-user-123'
      }

      const adminUser = {
        ...mockUser,
        id: 'admin-user-123',
        role: UserRole.ADMIN
      }

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(pendingApp)
      jest.spyOn(applicationRepository, 'save').mockResolvedValue({
        ...pendingApp,
        status: ApplicationStatus.APPROVED
      })
      jest.spyOn(usersService, 'findOne').mockResolvedValue(adminUser)

      await expect(
        service.review('app-123', 'reviewer-123', {
          decision: ReviewDecision.APPROVE
        })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('withdraw', () => {
    it('should withdraw pending application', async () => {
      const pendingApp = {
        ...mockApplication,
        status: ApplicationStatus.PENDING
      }

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(pendingApp)
      jest.spyOn(applicationRepository, 'save').mockResolvedValue({
        ...pendingApp,
        status: ApplicationStatus.WITHDRAWN
      })

      await service.withdraw('app-123', 'user-123')

      expect(applicationRepository.save).toHaveBeenCalled()
    })

    it('should throw NotFoundException if application not found', async () => {
      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(null)

      await expect(service.withdraw('app-123', 'user-123')).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException if trying to withdraw approved application', async () => {
      const approvedApp = {
        ...mockApplication,
        userId: 'user-123',
        status: ApplicationStatus.APPROVED
      }

      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(approvedApp)

      await expect(service.withdraw('app-123', 'user-123')).rejects.toThrow(
        BadRequestException
      )
    })
  })
})
