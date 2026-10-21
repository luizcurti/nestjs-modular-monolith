import { Injectable } from '@nestjs/common';

@Injectable()
export class CreditService {
  constructor() {}

  findAll() {
    return 'Hello Credit Engine';
  }
}
