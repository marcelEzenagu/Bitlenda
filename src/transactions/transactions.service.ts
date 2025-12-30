import { Inject, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { KNEX_CONNECTION } from 'src/database/knex.config';
import { Knex } from 'knex';

@Injectable()
export class TransactionsService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}
  create(createTransactionDto: CreateTransactionDto) {
    return 'This action adds a new transaction';
  }

  findAllBankDeposit() {
    return `This action returns all transactions`;
  }
  findAllCryptoDeposit() {
    return `This action returns all transactions`;
  }
  findAllWithdrawals() {
    return `This action returns all transactions`;
  }
}
