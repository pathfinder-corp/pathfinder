import {
  RoadmapPhase,
  RoadmapMilestone,
  RoadmapSummary
} from '../entities/roadmap.entity'
import { GenerateRoadmapDto } from './generate-roadmap.dto'

/**
 * Context passed to generate each phase
 * Contains request info + previously generated phases for continuity
 */
export interface PhaseGenerationContext {
  /** Original roadmap generation request */
  request: GenerateRoadmapDto
  /** Phase number (1-indexed) */
  phaseNumber: number
  /** Total number of phases to generate */
  totalPhases: number
  /** Previously generated phases (for context continuity) */
  previousPhases: RoadmapPhase[]
  /** Roadmap skeleton/overview */
  skeleton?: RoadmapSkeleton
}

/**
 * Result of generating a single phase
 */
export interface PhaseGenerationResult {
  /** Phase number (1-indexed) */
  phaseNumber: number
  /** Generated phase content */
  phase: RoadmapPhase
  /** Token usage for this phase generation */
  tokensUsed?: number
  /** Generation timestamp */
  generatedAt: Date
  /** Retry count if there were failures */
  retryCount: number
}

/**
 * High-level roadmap skeleton generated before phase expansion
 */
export interface RoadmapSkeleton {
  /** Overview of the entire roadmap */
  overview: string
  /** High-level phase titles and outcomes */
  phaseOutlines: Array<{
    title: string
    outcome: string
    estimatedDuration?: string
  }>
  /** Key terminology and concepts to use consistently */
  terminology?: Record<string, string>
}

/**
 * Partial roadmap state during MapReduce generation
 * Used for fault tolerance and progress tracking
 */
export interface PartialRoadmapState {
  /** Request context */
  request: GenerateRoadmapDto
  /** User ID */
  userId: string
  /** Roadmap skeleton */
  skeleton?: RoadmapSkeleton
  /** Successfully generated phases */
  completedPhases: PhaseGenerationResult[]
  /** Phases that failed and need retry */
  failedPhases: number[]
  /** Generation start time */
  startedAt: Date
  /** Last update time */
  updatedAt: Date
  /** Current generation stage */
  stage: 'skeleton' | 'mapping' | 'reducing' | 'completed' | 'failed'
}

/**
 * Final reduced roadmap before entity persistence
 */
export interface ReducedRoadmap {
  summary: RoadmapSummary
  phases: RoadmapPhase[]
  milestones: RoadmapMilestone[]
}
