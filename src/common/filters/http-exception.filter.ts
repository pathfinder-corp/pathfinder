import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined

    const message = (() => {
      if (exceptionResponse === undefined) return 'Internal server error'

      if (typeof exceptionResponse === 'string') return exceptionResponse

      const extracted = exceptionResponse as Record<string, unknown>

      if (Array.isArray(extracted?.message)) {
        return extracted.message
      }

      if (typeof extracted?.message === 'string') {
        return extracted.message
      }

      return 'Unexpected error'
    })()

    const errorName =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>).error
        : undefined

    const payload = {
      statusCode: status,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url
    }

    const logMessage = Array.isArray(message) ? message.join(', ') : message

    this.logger.error(
      `[${request.method}] ${request.url} -> ${status} ${logMessage}`,
      exception instanceof Error ? exception.stack : undefined
    )

    response.status(status).json(payload)
  }
}
