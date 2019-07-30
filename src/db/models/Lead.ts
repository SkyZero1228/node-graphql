import { ILead, ILeadVisit } from '../../interfaces/lead';
import { IFunnelReference, IFunnelStepReference } from '../../interfaces/funnel';
import { IDomainReference } from '../../interfaces/domains';
import { getNowUtc } from '../../utils';
import { IUserReference } from '../../interfaces/users';
import { IOrderReference } from '../../interfaces/order';
import { IStripeSubscriptionReference } from '../../interfaces/stripe';

export class Lead implements ILead {
  public phone?: string;
  public user?: IUserReference;
  public order?: IOrderReference;
  public subscription?: IStripeSubscriptionReference;
  public createdAt?: Date;
  public updatedAt?: Date;
  public id?: string;

  constructor(public funnel: IFunnelReference, public funnelStep: IFunnelStepReference, public domain: IDomainReference, public ip: string = '', public uuid: string = '', public email: string = '', public name: string = '', public affiliateUserId: string = null) {
    this.createdAt = getNowUtc();
    this.updatedAt = getNowUtc();
  }
}

export class LeadVisit implements ILeadVisit {
  public id?: string;
  public createdAt?: Date;

  constructor(public leadId: string, public funnel: IFunnelReference, public funnelStep: IFunnelStepReference, public domain: IDomainReference, public ip: string, public affiliateUserId: string = null) {
    this.createdAt = getNowUtc();
  }
}
