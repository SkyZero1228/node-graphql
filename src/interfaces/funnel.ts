import { IProductReference, IProductSetup } from './product';
import { IDomainReference } from './domains';
import { IUserBasics } from './users';
import { ICertificateReference } from './certificates';

export interface IFunnel {
  id?: string;
  title: string;
  active: boolean;
  hidden: boolean;
  funnelSteps: IFunnelStep[];
  createdAt?: Date;
  domain: IDomainReference;
  pastUrls?: string[];
  updatedAt?: Date;
}

export interface IFunnelStep {
  stepOrder: number;
  url: string;
  products: IFunnelStepProduct[];
  nextFunnelStepUrl: string;
}

export interface IFunnelStepProduct {
  id: string;
  displayName: string;
  amount: number;
  interval: string;
  setup: IProductSetup;
  promoCodes?: IPromoCode[];
  certificates?: ICertificateReference[];
}

export interface IPromoCode {
  code: string;
  discountType?: 'Percent' | 'Monetary' | 'Product' | 'Setup Fee';
  discountAmount?: number;
  maxUse?: number;
  currentUse?: number;
  startDate?: Date;
  endDate?: Date;
  product?: IProductReference;
}

export interface IFunnelReference {
  id: string;
  title: string;
}

export interface IFunnelStepReference {
  stepOrder: number;
  url: string;
}

export interface IFunnelArgs {
  funnel: IFunnel;
}

export interface IProductReference {
  id: string;
  name: string;
  amount: number;
}

export interface IGetFunnelStepArgs {
  path: string;
  luid?: string;
  aid?: string;
}

export interface IFunnelMutation {
  id?: string;
  title: string;
  active: boolean;
  funnelSteps: IFunnelStepMutation[];
  createdAt?: Date;
  domain: IDomainReference;
  updatedAt?: Date;
}

export interface IFunnelStepMutation {
  stepOrder: number;
  url: string;
  products: string[];
  nextFunnelStepUrl: string;
}

export interface ILinks {
  title: string;
  url: string;
}

export interface IFunnelStepWithData {
  fid: string;
  funnelStep: IFunnelStep;
  luid: string;
  affiliate: IUserBasics;
}

export interface IActivateUSerResponse {
  message: string;
  success: boolean;
}

export interface IAddEditFunnelArgs {
  funnel: IFunnelArgs;
}

export interface IFunnelArgs {
  id?: string;
  title: string;
  active: boolean;
  hidden: boolean;
  funnelSteps: IFunnelStepArgs[];
  createdAt?: Date;
  domain: string;
  updatedAt?: Date;
}

export interface IFunnelStepArgs {
  stepOrder: number;
  url: string;
  products: IFunnelStepProductArgs[];
  nextFunnelStepUrl: string;
}

export interface IFunnelStepProductArgs {
  product: string;
  promoCodes?: IPromoCodeArgs[];
}

export interface IPromoCodeArgs {
  code: string;
  discountType: 'Percent' | 'Monetary' | 'Product' | 'Setup Fee';
  discountAmount: number;
  maxUse: number;
  currentUse: number;
  startDate?: Date;
  endDate?: Date;
  product?: string;
}
