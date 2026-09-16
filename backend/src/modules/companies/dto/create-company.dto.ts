import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Short slug shown in the pre-login company selector, e.g. "acme-lpg".
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'code must be a lowercase slug (letters, digits, hyphens only)',
  })
  code: string;
}
