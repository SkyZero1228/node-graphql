import { IRevenueShare, IRevenueShareOrder } from '../../interfaces/revenueShares';
import { IFunnelReference } from '../../interfaces/funnel';
import { IUserReference } from '../../interfaces/users';
import { IOrderReference } from '../../interfaces/order';
import { getNowUtc } from '../../utils';

export class RevenueShare implements IRevenueShare {
  public id?: string;
  public userRole?: string;
  public funnel?: IFunnelReference;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(public user: IUserReference, public daysToPayCommission: number, public commissionType: 'Percentage' | 'Fixed Amount', public commissionAmount: number) {
    this.createdAt = getNowUtc();
    this.updatedAt = getNowUtc();
  }
}

export class RevenueShareOrder implements IRevenueShareOrder {
  public id?: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(public revenueShareId: string, public user: IUserReference, public order: IOrderReference, public daysToPayCommission: number, public commissions: string[], public totalCommissions: number) {
    this.createdAt = getNowUtc();
    this.updatedAt = getNowUtc();
  }
}
