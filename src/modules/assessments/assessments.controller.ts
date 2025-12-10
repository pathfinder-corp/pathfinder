import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/entities/user.entity'
import { AssessmentResultsService } from './assessment-results.service'
import { AssessmentSharingService } from './assessment-sharing.service'
import { AssessmentsService } from './assessments.service'
import { AssessmentResultResponseDto } from './dto/assessment-result-response.dto'
import { AssessmentResponseDto } from './dto/assessment-response.dto'
import { CreateAssessmentDto } from './dto/create-assessment.dto'
import {
  AssessmentShareStateDto,
  ShareAssessmentDto
} from './dto/share-assessment.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly resultsService: AssessmentResultsService,
    private readonly sharingService: AssessmentSharingService
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Generate a new AI-powered assessment',
    description:
      'Creates a new assessment with AI-generated multiple-choice questions based on the specified domain, difficulty, and question count.'
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment successfully generated',
    type: AssessmentResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or domain contains sensitive content'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Failed to generate assessment'
  })
  async generateAssessment(
    @CurrentUser() user: User,
    @Body() createDto: CreateAssessmentDto
  ): Promise<AssessmentResponseDto> {
    return await this.assessmentsService.generateAssessment(user, createDto)
  }

  @Get()
  @ApiOperation({
    summary: 'Get all assessments for the current user',
    description: 'Returns a list of all assessments created by the current user.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of assessments',
    type: [AssessmentResponseDto]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserAssessments(
    @CurrentUser() user: User
  ): Promise<AssessmentResponseDto[]> {
    return await this.assessmentsService.getUserAssessments(user.id)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific assessment',
    description:
      'Returns assessment details including questions (without answers). Accessible by owner or users with shared access.'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment details',
    type: AssessmentResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async getAssessment(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string
  ): Promise<AssessmentResponseDto> {
    return await this.assessmentsService.getAssessment(user.id, assessmentId)
  }

  @Post(':id/start')
  @ApiOperation({
    summary: 'Start an assessment',
    description:
      'Marks an assessment as in-progress. Must be called before submitting answers.'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment started successfully',
    type: AssessmentResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Assessment already completed'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async startAssessment(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string
  ): Promise<AssessmentResponseDto> {
    return await this.assessmentsService.startAssessment(user.id, assessmentId)
  }

  @Post(':id/answers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit an answer for a question',
    description:
      'Submit the user\'s answer for a specific question. Returns whether the answer was correct.'
  })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
    schema: {
      type: 'object',
      properties: {
        isCorrect: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Question already answered or assessment completed'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment or question not found' })
  async submitAnswer(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string,
    @Body() submitDto: SubmitAnswerDto
  ): Promise<{ isCorrect: boolean }> {
    return await this.assessmentsService.submitAnswer(
      user.id,
      assessmentId,
      submitDto
    )
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete an assessment and get results',
    description:
      'Finalizes the assessment, calculates results, generates AI performance summary, and suggests roadmaps for improvement. All questions must be answered first.'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment completed with results',
    type: AssessmentResultResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Not all questions have been answered'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async completeAssessment(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string
  ): Promise<AssessmentResultResponseDto> {
    return await this.resultsService.completeAssessment(user.id, assessmentId)
  }

  @Get(':id/results')
  @ApiOperation({
    summary: 'Get assessment results',
    description:
      'Returns complete assessment results including score, performance summary, question breakdown with explanations, and suggested roadmaps. Only available after assessment is completed.'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment results',
    type: AssessmentResultResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Assessment not completed yet'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment or results not found' })
  async getResults(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string
  ): Promise<AssessmentResultResponseDto> {
    return await this.resultsService.getResults(user.id, assessmentId)
  }

  @Get(':id/share')
  @ApiOperation({
    summary: 'Get assessment sharing configuration',
    description: 'Returns current sharing settings. Only accessible by owner.'
  })
  @ApiResponse({
    status: 200,
    description: 'Sharing configuration',
    type: AssessmentShareStateDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async getShareState(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string
  ): Promise<AssessmentShareStateDto> {
    return await this.sharingService.getShareState(user.id, assessmentId)
  }

  @Post(':id/share')
  @ApiOperation({
    summary: 'Update assessment sharing settings',
    description:
      'Configure assessment sharing: make it public or share with specific users. Only accessible by owner.'
  })
  @ApiResponse({
    status: 200,
    description: 'Sharing settings updated',
    type: AssessmentShareStateDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid sharing configuration'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment or user not found' })
  async updateShareSettings(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string,
    @Body() shareDto: ShareAssessmentDto
  ): Promise<AssessmentShareStateDto> {
    return await this.sharingService.updateShareSettings(
      user.id,
      assessmentId,
      shareDto
    )
  }

  @Delete(':id/share/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke assessment access for a specific user',
    description: 'Removes shared access for a user. Only accessible by owner.'
  })
  @ApiResponse({
    status: 204,
    description: 'Access revoked successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment or shared user not found' })
  async revokeShare(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string,
    @Param('userId') sharedWithUserId: string
  ): Promise<void> {
    await this.sharingService.revokeShare(
      user.id,
      assessmentId,
      sharedWithUserId
    )
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an assessment',
    description:
      'Permanently deletes an assessment and all associated data. Only accessible by owner.'
  })
  @ApiResponse({
    status: 204,
    description: 'Assessment deleted successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async deleteAssessment(
    @CurrentUser() user: User,
    @Param('id') assessmentId: string
  ): Promise<void> {
    await this.assessmentsService.deleteAssessment(user.id, assessmentId)
  }
}


