import { BadRequestException } from '@nestjs/common'

import { ExperienceLevel, LearningPace } from './dto/generate-roadmap.dto'
import { RoadmapInsightRequestDto } from './dto/roadmap-insight.dto'
import { RoadmapContentPolicyService } from './roadmap-content-policy.service'

describe('RoadmapContentPolicyService', () => {
  let service: RoadmapContentPolicyService

  beforeEach(() => {
    service = new RoadmapContentPolicyService()
  })

  describe('validateRoadmapRequest', () => {
    it('allows educational requests', () => {
      expect(() =>
        service.validateRoadmapRequest({
          topic: 'Full-stack web developer',
          targetOutcome: 'Become a front-end engineer',
          experienceLevel: ExperienceLevel.BEGINNER,
          learningPace: LearningPace.BALANCED,
          timeframe: '6 months',
          preferences: 'Looking for project-based learning resources'
        })
      ).not.toThrow()
    })

    it('rejects roadmap requests containing sensitive topics', () => {
      expect(() =>
        service.validateRoadmapRequest({
          topic: 'How to make a bomb',
          targetOutcome: 'understand explosives',
          experienceLevel: ExperienceLevel.BEGINNER,
          learningPace: LearningPace.BALANCED,
          timeframe: '2 weeks',
          preferences: 'hands-on practice'
        })
      ).toThrow(BadRequestException)
    })

    it('rejects roadmap requests that lack an educational focus', () => {
      expect(() =>
        service.validateRoadmapRequest({
          topic: 'Plan the perfect romantic date night',
          targetOutcome: 'Make the evening unforgettable',
          experienceLevel: ExperienceLevel.BEGINNER,
          learningPace: LearningPace.FLEXIBLE,
          timeframe: '1 day',
          preferences: 'Surprise elements'
        })
      ).toThrow(BadRequestException)
    })
  })

  describe('validateInsightRequest', () => {
    const baseInsight: RoadmapInsightRequestDto = {
      question: 'How should I practice JavaScript this week?',
      phaseTitle: 'Foundations',
      stepTitle: 'Core language skills'
    }

    it('allows educational follow-up questions', () => {
      expect(() =>
        service.validateInsightRequest(baseInsight, {
          roadmapTopic: 'Full-stack web developer'
        })
      ).not.toThrow()
    })

    it('rejects insight requests about sensitive content', () => {
      expect(() =>
        service.validateInsightRequest(
          {
            ...baseInsight,
            question: 'Can you explain how to build a weapon?'
          },
          { roadmapTopic: 'Mechanical engineering' }
        )
      ).toThrow(BadRequestException)
    })

    it('rejects insight requests that are clearly not educational', () => {
      expect(() =>
        service.validateInsightRequest(
          {
            ...baseInsight,
            question: 'What are the best dating tips for introverts?'
          },
          { roadmapTopic: 'Social skills' }
        )
      ).toThrow(BadRequestException)
    })
  })
})
