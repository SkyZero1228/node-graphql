import { IFunnelReference } from './funnel';
import { IProduct, IProductReference } from './product';
import { IUserReference } from './users';
import { IStripeCustomerInvoiceReference, IChargeCustomerResult, IStripeSubscriptionReference, IStripeChargeReference } from './stripe';
import { IDomainReference } from './domains';
import { IPayment } from '../db/models/Event';
import { ICommission } from './commission';

export interface IOrder {
  id?: string;
  leadId?: string;
  customer: IUserReference;
  affiliate?: IUserReference;
  funnel?: IFunnelReference;
  products: IProductReference[];
  invoice: IStripeCustomerInvoiceReference;
  domain: IDomainReference;
  payment: IStripeChargeReference;
  commissions: ICommission[];
  totalAmount: number;
  isRevenueShare?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderDataRow {
  id?: string;
  leadId?: string;
  customer: IUserReference;
  funnel?: IFunnelReference;
  products: IProductReference[];
  totalAmount: number;
  totalCommissions: number;
  payOn: Date;
}

export interface IOrderDataRowResponse {
  orders: IOrderDataRow[];
  totalRows: number;
}

export interface IOrderReference {
  id: string;
  funnel?: IFunnelReference;
  products: IProductReference[];
  orderTotal: number;
}

export interface IOrderArgs {
  order: IOrder;
}

export interface IGetAllOrders {
  orders: IOrder[];
  totalRows: number;
}
