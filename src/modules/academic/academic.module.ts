import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsersModule } from '../users/users.module'
import { AcademicProfileController } from './academic-profile.controller'
import { AcademicProfileService } from './academic-profile.service'
import { CourseController } from './course.controller'
import { CourseService } from './course.service'
import { EnrollmentController } from './enrollment.controller'
import { EnrollmentService } from './enrollment.service'
import { AcademicProfile } from './entities/academic-profile.entity'
import { Course } from './entities/course.entity'
import { Enrollment } from './entities/enrollment.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicProfile, Course, Enrollment]),
    UsersModule
  ],
  controllers: [
    AcademicProfileController,
    CourseController,
    EnrollmentController
  ],
  providers: [AcademicProfileService, CourseService, EnrollmentService],
  exports: [AcademicProfileService, CourseService, EnrollmentService]
})
export class AcademicModule {}

