import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DealMailDTO } from '@scraper/mail/dto/deal-mail.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendDealMessage(data: DealMailDTO) {
    const { name, price, url } = data;

    await this.mailerService.sendMail({
      to: this.configService.get('EMAIL_SEND_TO'),
      subject: `${name} - new deal!`,
      text: `Pojawił się nowy deal:
      produkt: ${name}
      cena: ${price}
      link: ${url}
      `,
    });
  }

  async sendPriceAlertMessage(data: DealMailDTO) {
    const { name, price, url } = data;

    await this.mailerService.sendMail({
      to: this.configService.get('EMAIL_SEND_TO'),
      subject: `${name} - price alert!`,
      text: `Pojawił się nowy deal:
      produkt: ${name}
      cena: ${price}
      link: ${url}
      `,
    });
  }
}
