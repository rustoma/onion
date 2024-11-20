import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DealMailDTO } from '@scraper/mail/dto/deal-mail.dto';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendDealMessage(data: DealMailDTO) {
    const { name, price, url } = data;

    await this.mailerService.sendMail({
      to: process.env.EMAIL_SEND_TO,
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
      to: process.env.EMAIL_SEND_TO,
      subject: `${name} - price alert!`,
      text: `Pojawił się nowy deal:
      produkt: ${name}
      cena: ${price}
      link: ${url}
      `,
    });
  }
}
