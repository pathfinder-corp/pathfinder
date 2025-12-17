import { BadRequestException, Injectable } from '@nestjs/common'

import { CreateAssessmentDto } from './dto/create-assessment.dto'

type SensitiveTopicRule = {
  label: string
  pattern: RegExp
}

@Injectable()
export class AssessmentContentPolicyService {
  private readonly sensitiveTopicRules: SensitiveTopicRule[] = [
    {
      label: 'self-harm or suicide',
      pattern:
        /\b(suicide|self[-\s]?harm|self[-\s]?injur(?:y|ies)|kill myself|hurt myself|end my life)\b/i
    },
    {
      label: 'violence or weapons',
      pattern:
        /\b(weapon|gun|firearm|knife|bomb|explosive|grenade|shoot|stab|murder|assassinate|kill)\b/i
    },
    {
      label: 'terrorism or extremism',
      pattern: /\b(terroris[mt]|extremis[mt]|radicali[sz]e|bomb[-\s]?making)\b/i
    },
    {
      label: 'hate or genocide',
      pattern:
        /\b(genocide|ethnic cleansing|white supremacy|neo-?naz[iy]|hate crime|racial supremacy)\b/i
    },
    {
      label: 'adult or explicit sexual content',
      pattern:
        /\b(porn(?:ography)?|xxx|nsfw|explicit sex|sexual act|fetish|erotic content)\b/i
    },
    {
      label: 'illegal drugs or substance abuse',
      pattern:
        /\b(cocaine|heroin|meth(?:amphetamine)?|fentanyl|lsd|mdma|ecstasy|opioid|ketamine|crystal meth)\b/i
    },
    {
      label: 'biological or chemical weapons',
      pattern:
        /\b(bioweapon|chemical weapon|nerve agent|weaponized pathogen|weaponized virus)\b/i
    },
    {
      label: 'illicit or criminal instruction',
      pattern:
        /\b(how to (?:steal|forge|counterfeit|commit (?:a )?crime|make a bomb|build a weapon|hack (?:into|someone)|disable security))\b/i
    }
  ]

  validateAssessmentRequest(dto: CreateAssessmentDto): void {
    const content = dto.domain.trim()

    this.assertEducationalFocus(content, 'assessment domain')
    this.assertNoSensitiveTopics(content, 'assessment domain')
  }

  validateGeneratedQuestions(questions: Array<{ questionText: string }>): void {
    const combined = questions.map((q) => q.questionText).join(' ')

    this.assertNoSensitiveTopics(combined, 'generated questions')
  }

  private assertEducationalFocus(content: string, contextLabel: string): void {
    const normalized = content.toLowerCase()

    if (normalized.length === 0) {
      throw new BadRequestException(
        `The ${contextLabel} cannot be empty. Please provide a valid topic, domain, or skill to assess.`
      )
    }

    const nonEducationalPatterns = [
      /\b(date|dating|romantic relationship|relationship advice)\b/,
      /\b(celebrity|gossip|tabloid)\b/,
      /\b(astrology|horoscope|fortune[-\s]?telling|tarot)\b/,
      /\b(lottery|gambl(?:e|ing)|sports betting|betting odds)\b/
    ]

    if (nonEducationalPatterns.some((pattern) => pattern.test(normalized))) {
      throw new BadRequestException(
        `We can only assist with educational topics. Please remove non-educational requests from your ${contextLabel}.`
      )
    }
  }

  private assertNoSensitiveTopics(content: string, contextLabel: string): void {
    const normalized = content.toLowerCase()

    if (normalized.length === 0) {
      return
    }

    const violations = this.sensitiveTopicRules
      .filter((rule) => rule.pattern.test(normalized))
      .map((rule) => rule.label)

    if (violations.length > 0) {
      throw new BadRequestException(
        `We can only assist with educational topics. Please remove sensitive content related to ${violations.join(', ')} from your ${contextLabel}.`
      )
    }
  }
}
