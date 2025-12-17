import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { CreateApplicationDto } from '../dto/create-application.dto'
import { ContentValidatorService } from './content-validator.service'

describe('ContentValidatorService', () => {
  let service: ContentValidatorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentValidatorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config: Record<string, any> = {
                'mentorship.contentValidation.spamKeywords': [
                  'buy now',
                  'click here',
                  'limited offer'
                ],
                'mentorship.contentValidation.minQualityScore': 60
              }
              return config[key] ?? defaultValue
            })
          }
        }
      ]
    }).compile()

    service = module.get<ContentValidatorService>(ContentValidatorService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('validateApplication', () => {
    const validDto: CreateApplicationDto = {
      headline: 'Senior Software Engineer with 10 years experience',
      bio: 'I am a passionate software engineer with extensive experience in web development, cloud architecture, and team leadership. I love mentoring junior developers and helping them grow in their careers.',
      expertise: ['Software Engineering', 'Cloud Architecture'],
      skills: ['TypeScript', 'Node.js', 'AWS'],
      languages: ['English', 'Spanish'],
      yearsExperience: 10,
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      portfolioUrl: 'https://johndoe.dev',
      motivation:
        'I want to give back to the developer community and help aspiring engineers learn from my experiences and avoid common pitfalls in their journey.'
    }

    it('should return high score for valid application', () => {
      const result = service.validateApplication(validDto)

      expect(result.score).toBeGreaterThan(60)
      expect(result.shouldFlag).toBe(false)
      expect(result.flags).toEqual([])
    })

    it('should flag application with repeated characters', () => {
      const dto: CreateApplicationDto = {
        ...validDto,
        bio: 'aaaaaaaaaa This is spam content'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('repeated-characters')
      expect(result.score).toBeLessThan(100)
    })

    it('should flag application with spam keywords', () => {
      const dto: CreateApplicationDto = {
        ...validDto,
        motivation: 'Click here to buy now! Limited offer for mentorship.'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('spam-keywords')
      expect(result.score).toBeLessThan(100)
      expect(result.shouldFlag).toBe(true)
    })

    it('should flag application with suspicious URLs (non-HTTPS)', () => {
      const dto: CreateApplicationDto = {
        ...validDto,
        linkedinUrl: 'http://suspicious-site.com'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('suspicious-urls')
      expect(result.score).toBeLessThan(100)
    })

    it('should flag application with URL shorteners', () => {
      const dto: CreateApplicationDto = {
        ...validDto,
        portfolioUrl: 'https://bit.ly/abc123'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('suspicious-urls')
    })

    it('should flag application with low word diversity', () => {
      const dto: CreateApplicationDto = {
        headline: 'word word word word word',
        bio: 'word word word word word word word word word word word word word word word',
        expertise: ['Test'],
        skills: ['Test'],
        languages: ['English'],
        yearsExperience: 5,
        motivation: 'word word word word word word word word word word'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('low-diversity')
    })

    it('should flag application with excessive special characters', () => {
      const dto: CreateApplicationDto = {
        headline: '!!!###$$$%%%&&&*** Special chars ***&&&%%%$$$###!!!',
        bio: '!!!###$$$%%%&&&*** Too many specials ***&&&%%%$$$###!!!',
        expertise: ['Test'],
        skills: ['Test'],
        languages: ['English'],
        yearsExperience: 5,
        motivation: '!!!###$$$%%%&&&*** chars everywhere ***&&&%%%$$$###!!!'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('excessive-special-chars')
    })

    it('should flag application with gibberish content', () => {
      const dto: CreateApplicationDto = {
        headline: 'xyzptklmnbvcxzqwrtyp',
        bio: 'xyzptklmnbvcxzqwrtypdfgh jklmnbvcxzasdfghjklqwertyuiop xyzptklmnbvcxzqwrtypdfgh',
        expertise: ['Test'],
        skills: ['Test'],
        languages: ['English'],
        yearsExperience: 5,
        motivation: 'xyzptklmnbvcxzqwrtypdfgh jklmnbvcxzasdfghjklqwertyuiop'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('gibberish')
    })

    it('should flag application that is too short', () => {
      const dto: CreateApplicationDto = {
        headline: 'Short',
        bio: 'Too short',
        expertise: ['Test'],
        skills: ['Test'],
        languages: ['English'],
        yearsExperience: 1,
        motivation: 'Brief'
      }

      const result = service.validateApplication(dto)

      expect(result.flags).toContain('too-short')
      expect(result.score).toBeLessThanOrEqual(80)
    })

    it('should handle multiple flags and return appropriate score', () => {
      const dto: CreateApplicationDto = {
        ...validDto,
        headline: 'Click here!!!',
        bio: 'Buy now aaaaaaaaaa',
        motivation: 'Limited offer',
        linkedinUrl: 'http://bit.ly/spam'
      }

      const result = service.validateApplication(dto)

      expect(result.flags.length).toBeGreaterThan(2)
      expect(result.score).toBeLessThan(60)
      expect(result.shouldFlag).toBe(true)
      expect(result.reason).toContain('Flags:')
    })

    it('should ensure score never goes below 0', () => {
      const dto: CreateApplicationDto = {
        ...validDto,
        headline: 'aaaaaaaaaaClick here!!!',
        bio: 'Buy now limited offer aaaaaaaaaaClick here!!! word word word word word',
        motivation: 'xyzptklmnbvcxzqwrtypdfgh',
        linkedinUrl: 'http://bit.ly/spam',
        portfolioUrl: 'http://t.co/spam'
      }

      const result = service.validateApplication(dto)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })
})
