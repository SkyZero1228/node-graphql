import { IUserReference } from './users';
import { IFunnelReference } from './funnel';
import { ITierLevel } from './product';
import { IStripeCustomerInvoiceReference } from './stripe';
import { IOrderReference } from './order';

export interface ICommission {
  id?: string;
  customer: IUserReference;
  affiliate: IUserReference;
  tier: ITierLevel;
  payCommissionOn: Date;
  commissionAmount: number;
  status: 'Pending' | 'Paid';
  invoice: IStripeCustomerInvoiceReference;
  order: IOrderReference;
  revenueShare: ICommmissionRevenuShare;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICommmissionRevenuShare {
  isRevenueShare: boolean;
  revenueShareId: string;
}

export interface IGetCommission {
  skip?: number;
  pageSize?: number;
  searchText: string;
  isAffiliate: boolean;
  dateFilter?: IDateFilter;
}

export interface IDateFilter {
  value: Date;
  filter: String;
}

export interface ICommissionArgs {
  commission: ICommission;
}

export interface ICommissionOrderReference {
  orderId: string;
  productNames: string;
  productAmount: number;
}

export interface ICommissionTotal {
  userId: string;
  commissionAmount: number;
}
export interface IGetAllCommissions {
  commissions: ICommission[];
  totalCommissionPaid: number;
  totalCommissionPending: number;
  totalRows: number;
}

export interface IDownloadCommissions {
  firstName: string;
  lastName: string;
  email: string;
  payCommissionOn: Date;
  commissionAmount: number;
  count: number;
}

export interface ICommissionResult {
  success: boolean;
  message: string;
}
