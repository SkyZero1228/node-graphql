import { ICommission, ICommmissionRevenuShare, ICommissionOrderReference } from '../../interfaces/commission';
import { IUserReference } from '../../interfaces/users';
import { IFunnelReference } from '../../interfaces/funnel';
import { ITierLevel } from '../../interfaces/product';
import { getNowUtc } from '../../utils';
import { IOrderReference } from '../../interfaces/order';
import { IStripeCustomerInvoiceReference } from '../../interfaces/stripe';
import moment = require('moment');

export class Commission implements ICommission {
  public id?: string;

  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(public payCommissionOn: Date = null, public commissionAmount: number = 0, public status: 'Pending' | 'Paid', public customer: IUserReference, public affiliate: IUserReference, public invoice: IStripeCustomerInvoiceReference, public order: IOrderReference, public tier: ITierLevel = null, public revenueShare: ICommmissionRevenuShare = null) {
    this.createdAt = moment().toDate();
    this.updatedAt = moment().toDate();
  }
}

export class CommissionRevenueShare implements ICommmissionRevenuShare {
  constructor(public isRevenueShare: boolean, public revenueShareId: string) {}
}

export class CommissionOrderReference implements ICommissionOrderReference {
  constructor(public orderId: string, public productNames: string, public productAmount: number) {}
}
