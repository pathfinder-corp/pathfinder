import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CreateApplicationDto } from '../dto/create-application.dto'

export interface ValidationResult {
  score: number // 0-100, lower = more suspicious
  flags: string[]
  shouldFlag: boolean // true if score < threshold
  reason: string
}

@Injectable()
export class ContentValidatorService {
  private readonly logger = new Logger(ContentValidatorService.name)
  private readonly spamKeywords: string[]
  private readonly minQualityScore: number

  constructor(private readonly configService: ConfigService) {
    const keywords = this.configService.get<string[]>(
      'mentorship.contentValidation.spamKeywords',
      []
    )
    this.spamKeywords = keywords.map((k) => k.toLowerCase())
    this.minQualityScore = this.configService.get<number>(
      'mentorship.contentValidation.minQualityScore',
      60
    )
  }

  /**
   * Validate mentor application content for spam and quality
   */
  validateApplication(dto: CreateApplicationDto): ValidationResult {
    const flags: string[] = []
    let score = 100 // Start with perfect score

    const combinedText = this.getCombinedText(dto)

    // Check 1: Repeated characters
    if (this.hasRepeatedCharacters(combinedText)) {
      flags.push('repeated-characters')
      score -= 30
    }

    // Check 2: Spam keywords
    const spamKeywordCount = this.countSpamKeywords(combinedText)
    if (spamKeywordCount > 0) {
      flags.push('spam-keywords')
      score -= spamKeywordCount * 20
    }

    // Check 3: Suspicious URLs (non-HTTPS, URL shorteners)
    if (this.hasSuspiciousUrls(dto)) {
      flags.push('suspicious-urls')
      score -= 25
    }

    // Check 4: Low word diversity (copy-paste detection)
    const diversity = this.calculateWordDiversity(combinedText)
    if (diversity < 0.3) {
      flags.push('low-diversity')
      score -= 20
    }

    // Check 5: Too many special characters
    if (this.hasTooManySpecialChars(combinedText)) {
      flags.push('excessive-special-chars')
      score -= 15
    }

    // Check 6: Gibberish detection (consonant/vowel ratio)
    if (this.isGibberish(combinedText)) {
      flags.push('gibberish')
      score -= 30
    }

    // Check 7: Too short content
    if (combinedText.length < 100) {
      flags.push('too-short')
      score -= 20
    }

    // Ensure score doesn't go below 0
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

    return {
      score,
      flags,
      shouldFlag,
      reason
    }
  }

  private getCombinedText(dto: CreateApplicationDto): string {
    return [dto.headline, dto.bio, dto.motivation].join(' ').toLowerCase()
  }

  private hasRepeatedCharacters(text: string): boolean {
    // Check for 10+ repeated characters
    const repeatedPattern = /(.)\1{9,}/i
    return repeatedPattern.test(text)
  }

  private countSpamKeywords(text: string): number {
    let count = 0
    for (const keyword of this.spamKeywords) {
      if (text.includes(keyword)) {
        count++
      }
    }
    return count
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
      .filter((w) => w.length > 2) // Ignore very short words

    if (words.length === 0) return 0

    const uniqueWords = new Set(words)
    return uniqueWords.size / words.length
  }

  private hasTooManySpecialChars(text: string): boolean {
    const specialCharCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length
    const ratio = specialCharCount / text.length
    return ratio > 0.15 // More than 15% special characters
  }

  private isGibberish(text: string): boolean {
    // Remove spaces and special characters
    const cleanText = text.replace(/[^a-z]/g, '')

    if (cleanText.length < 20) return false

    const vowels = cleanText.match(/[aeiou]/g)?.length || 0
    const consonants = cleanText.length - vowels

    // Typical English has vowel ratio between 30-45%
    const vowelRatio = vowels / cleanText.length

    return vowelRatio < 0.15 || vowelRatio > 0.6
  }
}
