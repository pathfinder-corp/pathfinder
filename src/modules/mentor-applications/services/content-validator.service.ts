import { GoogleGenAI } from '@google/genai'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'crypto'
import Redis from 'ioredis'

import { RoadmapContentPolicyService } from '../../roadmaps/roadmap-content-policy.service'
import { CreateApplicationDto } from '../dto/create-application.dto'

export interface ValidationResult {
  score: number // 0-100, lower = more suspicious
  flags: string[]
  shouldFlag: boolean // true if score < threshold
  reason: string
  aiAnalysis?: {
    isSpam: boolean
    confidence: number
    reasoning: string
  }
}

interface CachedValidation {
  result: ValidationResult
  timestamp: number
}

@Injectable()
export class ContentValidatorService {
  private readonly logger = new Logger(ContentValidatorService.name)
  private readonly spamKeywords: string[]
  private readonly minQualityScore: number
  private readonly enableAiValidation: boolean
  private readonly enableCaching: boolean
  private readonly cacheTtlSeconds: number
  private readonly weights: Record<string, number>
  private readonly thresholds: Record<string, number>
  private readonly genaiClient: GoogleGenAI | null = null
  private readonly genaiModel: string
  private readonly redisClient: Redis | null = null
  private readonly contentPolicyService: RoadmapContentPolicyService

  constructor(
    private readonly configService: ConfigService,
    contentPolicyService: RoadmapContentPolicyService
  ) {
    this.contentPolicyService = contentPolicyService

    // Load configuration
    this.spamKeywords = this.configService.get<string[]>(
      'contentValidation.spamKeywords',
      []
    )
    this.minQualityScore = this.configService.get<number>(
      'contentValidation.minQualityScore',
      60
    )
    this.enableAiValidation = this.configService.get<boolean>(
      'contentValidation.enableAiValidation',
      true
    )
    this.enableCaching = this.configService.get<boolean>(
      'contentValidation.enableCaching',
      true
    )
    this.cacheTtlSeconds = this.configService.get<number>(
      'contentValidation.cacheTtlSeconds',
      3600
    )
    this.weights = this.configService.get<Record<string, number>>(
      'contentValidation.weights',
      {}
    )
    this.thresholds = this.configService.get<Record<string, number>>(
      'contentValidation.thresholds',
      {}
    )

    // Initialize GenAI client if enabled
    if (this.enableAiValidation) {
      const apiKey = this.configService.get<string>('genai.apiKey')
      if (apiKey) {
        this.genaiClient = new GoogleGenAI({ apiKey })
        this.genaiModel =
          this.configService.get<string>('genai.model') ??
          'gemini-3-flash-preview'
      } else {
        this.logger.warn('GenAI API key not configured, AI validation disabled')
      }
    }

    // Initialize Redis client if caching enabled
    if (this.enableCaching) {
      try {
        this.redisClient = new Redis({
          host: this.configService.get<string>('redis.host'),
          port: this.configService.get<number>('redis.port'),
          password: this.configService.get<string>('redis.password'),
          db: this.configService.get<number>('redis.db')
        })
        this.redisClient.on('error', (err) =>
          this.logger.error('Redis Client Error for Content Validator', err)
        )
      } catch (error) {
        this.logger.warn('Failed to initialize Redis for caching', error)
      }
    }
  }

  /**
   * Synchronous validation for backward compatibility
   * Does NOT include AI analysis
   */
  validateApplication(dto: CreateApplicationDto): ValidationResult {
    const flags: string[] = []
    let score = 100

    const combinedText = this.getCombinedText(dto)

    // Run synchronous checks
    const checks = [
      this.checkRepeatedCharacters(combinedText),
      this.checkSpamKeywords(combinedText),
      this.checkSuspiciousUrls(dto),
      this.checkWordDiversity(combinedText),
      this.checkSpecialCharacters(combinedText),
      this.checkGibberish(combinedText),
      this.checkTextLength(combinedText),
      this.checkArrayFields(dto),
      this.checkSensitiveContent(dto)
    ]

    for (const check of checks) {
      if (check.flag) {
        flags.push(check.flag)
        score -= check.penalty
      }
    }

    score = Math.max(0, score)
    const shouldFlag = score < this.minQualityScore
    const reason = shouldFlag
      ? `Content quality score ${score} is below threshold ${this.minQualityScore}. Flags: ${flags.join(', ')}`
      : ''

    if (shouldFlag) {
      this.logger.warn(
        `Flagged application content: score=${score}, flags=${flags.join(', ')}`
      )
    }

    return { score, flags, shouldFlag, reason }
  }

  /**
   * Async validation with AI analysis and caching
   */
  async validateApplicationAsync(
    dto: CreateApplicationDto
  ): Promise<ValidationResult> {
    // Check cache first
    const contentHash = this.generateContentHash(dto)
    const cached = await this.getCachedValidation(contentHash)
    if (cached) {
      this.logger.debug(`Cache hit for content hash: ${contentHash}`)
      return cached
    }

    // Run all checks in parallel
    const [syncResult, aiAnalysisResult] = await Promise.all([
      Promise.resolve(this.validateApplication(dto)),
      this.performAiAnalysis(dto)
    ])

    // Combine results
    let finalScore = syncResult.score
    const finalFlags = [...syncResult.flags]

    if (aiAnalysisResult) {
      syncResult.aiAnalysis = aiAnalysisResult
      if (aiAnalysisResult.isSpam) {
        finalFlags.push('ai-spam-detected')
        finalScore -= this.weights.aiSpamDetection || 41
        finalScore = Math.max(0, finalScore)
      }
    }

    const shouldFlag = finalScore < this.minQualityScore
    const reason = shouldFlag
      ? `Content quality score ${finalScore} is below threshold ${this.minQualityScore}. Flags: ${finalFlags.join(', ')}`
      : syncResult.reason

    const result: ValidationResult = {
      score: finalScore,
      flags: finalFlags,
      shouldFlag,
      reason,
      aiAnalysis: syncResult.aiAnalysis
    }

    console.log('Final Validation Result:', result)

    // Cache the result
    await this.cacheValidation(contentHash, result)

    if (shouldFlag) {
      this.logger.warn(
        `Flagged application (async): score=${finalScore}, flags=${finalFlags.join(', ')}, aiSpam=${aiAnalysisResult?.isSpam}`
      )
    }

    return result
  }

  /**
   * Perform AI-powered semantic spam detection
   */
  private async performAiAnalysis(
    dto: CreateApplicationDto
  ): Promise<ValidationResult['aiAnalysis'] | null> {
    if (!this.enableAiValidation || !this.genaiClient) {
      return null
    }

    try {
      const prompt = `Analyze the following mentor application content to determine if it represents a legitimate, professional mentor candidate.

    Evaluate for:
    1. Professional credibility and genuine expertise
    2. Spam, promotional content, or low-quality submissions
    3. Inappropriate, offensive, or unprofessional content
    4. Authentic motivation to mentor (not self-promotion or sales)

    Content:
    Headline: ${dto.headline}
    Bio: ${dto.bio}
    Motivation: ${dto.motivation}
    Expertise: ${dto.expertise?.join(', ') || 'N/A'}
    Skills: ${dto.skills?.join(', ') || 'N/A'}

    Respond in JSON format:
    {
      "isSpam": boolean (true if content is spam, inappropriate, or unprofessional),
      "confidence": number (0-1),
      "reasoning": "brief explanation of why this is or isn't a professional mentor application"
    }`

      const response = await this.genaiClient.models.generateContent({
        model: this.genaiModel,
        contents: prompt,
        config: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })

      const textResponse = response.text?.trim()

      if (!textResponse) {
        return null
      }

      const parsed = JSON.parse(textResponse) as Record<string, unknown>

      return {
        isSpam: Boolean(parsed.isSpam),
        confidence: Number(parsed.confidence) || 0,
        reasoning: String(parsed.reasoning) || 'No reasoning provided'
      }
    } catch (error) {
      this.logger.error('AI analysis failed', error)
      return null
    }
  }

  /**
   * Generate content hash for caching
   */
  private generateContentHash(dto: CreateApplicationDto): string {
    const content = JSON.stringify({
      headline: dto.headline,
      bio: dto.bio,
      motivation: dto.motivation,
      expertise: dto.expertise,
      skills: dto.skills,
      industries: dto.industries,
      languages: dto.languages,
      linkedinUrl: dto.linkedinUrl,
      portfolioUrl: dto.portfolioUrl
    })
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Get cached validation result
   */
  private async getCachedValidation(
    contentHash: string
  ): Promise<ValidationResult | null> {
    if (!this.enableCaching || !this.redisClient) {
      return null
    }

    try {
      const key = `content-validation:${contentHash}`
      const cached = await this.redisClient.get(key)
      if (!cached) {
        return null
      }

      const parsed = JSON.parse(cached) as CachedValidation
      return parsed.result
    } catch (error) {
      this.logger.error('Failed to get cached validation', error)
      return null
    }
  }

  /**
   * Cache validation result
   */
  private async cacheValidation(
    contentHash: string,
    result: ValidationResult
  ): Promise<void> {
    if (!this.enableCaching || !this.redisClient) {
      return
    }

    try {
      const key = `content-validation:${contentHash}`
      const cached: CachedValidation = {
        result,
        timestamp: Date.now()
      }
      await this.redisClient.setex(
        key,
        this.cacheTtlSeconds,
        JSON.stringify(cached)
      )
    } catch (error) {
      this.logger.error('Failed to cache validation', error)
    }
  }

  // ========== Validation Checks ==========

  private checkRepeatedCharacters(text: string): {
    flag: string | null
    penalty: number
  } {
    const repeatedPattern = /(.)\1{9,}/i
    if (repeatedPattern.test(text)) {
      return {
        flag: 'repeated-characters',
        penalty: this.weights.repeatedCharacters || 30
      }
    }
    return { flag: null, penalty: 0 }
  }

  private checkSpamKeywords(text: string): {
    flag: string | null
    penalty: number
  } {
    let count = 0
    for (const keyword of this.spamKeywords) {
      if (text.includes(keyword)) {
        count++
      }
    }
    if (count > 0) {
      return {
        flag: 'spam-keywords',
        penalty: count * (this.weights.spamKeyword || 20)
      }
    }
    return { flag: null, penalty: 0 }
  }

  private checkSuspiciousUrls(dto: CreateApplicationDto): {
    flag: string | null
    penalty: number
  } {
    if (this.hasSuspiciousUrls(dto)) {
      return {
        flag: 'suspicious-urls',
        penalty: this.weights.suspiciousUrls || 25
      }
    }
    return { flag: null, penalty: 0 }
  }

  private checkWordDiversity(text: string): {
    flag: string | null
    penalty: number
  } {
    const diversity = this.calculateWordDiversity(text)
    const threshold = this.thresholds.minWordDiversity || 0.3
    if (diversity < threshold) {
      return {
        flag: 'low-diversity',
        penalty: this.weights.lowDiversity || 20
      }
    }
    return { flag: null, penalty: 0 }
  }

  private checkSpecialCharacters(text: string): {
    flag: string | null
    penalty: number
  } {
    if (this.hasTooManySpecialChars(text)) {
      return {
        flag: 'excessive-special-chars',
        penalty: this.weights.excessiveSpecialChars || 15
      }
    }
    return { flag: null, penalty: 0 }
  }

  private checkGibberish(text: string): {
    flag: string | null
    penalty: number
  } {
    if (this.isGibberish(text)) {
      return { flag: 'gibberish', penalty: this.weights.gibberish || 30 }
    }
    return { flag: null, penalty: 0 }
  }

  private checkTextLength(text: string): {
    flag: string | null
    penalty: number
  } {
    const minLength = this.thresholds.minTextLength || 100
    if (text.length < minLength) {
      return { flag: 'too-short', penalty: this.weights.tooShort || 20 }
    }
    return { flag: null, penalty: 0 }
  }

  private checkArrayFields(dto: CreateApplicationDto): {
    flag: string | null
    penalty: number
  } {
    const arrays = [
      dto.expertise || [],
      dto.skills || [],
      dto.industries || [],
      dto.languages || []
    ]

    for (const arr of arrays) {
      if (arr.length > 0) {
        // Check for excessive duplicates
        const uniqueCount = new Set(arr.map((s) => s.toLowerCase())).size
        const duplicateRatio = 1 - uniqueCount / arr.length
        const maxRatio = this.thresholds.maxArrayDuplicateRatio || 0.5
        if (duplicateRatio > maxRatio) {
          return {
            flag: 'array-field-spam',
            penalty: this.weights.arrayFieldSpam || 25
          }
        }

        // Check for gibberish in array items
        for (const item of arr) {
          if (this.isGibberish(item.toLowerCase())) {
            return {
              flag: 'array-field-spam',
              penalty: this.weights.arrayFieldSpam || 25
            }
          }
        }
      }
    }

    return { flag: null, penalty: 0 }
  }

  private checkSensitiveContent(dto: CreateApplicationDto): {
    flag: string | null
    penalty: number
  } {
    try {
      // Use content policy service to check for sensitive topics
      this.contentPolicyService.validateInsightRequest({
        question: `${dto.headline} ${dto.bio} ${dto.motivation}`
      })
      return { flag: null, penalty: 0 }
    } catch {
      // Content policy detected sensitive content
      return {
        flag: 'policy-violation',
        penalty: this.weights.sensitiveContent || 50
      }
    }
  }

  // ========== Helper Methods ==========

  private getCombinedText(dto: CreateApplicationDto): string {
    return [dto.headline, dto.bio, dto.motivation].join(' ').toLowerCase()
  }

  private hasSuspiciousUrls(dto: CreateApplicationDto): boolean {
    const urls: string[] = []

    if (dto.linkedinUrl) urls.push(dto.linkedinUrl)
    if (dto.portfolioUrl) urls.push(dto.portfolioUrl)

    for (const url of urls) {
      // Check for non-HTTPS URLs
      if (url.startsWith('http://')) {
        return true
      }

      // Check for URL shorteners
      const shorteners = [
        'bit.ly',
        'tinyurl.com',
        'goo.gl',
        't.co',
        'ow.ly',
        'is.gd',
        'buff.ly'
      ]
      for (const shortener of shorteners) {
        if (url.includes(shortener)) {
          return true
        }
      }
    }

    return false
  }

  private calculateWordDiversity(text: string): number {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)

    if (words.length === 0) return 0

    const uniqueWords = new Set(words)
    return uniqueWords.size / words.length
  }

  private hasTooManySpecialChars(text: string): boolean {
    const specialCharCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length
    const ratio = specialCharCount / text.length
    const maxRatio = this.thresholds.maxSpecialCharRatio || 0.15
    return ratio > maxRatio
  }

  private isGibberish(text: string): boolean {
    const cleanText = text.replace(/[^a-z]/g, '')

    if (cleanText.length < 20) return false

    const vowels = cleanText.match(/[aeiou]/g)?.length || 0
    const vowelRatio = vowels / cleanText.length

    const minRatio = this.thresholds.minVowelRatio || 0.15
    const maxRatio = this.thresholds.maxVowelRatio || 0.6

    return vowelRatio < minRatio || vowelRatio > maxRatio
  }
}
