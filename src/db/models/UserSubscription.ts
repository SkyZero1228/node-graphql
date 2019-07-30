import { IStripeCustomerReference, IStripePlanSummary, IStripeProductReference } from '../../interfaces/stripe';
import { IUserReference, IUserSubscription, IUserStripeSubscription, IUserCrypto } from '../../interfaces/users';
import { getNowUtc } from '../../utils';

export class UserSubscription implements IUserSubscription {
  public id?: string;
  public crypto?: IUserCrypto;
  public createdAt?: Date;
  public updatedAt?: Date;
  public isRevenueShare?: boolean = false;
  public referrerCode?: string;

  constructor(
    public type: 'Stripe' | 'Crypto',
    public user: IUserReference,
    public subscriptionId: string,
    public status: string,
    public start: Date,
    public currentPeriodStart: Date,
    public currentPeriodEnd: Date,
    public paymentAccountKey: string,
    public stripe: IUserStripeSubscription = null,
    public affiliate: IUserReference = null
  ) {
    this.createdAt = getNowUtc();
    this.updatedAt = getNowUtc();
  }
}
