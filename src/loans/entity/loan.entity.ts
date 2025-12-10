export enum LoanStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
}

export interface Loan {
  id: string;
  userId: string;
  loanAmount: number;
  loanBalance: number;
  collateralAsset: string;
  collateralAmount: number;
  rate: number;
  status: LoanStatus;
  created_at?: Date;
  updated_at?: Date;
  approved_at?: Date | null;
}
