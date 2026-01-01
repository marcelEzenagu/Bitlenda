import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CountryCurrencyService } from './country_currency.service';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('country-currency')
@Controller('country-currency')
export class CountryCurrencyController {
  constructor(
    private readonly countryCurrencyService: CountryCurrencyService,
  ) {}

  // @Get()
  // findAll() {
  //   return this.countryCurrencyService.getCountries();
  // }

  // @Get('load')
  // LoadCountries() {
  //   return this.countryCurrencyService.handleLoadCountry();
  // }

  // @Get(':currencyCode')
  // findOne(@Param('currencyCode') currencyCode: string) {
  //   return this.countryCurrencyService.getExchangeRate(currencyCode);
  // }
}
