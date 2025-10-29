import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter
  private readonly logger = new Logger(MailService.name)

  constructor(private readonly configService: ConfigService) {
    const mailConfig = this.configService.get('mail')

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: {
        user: mailConfig.auth.user,
        pass: mailConfig.auth.pass
      }
    })

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email service connection failed:', error)
      } else {
        this.logger.log('Email service is ready')
      }
    })
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName: string
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontendUrl')
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`
    const mailFrom = this.configService.get('mail.from')

    const html = this.getPasswordResetEmailTemplate(userName, resetLink)

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: 'Đặt Lại Mật Khẩu - Pathfinder',
        html
      })

      this.logger.log(`Password reset email sent to ${to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error)
      throw new Error('Failed to send password reset email')
    }
  }

  private getPasswordResetEmailTemplate(
    userName: string,
    resetLink: string
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: #ffffff;
              border-radius: 12px;
              padding: 40px;
              margin: 20px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              color: #2563eb;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .button {
              display: inline-block;
              padding: 14px 40px;
              background-color: #2563eb;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              margin: 25px 0;
              font-weight: bold;
              font-size: 16px;
              transition: background-color 0.3s;
            }
            .button:hover {
              background-color: #1d4ed8;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 13px;
              color: #6b7280;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 16px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .warning strong {
              color: #92400e;
            }
            .warning ul {
              margin: 10px 0 0 0;
              padding-left: 20px;
            }
            .warning li {
              margin: 5px 0;
              color: #78350f;
            }
            .copy-link {
              background-color: #f3f4f6;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 12px;
              margin: 15px 0;
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
            }
            .copy-link-label {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Yêu Cầu Đặt Lại Mật Khẩu</h1>
            </div>
            
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Pathfinder của bạn.</p>
            
            <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
            
            <div class="button-container">
              <a href="${resetLink}" class="button">Nhấn để đặt lại mật khẩu</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Lưu ý bảo mật:</strong>
              <ul>
                <li>Liên kết này sẽ hết hạn sau <strong>15 phút</strong></li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                <li>Không chia sẻ liên kết này với bất kỳ ai</li>
              </ul>
            </div>

            <p class="copy-link-label">Hoặc sao chép và dán liên kết này vào trình duyệt:</p>
            <div class="copy-link">${resetLink}</div>
            
            <div class="footer">
              <p>Trân trọng,<br><strong>Đội ngũ Pathfinder</strong></p>
              <p style="font-size: 11px; color: #9ca3af; margin-top: 15px;">
                Đây là email tự động. Vui lòng không trả lời email này.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  async sendPasswordResetSuccessEmail(
    to: string,
    userName: string
  ): Promise<void> {
    const mailFrom = this.configService.get('mail.from')

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: #ffffff;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .success-icon {
              text-align: center;
              font-size: 64px;
              margin-bottom: 20px;
            }
            .success-title {
              text-align: center;
              color: #059669;
              margin: 0 0 30px 0;
              font-size: 24px;
            }
            .alert-box {
              background-color: #fef2f2;
              border-left: 4px solid #dc2626;
              padding: 16px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .alert-box p {
              margin: 0;
              color: #991b1b;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h2 class="success-title">Đặt Lại Mật Khẩu Thành Công</h2>
            
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p>Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</p>
            
            <div class="alert-box">
              <p><strong>⚠️ Bảo mật:</strong> Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi ngay lập tức.</p>
            </div>
            
            <div class="footer">
              <p>Trân trọng,<br><strong>Đội ngũ Pathfinder</strong></p>
              <p style="font-size: 11px; color: #9ca3af; margin-top: 15px;">
                Đây là email tự động. Vui lòng không trả lời email này.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: 'Đặt Lại Mật Khẩu Thành Công - Pathfinder',
        html
      })

      this.logger.log(`Password reset success email sent to ${to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error)
    }
  }
}