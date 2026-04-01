export interface Payment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export type RateType = 'mensile' | 'bimestrale' | 'trimestrale' | 'quadrimestrale' | 'semestrale' | 'annuale';

export interface Financing {
  id: string;
  name: string;
  emoji: string;
  totalAmount: number;
  totalMonths: number;
  rateType: RateType;
  rateMode: 'fissa' | 'variabile';
  startDate: string;
  endDate: string;
  initialPaidRates: number;
  initialPaid: number;
  payments: Payment[];
  fixedRateAmount?: number;
  interestPerRate?: number;
  totalInterest?: number;
}
