import moment = require('moment');
import { IOrderReference, IOrder } from '../../interfaces/order';
import { UserReference } from './User';
import { IUserReference } from '../../interfaces/users';

export interface IStripeWebhook {
  id: string;
  order?: IOrderReference;
  customerUser?: IUserReference;
  affiliateUser?: IUserReference;
  type: string;
  webhook: any;
  createdAt?: Date;
}

export class StripeWebhook implements IStripeWebhook {
  public createdAt?: Date;

  constructor(public id: string, public type: string, public webhook: any = {}, public order?: IOrderReference, public customerUser?: IUserReference, public affiliateUser?: IUserReference) {
    this.createdAt = moment().toDate();
  }
}
