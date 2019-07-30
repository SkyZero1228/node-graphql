import { IFunnel, IFunnelStep, IFunnelReference, IFunnelStepReference, IPromoCode, IFunnelStepProduct } from '../../interfaces/funnel';
import { IDomainReference } from '../../interfaces/domains';
import { getNowUtc } from '../../utils';
import { IProductReference, IProductSetup } from '../../interfaces/product';

export class Funnel implements IFunnel {
  public createdAt?: Date;
  public id?: string;
  public updatedAt?: Date;
  public pastUrls?: string[];

  constructor(public title: string = '', public active: boolean = false, public hidden: boolean = false, public funnelSteps: IFunnelStep[] = null, public domain: IDomainReference = null) {}
}

export class FunnelStep implements IFunnelStep {
  constructor(public stepOrder: number, public url: string, public nextFunnelStepUrl: string, public products: IFunnelStepProduct[]) {}
}

export class FunnelReference implements IFunnelReference {
  constructor(public id: string, public title: string) {}
}

export class FunnelStepReference implements IFunnelStepReference {
  constructor(public stepOrder: number, public url: string) {}
}

export class FunnelStepProduct implements IFunnelStepProduct {
  static fromObject(data: IFunnelStepProduct) {
    return new this(data.id, data.displayName, data.amount, data.interval, data.setup, data.promoCodes);
  }
  constructor(public id: string, public displayName: string, public amount: number, public interval: string, public setup: IProductSetup, public promoCodes: IPromoCode[]) {}
}

export class PromoCode implements IPromoCode {
  static fromObject(data: IPromoCode) {
    return new this(data.code, data.discountType, data.discountAmount, data.maxUse, data.currentUse, data.startDate, data.endDate, data.product);
  }

  constructor(public code: string, public discountType: 'Percent' | 'Monetary' | 'Product' | 'Setup Fee', public discountAmount: number, public maxUse: number, public currentUse: number, public startDate: Date = null, public endDate: Date = null, public product: IProductReference = null) {}
}
