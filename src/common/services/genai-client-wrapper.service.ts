import { GoogleGenAI, type GenerationConfig } from '@google/genai'
import {
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { GenAIApiUsage } from '../entities/genai-api-usage.entity'
import { GenAIKeyManagerService } from './genai-key-manager.service'

interface GenerateContentParams {
  model: string
  contents: any // GoogleGenAI accepts any content type
  config: GenerationConfig & { systemInstruction?: string }
}

@Injectable()
export class GenAIClientWrapperService {
  private readonly logger = new Logger(GenAIClientWrapperService.name)
  private readonly modelName: string
  private readonly maxRetries = 3
  private readonly baseDelayMs = 1000

  constructor(
    private readonly keyManager: GenAIKeyManagerService,
    private readonly configService: ConfigService,
    @InjectRepository(GenAIApiUsage)
    private readonly usageRepository: Repository<GenAIApiUsage>
  ) {
    this.modelName =
      this.configService.get<string>('genai.model') ?? 'gemini-3-flash-preview'
  }

  /**
   * Generate content with automatic retry and key rotation
   */
  async generateContent(
    params: GenerateContentParams,
    serviceName: string,
    operation: string,
    userId?: string
  ) {
    let lastError: Error | null = null
    let attempt = 0

    while (attempt < this.maxRetries) {
      try {
        const startTime = Date.now()
        const apiKey = await this.keyManager.getNextKey()
        const client = new GoogleGenAI({ apiKey })

        this.logger.debug(
          `Attempt ${attempt + 1}/${this.maxRetries} for ${serviceName}.${operation}`
        )

        const response = await client.models.generateContent({
          model: params.model,
          contents: params.contents,
          config: params.config
        })

        const duration = Date.now() - startTime

        // Mark key as successful
        await this.keyManager.markKeySuccess(apiKey)

        // Log usage
        await this.logUsage({
          serviceName,
          operation,
          userId,
          modelName: params.model,
          inputTokens: response.usageMetadata?.promptTokenCount || null,
          outputTokens: response.usageMetadata?.candidatesTokenCount || null,
          totalTokens: response.usageMetadata?.totalTokenCount || null,
          durationMs: duration,
          success: true,
          errorMessage: null
        })

        this.logger.log(
          `Successfully generated content for ${serviceName}.${operation} in ${duration}ms`
        )

        return response
      } catch (error) {
        lastError = error as Error
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        this.logger.error(
          `Attempt ${attempt + 1}/${this.maxRetries} failed for ${serviceName}.${operation}: ${errorMessage}`
        )

        // Classify error
        const errorType = this.classifyError(error)

        if (errorType === 'quota_exceeded') {
          // Mark current key as failed and try next key immediately
          const currentKey = await this.keyManager.getNextKey()
          await this.keyManager.markKeyFailure(currentKey, 'Quota exceeded')

          this.logger.warn('Quota exceeded, rotating to next key...')
          // Don't increment attempt counter for quota errors
          continue
        } else if (errorType === 'transient') {
          // Transient error - use exponential backoff
          const delay = this.baseDelayMs * Math.pow(2, attempt)
          this.logger.debug(`Waiting ${delay}ms before retry...`)
          await this.sleep(delay)
        } else {
          // Fatal error - don't retry
          await this.logUsage({
            serviceName,
            operation,
            userId,
            modelName: params.model,
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            durationMs: null,
            success: false,
            errorMessage
          })

          throw new InternalServerErrorException(
            `AI generation failed: ${errorMessage}`
          )
        }

        attempt++
      }
    }

    // All retries exhausted
    await this.logUsage({
      serviceName,
      operation,
      userId,
      modelName: params.model,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      durationMs: null,
      success: false,
      errorMessage: lastError?.message || 'Unknown error'
    })

    throw new InternalServerErrorException(
      `AI generation failed after ${this.maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * Get model name (for backward compatibility with existing services)
   */
  getModelName(): string {
    return this.modelName
  }

  /**
   * Get generation defaults (for backward compatibility)
   */
  getGenerationDefaults(): GenerationConfig {
    return {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens:
        this.configService.get<number>('genai.maxOutputTokens') ?? 65536
    }
  }

  /**
   * Get insight generation defaults (for RoadmapsService)
   */
  getInsightGenerationDefaults(): GenerationConfig {
    return {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens:
        this.configService.get<number>('genai.maxOutputTokens') ?? 65536
    }
  }

  /**
   * Private: Classify error type for retry strategy
   */
  private classifyError(error: any): 'quota_exceeded' | 'transient' | 'fatal' {
    const message = (error?.message?.toLowerCase() || '') as string
    const status = error?.status || error?.statusCode

    // Quota/rate limit errors
    if (
      status === 429 ||
      message.includes('quota') ||
      message.includes('rate limit')
    ) {
      return 'quota_exceeded'
    }

    // Transient errors (network, timeout, service unavailable)
    if (
      status === 503 ||
      status === 504 ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('network')
    ) {
      return 'transient'
    }

    // Fatal errors (bad request, auth issues, etc.)
    return 'fatal'
  }

  /**
   * Private: Log usage to database
   */
  private async logUsage(data: {
    serviceName: string
    operation: string
    userId?: string
    modelName: string
    inputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
    durationMs: number | null
    success: boolean
    errorMessage: string | null
  }): Promise<void> {
    try {
      const usage = this.usageRepository.create({
        serviceName: data.serviceName,
        operation: data.operation,
        userId: data.userId || null,
        modelName: data.modelName,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens: data.totalTokens,
        durationMs: data.durationMs,
        success: data.success,
        errorMessage: data.errorMessage,
        metadata: {}
      })

      await this.usageRepository.save(usage)
    } catch (error) {
      // Don't fail the request if logging fails
      this.logger.error('Failed to log usage:', error)
    }
  }

  /**
   * Private: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
