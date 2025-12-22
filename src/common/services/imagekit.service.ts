import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import ImageKit from 'imagekit'

export interface ImageKitUploadResult {
  fileId: string
  name: string
  url: string
  thumbnailUrl: string
  filePath: string
  fileType: string
  size: number
  width?: number
  height?: number
}

@Injectable()
export class ImageKitService implements OnModuleInit {
  private readonly logger = new Logger(ImageKitService.name)
  private imagekit: ImageKit | null = null
  private readonly enabled: boolean
  private readonly urlEndpoint: string
  private readonly folder: string

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('imagekit.enabled') ?? false
    this.urlEndpoint =
      this.configService.get<string>('imagekit.urlEndpoint') ??
      'https://ik.imagekit.io/3dteacher'
    this.folder =
      this.configService.get<string>('imagekit.folder') ?? '/mentor-documents'
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('ImageKit is disabled, using local storage')
      return
    }

    const publicKey = this.configService.get<string>('imagekit.publicKey')
    const privateKey = this.configService.get<string>('imagekit.privateKey')

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'ImageKit credentials not configured. Please set IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY'
      )
      return
    }

    this.imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint: this.urlEndpoint
    })

    this.logger.log(`ImageKit initialized with endpoint: ${this.urlEndpoint}`)
  }

  isEnabled(): boolean {
    return this.enabled && this.imagekit !== null
  }

  getUrlEndpoint(): string {
    return this.urlEndpoint
  }

  /**
   * Upload a file to ImageKit
   */
  async upload(
    file: Buffer,
    fileName: string,
    options?: {
      folder?: string
      tags?: string[]
      customMetadata?: Record<string, string>
    }
  ): Promise<ImageKitUploadResult> {
    if (!this.imagekit) {
      throw new Error('ImageKit is not initialized')
    }

    const folder = options?.folder ?? this.folder

    try {
      const response = await this.imagekit.upload({
        file: file.toString('base64'),
        fileName,
        folder,
        tags: options?.tags,
        useUniqueFileName: true
      })

      this.logger.debug(`File uploaded to ImageKit: ${response.url}`)

      return {
        fileId: response.fileId,
        name: response.name,
        url: response.url,
        thumbnailUrl: response.thumbnailUrl,
        filePath: response.filePath,
        fileType: response.fileType,
        size: response.size,
        width: response.width,
        height: response.height
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error)

      this.logger.error(
        `Failed to upload file to ImageKit: ${message}`,
        error instanceof Error ? error.stack : undefined
      )
      throw error
    }
  }

  /**
   * Delete a file from ImageKit
   */
  async delete(fileId: string): Promise<void> {
    if (!this.imagekit) {
      throw new Error('ImageKit is not initialized')
    }

    try {
      await this.imagekit.deleteFile(fileId)
      this.logger.debug(`File deleted from ImageKit: ${fileId}`)
    } catch (error) {
      this.logger.error(`Failed to delete file from ImageKit: ${error}`)
      throw error
    }
  }

  /**
   * Get URL with transformations
   */
  getUrl(
    filePath: string,
    transformations?: Array<{
      width?: number
      height?: number
      quality?: number
      format?: string
      crop?: string
    }>
  ): string {
    if (!this.imagekit) {
      // Fallback to direct URL construction
      return `${this.urlEndpoint}${filePath}`
    }

    return this.imagekit.url({
      path: filePath,
      transformation: transformations?.map((t) => ({
        width: t.width?.toString(),
        height: t.height?.toString(),
        quality: t.quality?.toString(),
        format: t.format,
        crop: t.crop
      }))
    })
  }

  /**
   * Get thumbnail URL (300x300, cropped)
   */
  getThumbnailUrl(filePath: string): string {
    return this.getUrl(filePath, [
      { width: 300, height: 300, crop: 'at_max', quality: 80 }
    ])
  }

  /**
   * Get optimized URL for web
   */
  getOptimizedUrl(filePath: string, maxWidth = 1200): string {
    return this.getUrl(filePath, [
      { width: maxWidth, quality: 85, format: 'auto' }
    ])
  }
}

