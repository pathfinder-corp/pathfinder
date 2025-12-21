import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { User } from '../../users/entities/user.entity'
import { MentorApplication } from './mentor-application.entity'

export enum DocumentType {
  CERTIFICATE = 'certificate',
  AWARD = 'award',
  PORTFOLIO = 'portfolio',
  RECOMMENDATION = 'recommendation',
  OTHER = 'other'
}

export enum DocumentVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

@Entity('application_documents')
@Index(['applicationId'])
@Index(['type'])
@Index(['verificationStatus'])
export class ApplicationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string

  @ManyToOne(() => MentorApplication, (app) => app.documents, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'application_id' })
  application?: MentorApplication

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: User

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER
  })
  type: DocumentType

  /**
   * Original filename uploaded by user
   */
  @Column({ name: 'original_filename' })
  originalFilename: string

  /**
   * Stored filename (UUID-based for security)
   */
  @Column({ name: 'stored_filename' })
  storedFilename: string

  /**
   * MIME type of the file
   */
  @Column({ name: 'mime_type' })
  mimeType: string

  /**
   * File size in bytes
   */
  @Column({ name: 'file_size', type: 'int' })
  fileSize: number

  /**
   * Relative path to the stored file (for local storage)
   */
  @Column({ name: 'file_path', nullable: true })
  filePath?: string

  /**
   * ImageKit file ID (for cloud storage)
   */
  @Column({ name: 'imagekit_file_id', nullable: true })
  imagekitFileId?: string

  /**
   * ImageKit URL (for cloud storage)
   */
  @Column({ name: 'imagekit_url', nullable: true })
  imagekitUrl?: string

  /**
   * ImageKit file path (for transformations)
   */
  @Column({ name: 'imagekit_path', nullable: true })
  imagekitPath?: string

  /**
   * User-provided title for the document
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title?: string

  /**
   * User-provided description
   */
  @Column({ type: 'text', nullable: true })
  description?: string

  /**
   * Year the certificate/award was received (optional)
   */
  @Column({ name: 'issued_year', type: 'int', nullable: true })
  issuedYear?: number

  /**
   * Issuing organization (optional)
   */
  @Column({
    name: 'issuing_organization',
    type: 'varchar',
    length: 255,
    nullable: true
  })
  issuingOrganization?: string

  /**
   * Verification status of the document
   */
  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: DocumentVerificationStatus,
    default: DocumentVerificationStatus.PENDING
  })
  verificationStatus: DocumentVerificationStatus

  /**
   * Notes from admin during verification
   */
  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes?: string

  /**
   * Admin who verified the document
   */
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier?: User

  /**
   * Timestamp when document was verified
   */
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date

  /**
   * Display order for documents
   */
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
