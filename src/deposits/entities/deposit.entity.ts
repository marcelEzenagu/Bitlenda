export class Deposit {}

export enum DepositStatus {
  PENDING = 0,
  COMPLETED = 1,
}

export interface TokenDeposit {
  id: string;
  userId: string;
  amount: number;
  coin: string;
  txID: string;
  address: string;
  memo: string;
  network: string;
  price: number;
  status: DepositStatus;
  created_at?: Date;
  updated_at?: Date;
}
export interface FiatDeposit {
  id: string;
  userId: string;
  amount: number;
  coin: string;
  txID: string;
  address: string;
  memo: string;
  network: string;
  price: number;
  status: DepositStatus;
  created_at?: Date;
  updated_at?: Date;
}
