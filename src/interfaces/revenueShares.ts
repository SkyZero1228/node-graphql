import { IFunnelReference } from './funnel';
import { IUserReference } from './users';
import { IOrderReference } from './order';
import { dateResolver } from '../resolvers/Scalars/date';

export interface IRevenueShare {
  id?: string;
  funnel?: IFunnelReference;
  user: IUserReference;
  userRole?: string;
  daysToPayCommission: number;
  commissionType: 'Percentage' | 'Fixed Amount';
  commissionAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRevenueShareOrder {
  id?: string;
  revenueShareId: string;
  user: IUserReference;
  order: IOrderReference;
  commissions: string[];
  totalCommissions: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAddRevenueShareArgs {
  revenueShare: IRevenueShare;
}
