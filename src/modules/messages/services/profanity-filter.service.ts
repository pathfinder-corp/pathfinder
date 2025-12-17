import { Injectable } from '@nestjs/common'

/**
 * Stub profanity filter service
 * In production, integrate with a real profanity detection library or API
 */
@Injectable()
export class ProfanityFilterService {
  // Basic list of words to filter - stub only
  private readonly blockedPatterns: RegExp[] = [
    // Placeholder patterns - replace with actual profanity patterns in production
  ]

  /**
   * Check if content contains profanity
   * @returns true if content is clean, false if it contains profanity
   */
  isClean(content: string): boolean {
    const lowerContent = content.toLowerCase()

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(lowerContent)) {
        return false
      }
    }

    return true
  }

  /**
   * Sanitize content by replacing profanity with asterisks
   * Stub implementation - returns content as-is
   */
  sanitize(content: string): string {
    // In production, implement actual sanitization
    // For now, return as-is since this is a stub
    return content
  }

  /**
   * Get list of detected issues (for admin review)
   */
  getIssues(content: string): string[] {
    // Stub - return empty array
    return []
  }
}
