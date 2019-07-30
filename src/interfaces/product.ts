import { IDomainReference } from './domains';
import { IStripeProductReference, IStripePlanSummary, IStripePlanReference } from './stripe';

export interface IProduct {
  id?: string;
  amount: number;
  domain: IDomainReference;
  name: string;
  displayName: string;
  tierPayouts: ITierLevel[];
  roles?: string[];
  sorAccount?: string;
  product: IStripeProductReference;
  plan: IStripePlanReference;
  setup: IProductSetup;
  paymentAccount: PaymentAccountEnum;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductSetup {
  fee: number;
  description: string;
}

export interface ITierLevel {
  id: string;
  level: number;
  commissionType: string;
  value: number;
  daysToPayCommission: number;
}

export interface IProductReference {
  id: string;
  name: string;
  displayName: string;
  amount: number;
  interval: string;
  setup: IProductSetup;
}

export interface IAllProducts {
  product: IProduct[];
  totalRows: number;
}
export interface IProductArgs {
  product: IProduct;
}

export interface DomainProductRolesSorAccount {
  domain: IDomainReference[];
  product: IProduct;
  role: string[];
  sorAccount: string[];
}

export enum PaymentAccountEnum {
  TripValetLLC = 'TripValetLLC',
  GetMotivated = 'GetMotivated',
  TripValetGeneral = 'TripValetGeneral',
  CiceroTravel = 'CiceroTravel',
  TripValetIncentives = 'TripValetIncentives'
}
