import { IOrder, IOrderReference, IOrderDataRow } from '../../interfaces/order';
import { IUserReference } from '../../interfaces/users';
import { IFunnelReference } from '../../interfaces/funnel';
import { IProduct, IProductReference } from '../../interfaces/product';
import { IChargeCustomerResult, IStripeCustomerInvoiceReference, IStripeSubscriptionReference, IStripeChargeReference } from '../../interfaces/stripe';
import { IDomainReference } from '../../interfaces/domains';
import funnel from '../../resolvers/Queries/funnel';
import { ICommission } from '../../interfaces/commission';
import { filter } from 'lodash';

export class Order implements IOrder {
  static filterCommissions(order: IOrder, affiliateId: string) {
    const commissions = filter(order.commissions, commission => {
      return commission.affiliate.id === affiliateId;
    });
    let filteredOrder = new this(order.leadId, order.funnel, order.products, order.totalAmount, order.customer, order.affiliate, order.domain, order.payment, order.invoice, commissions);

    filteredOrder.id = order.id;
    filteredOrder.createdAt = order.createdAt;
    filteredOrder.updatedAt = order.updatedAt;
    filteredOrder.isRevenueShare = order.isRevenueShare;

    return filteredOrder;
  }

  public id?: string;
  public createdAt?: Date;
  public updatedAt?: Date;
  public isRevenueShare?: boolean = false;

  constructor(public leadId: string = '', public funnel: IFunnelReference = null, public products: IProductReference[] = null, public totalAmount: number = 0, public customer: IUserReference = null, public affiliate: IUserReference = null, public domain: IDomainReference, public payment: IStripeChargeReference = null, public invoice: IStripeCustomerInvoiceReference = null, public commissions: ICommission[] = []) {}
}

export class OrderDataRow implements IOrderDataRow {
  static filterCommissions(order: IOrder, affiliateId: string) {
    const commissions = filter(order.commissions, commission => {
      return commission.affiliate.id === affiliateId;
    });
    return new this(order.id, order.leadId, order.funnel, order.products, order.totalAmount, order.customer, commissions);
  }

  public payOn: Date;
  public totalCommissions: number;

  constructor(public id: string, public leadId: string = '', public funnel: IFunnelReference = null, public products: IProductReference[] = null, public totalAmount: number = 0, public customer: IUserReference = null, public commissions: ICommission[] = []) {
    this.totalCommissions = commissions.map(c => c.commissionAmount).reduce((accumulator, currentValue) => accumulator + currentValue);
    this.payOn = commissions[0].payCommissionOn;
  }
}

export class OrderReference implements IOrderReference {
  public funnel?: IFunnelReference;
  constructor(public id: string, public products: IProductReference[], public orderTotal: number) {}
}
