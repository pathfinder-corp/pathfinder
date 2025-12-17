import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter
  private readonly logger = new Logger(MailService.name)

  constructor(private readonly configService: ConfigService) {
    const mailConfig = this.configService.get('mail')

    if (mailConfig?.host && mailConfig?.auth?.user && mailConfig?.auth?.pass) {
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
    } else {
      this.logger.warn(
        'Mail service is not fully configured. Emails will not be sent.'
      )
    }
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userFirstName: string,
    expiryMinutes: number
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontendUrl')
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`
    const mailFrom = this.configService.get('mail.from')

    const html = this.getPasswordResetEmailTemplate(
      userFirstName,
      resetLink,
      expiryMinutes
    )

    if (!this.transporter) {
      this.logger.warn(
        'Attempted to send password reset email without a configured transporter'
      )
      return
    }

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: 'Reset your password',
        html
      })

      this.logger.log(`Password reset email sent to ${to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error)
      throw new Error('Failed to send password reset email')
    }
  }

  private getPasswordResetEmailTemplate(
    userFirstName: string,
    resetLink: string,
    expiryMinutes: number
  ): string {
    return `
    <table
  role="presentation"
  class="container"
  width="100%"
  cellpadding="0"
  cellspacing="0"
>
  <tr>
    <td align="center">
      <table
        role="presentation"
        class="email-wrap"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="max-width: 600px"
      >
        <tr>
          <td style="background: #0b0b0b; padding: 28px; border-radius: 8px">
            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
            >
              <tr>
                <td
                  style="
                    color: #d6d6d6;
                    font-size: 14px;
                    line-height: 20px;
                    padding-bottom: 18px;
                  "
                >
                  Hi ${userFirstName}, we received a request to reset your
                  password. Use the button below to proceed. If you didn't
                  request this, you can ignore this message. This link will
                  expire in ${expiryMinutes} minutes.
                </td>
              </tr>

              <tr>
                <td align="left" style="padding-bottom: 14px">
                  <!-- Light button on dark background (bordered) -->
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        align="center"
                        style="border-radius: 6px; background: #ffffff"
                      >
                        <a
                          href="${resetLink}"
                          class="btn"
                          target="_blank"
                          style="
                            display: inline-block;
                            padding: 12px 20px;
                            color: #111111;
                            font-weight: 600;
                            text-decoration: none;
                            border-radius: 6px;
                          "
                          >Reset password</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="color: #8f8f8f; font-size: 12px; line-height: 18px">
                  If the button doesn't work, copy and paste this link into your
                  browser:<br /><a
                    href="${resetLink}"
                    style="color: #ffffff; word-break: break-all"
                    >${resetLink}</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td
            style="
              padding-top: 12px;
              text-align: center;
              color: #9b9b9b;
              font-size: 12px;
            "
          >
            © ${new Date().getFullYear()} Pathfinder. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`
  }

  async sendPasswordResetSuccessEmail(
    to: string,
    userFirstName: string
  ): Promise<void> {
    const mailFrom = this.configService.get('mail.from')

    const html = `
      <table
      role="presentation"
      class="container"
      width="100%"
      cellpadding="0"
      cellspacing="0"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            class="email-wrap"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="max-width: 600px"
          >
            <tr>
              <td style="background: #0b0b0b; padding: 28px; border-radius: 8px">
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                >
                  <tr>
                    <td
                      style="
                        color: #d6d6d6;
                        font-size: 14px;
                        line-height: 20px;
                        padding-bottom: 18px;
                      "
                    >
                      Hi ${userFirstName}, your password has been successfully reset. You can now sign in to your account using your new password.
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        color: #d6d6d6;
                        font-size: 14px;
                        line-height: 20px;
                        padding-bottom: 18px;
                      "
                    >
                      If you did not make this change, please contact our support team immediately to secure your account.
                    </td>
                  </tr>

                  <tr>
                    <td style="color: #8f8f8f; font-size: 12px; line-height: 18px">
                      For your security, we recommend using a strong, unique password and enabling two-factor authentication if available.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding-top: 12px;
                  text-align: center;
                  color: #9b9b9b;
                  font-size: 12px;
                "
              >
                © ${new Date().getFullYear()} Pathfinder. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    `

    if (!this.transporter) {
      this.logger.warn(
        'Attempted to send password reset success email without a configured transporter'
      )
      return
    }

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: 'Your password has been reset',
        html
      })

      this.logger.log(`Password reset success email sent to ${to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error)
    }
  }

  async sendEmailVerification(
    to: string,
    token: string,
    firstName: string
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Mail transporter not configured. Skipping email.')
      return
    }

    const frontendUrl = this.configService.get<string>('frontendUrl')
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`
    const mailFrom = this.configService.get('mail.from')

    const html = this.getEmailVerificationTemplate(firstName, verifyLink)

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: 'Verify your email address',
        html
      })

      this.logger.log(`Email verification sent to ${to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error)
      throw new Error('Failed to send email verification')
    }
  }

  private getEmailVerificationTemplate(
    firstName: string,
    verifyLink: string
  ): string {
    return `
    <table
  role="presentation"
  class="container"
  width="100%"
  cellpadding="0"
  cellspacing="0"
>
  <tr>
    <td align="center">
      <table
        role="presentation"
        class="email-wrap"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="max-width: 600px"
      >
        <tr>
          <td style="background: #0b0b0b; padding: 28px; border-radius: 8px">
            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
            >
              <tr>
                <td
                  style="
                    color: #d6d6d6;
                    font-size: 14px;
                    line-height: 20px;
                    padding-bottom: 18px;
                  "
                >
                  Hi ${firstName}, thank you for signing up! Please verify your
                  email address by clicking the button below. If you didn't create
                  an account, you can safely ignore this email. This link will
                  expire in 24 hours.
                </td>
              </tr>

              <tr>
                <td align="left" style="padding-bottom: 14px">
                  <!-- Light button on dark background (bordered) -->
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        align="center"
                        style="border-radius: 6px; background: #ffffff"
                      >
                        <a
                          href="${verifyLink}"
                          class="btn"
                          target="_blank"
                          style="
                            display: inline-block;
                            padding: 12px 20px;
                            color: #111111;
                            font-weight: 600;
                            text-decoration: none;
                            border-radius: 6px;
                          "
                          >Verify email address</a
                        >
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="color: #8f8f8f; font-size: 12px; line-height: 18px">
                  If the button doesn't work, copy and paste this link into your
                  browser:<br /><a
                    href="${verifyLink}"
                    style="color: #ffffff; word-break: break-all"
                    >${verifyLink}</a
                  >
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td
            style="
              padding-top: 12px;
              text-align: center;
              color: #9b9b9b;
              font-size: 12px;
            "
          >
            © ${new Date().getFullYear()} Pathfinder. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
    `
  }
}
