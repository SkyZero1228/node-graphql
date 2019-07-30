import { IFunnelReference, IFunnelStepReference, IFunnelStep } from './funnel';
import { IDomainReference } from './domains';
import { IUserReference, IUserSubscription } from './users';
import { IOrderReference } from './order';
import { IStripeSubscriptionReference } from './stripe';

export interface ILead {
  id?: string;
  ip: string;
  affiliateUserId?: string;
  uuid: string;
  funnel: IFunnelReference;
  funnelStep: IFunnelStepReference;
  domain: IDomainReference;
  user?: IUserReference;
  order?: IOrderReference;
  subscription?: IStripeSubscriptionReference;
  email: string;
  phone?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILeadArgs {
  lead: ILead;
}

export interface ILeadVisit {
  id?: string;
  leadId: string;
  affiliateUserId?: string;
  ip: string;
  funnel: IFunnelReference;
  funnelStep: IFunnelStepReference;
  domain: IDomainReference;
  createdAt?: Date;
}

export interface IUpdateLeadArgs {
  aid: string;
  fid: string;
  step: number;
  luid: string;
  email: string;
}

export interface IUpdateLeadResponse {
  next: string;
  nextFunnelStep: IFunnelStep;
}

export interface IResult {
  success: boolean;
  message: string;
}
