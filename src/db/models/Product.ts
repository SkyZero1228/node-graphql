import { IProduct, ITierLevel, IProductReference, IProductSetup } from '../../interfaces/product';
import { IDomainReference } from '../../interfaces/domains';
import { IStripeProductReference, IStripePlanReference } from '../../interfaces/stripe';
import { PaymentAccountEnum } from '../../interfaces/product';

export class Product implements IProduct {
  public createdAt?: Date;
  public id?: string;
  public updatedAt?: Date;
  public roles?: string[];
  public sorAccount?: string;

  constructor(
    public amount: number = 0,
    public tierPayouts: ITierLevel[] = null,
    public name: string = '',
    public displayName: string,
    public domain: IDomainReference = null,
    public product: IStripeProductReference,
    public plan: IStripePlanReference,
    public setup: IProductSetup,
    public paymentAccount: PaymentAccountEnum
  ) {}
}

export class ProductReference implements IProductReference {
  constructor(
    public id: string,
    public name: string,
    public displayName: string,
    public amount: number,
    public interval: string,
    public setup: IProductSetup
  ) {}
}
