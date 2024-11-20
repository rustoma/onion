import { IsNumber, IsString } from 'class-validator';

export class DealMailDTO {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsString()
  url: string;
}
