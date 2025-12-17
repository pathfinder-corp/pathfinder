import { Injectable } from '@nestjs/common'

import { MentorProfile } from '../../mentor-profiles/entities/mentor-profile.entity'
import { StudentPreferenceData } from '../../student-preferences/entities/student-preference.entity'
import {
  ScoringResult,
  ScoringStrategy
} from '../interfaces/scoring-strategy.interface'

@Injectable()
export class RuleBasedScoringStrategy implements ScoringStrategy {
  getName(): string {
    return 'rule-based'
  }

  async score(
    preferences: StudentPreferenceData,
    mentor: MentorProfile
  ): Promise<ScoringResult> {
    const breakdown = {
      skillsMatch: 0,
      expertiseMatch: 0,
      languageMatch: 0,
      experienceMatch: 0
    }
    const reasons: string[] = []

    // Skills match (weight: 30)
    if (preferences.skills && preferences.skills.length > 0) {
      const mentorSkillsLower = mentor.skills.map((s) => s.toLowerCase())
      const matchedSkills = preferences.skills.filter((s) =>
        mentorSkillsLower.includes(s.toLowerCase())
      )
      breakdown.skillsMatch = Math.round(
        (matchedSkills.length / preferences.skills.length) * 30
      )
      if (matchedSkills.length > 0) {
        reasons.push(`Matches ${matchedSkills.length} of your desired skills`)
      }
    } else {
      breakdown.skillsMatch = 20 // Neutral score when no preference
    }

    // Expertise/domain match (weight: 30)
    if (preferences.domains && preferences.domains.length > 0) {
      const mentorExpertiseLower = mentor.expertise.map((e) => e.toLowerCase())
      const matchedDomains = preferences.domains.filter((d) =>
        mentorExpertiseLower.some(
          (e) => e.includes(d.toLowerCase()) || d.toLowerCase().includes(e)
        )
      )
      breakdown.expertiseMatch = Math.round(
        (matchedDomains.length / preferences.domains.length) * 30
      )
      if (matchedDomains.length > 0) {
        reasons.push(
          `Expert in ${matchedDomains.length} of your interest areas`
        )
      }
    } else {
      breakdown.expertiseMatch = 20
    }

    // Language match (weight: 20)
    const studentLanguages =
      preferences.languages ??
      (preferences.language ? [preferences.language] : [])
    if (studentLanguages.length > 0) {
      const mentorLangsLower = mentor.languages.map((l) => l.toLowerCase())
      const matchedLangs = studentLanguages.filter((l) =>
        mentorLangsLower.includes(l.toLowerCase())
      )
      if (matchedLangs.length > 0) {
        breakdown.languageMatch = 20
        reasons.push(`Speaks ${matchedLangs.join(', ')}`)
      }
    } else {
      breakdown.languageMatch = 15
    }

    // Experience match (weight: 20)
    if (
      preferences.minYearsExperience !== undefined &&
      mentor.yearsExperience
    ) {
      if (mentor.yearsExperience >= preferences.minYearsExperience) {
        breakdown.experienceMatch = 20
        reasons.push(`${mentor.yearsExperience}+ years of experience`)
      } else {
        breakdown.experienceMatch = Math.round(
          (mentor.yearsExperience / preferences.minYearsExperience) * 20
        )
      }
    } else if (mentor.yearsExperience) {
      breakdown.experienceMatch = Math.min(mentor.yearsExperience * 2, 20)
      if (mentor.yearsExperience >= 5) {
        reasons.push(`${mentor.yearsExperience} years of experience`)
      }
    } else {
      breakdown.experienceMatch = 10
    }

    // Industry match bonus (not weighted, adds to total)
    if (preferences.industries && preferences.industries.length > 0) {
      const mentorIndustriesLower = mentor.industries.map((i) =>
        i.toLowerCase()
      )
      const matchedIndustries = preferences.industries.filter((i) =>
        mentorIndustriesLower.includes(i.toLowerCase())
      )
      if (matchedIndustries.length > 0) {
        reasons.push(`Industry experience in ${matchedIndustries.join(', ')}`)
      }
    }

    const totalScore =
      breakdown.skillsMatch +
      breakdown.expertiseMatch +
      breakdown.languageMatch +
      breakdown.experienceMatch

    return {
      mentorId: mentor.id,
      score: totalScore,
      breakdown,
      reasons
    }
  }
}
