import { ICertificate, ISfxCertificateOrderResponse, IAssuredTravelRequestCertificateResponse } from './certificates';
import { IAddress, ICreditCard } from './users';
import { ITraveler } from '../db/models/Event';

export interface IProspect {
  id?: string;
  uuid: string;
  userId?: string;
  firstName: string;
  lastName: string;
  deliveryEndpoint?: string;
  deliveryMethod: DeliveryMethod; // 'Email' | 'Facebook' | 'Facebook Messenger' | 'SMS' | 'WhatsApp' | 'Google Voice' | 'Line' | 'WeChat' | 'KaKaoTalk';
  phone?: string;
  visits: IVisit[];
  certificate: ICertificate;
  personalizedMessage: string;
  redeemed: boolean;
  assuredTravel?: IAssuredTravelRequestCertificateResponse;
  sfx?: ISfxCertificateOrderResponse;
  payments?: ICertificatePayment[];
  travelers?: ICertificateTraveler[];
  preferredDates?: Date[];
  alternateDates?: Date[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICertificatePayment {
  type: CertificatePaymentEnum;
  amount: number;
  transId: string;
  authCode: string;
  invoiceNumber: string;
  authorizeNet: IAuthorizeNetTransaction;
  createdAt?: Date;
}

export interface IAuthorizeNetTransaction {
  responseCode: string;
  authCode: string;
  avsResultCode: string;
  cvvResultCode: string;
  cavvResultCode: string;
  transId: string;
  refTransID: string;
  transHash: string;
  testRequest: string;
  accountNumber: string;
  accountType: string;
  messages: IAuthorizeNetMessages;
  transHashSha2: string;
}

export interface IAuthorizeNetMessages {
  message: IAuthorizeNetMessage[];
}

export interface IAuthorizeCaptureResult {
  transId?: string;
  authCode?: string;
  message?: string;
}

export interface IAuthorizeNetMessage {
  code: string;
  description: string;
}

export enum CertificatePaymentEnum {
  Activation = 'Activation',
  Reservation = 'Reservation',
}

export interface ILasVegasCertificatePayment {
  uuid: string;
  firstName: string;
  lastName: string;
  deliveryEndpoint?: string;
  phone: string;
  travelers: ICertificateTraveler[];
  preferredDates: Date[];
  alternateDates: Date[];
  address: IAddress;
  card: ICreditCard;
  payActivation: boolean;
  payReservation: boolean;
}

export interface ICertificateTraveler {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  maritalStatus: MaritalStatusEnum;
}

export enum MaritalStatusEnum {
  Married = 'Married',
  Single = 'Single',
}
export interface IProspectBasics {
  firstName: string;
  lastName: string;
  deliveryEndpoint: string;
  deliveryMethod: string;
  redeemed: boolean;
  certificate: ICertificate;
}

export interface ILasVegasProspect {
  payments?: IPaymentType[];
  firstName: string;
  lastName: string;
  deliveryEndpoint: string;
  deliveryMethod: string;
  updatedAt: Date;
}

export interface IPaymentType {
  type: string;
}

export interface IProspectBasicsPagination {
  prospects: IProspectBasics[];
  totalRows: number;
}

export interface IVisit {
  visitDate: Date;
  ip: string;
  url: string;
}

export interface IConversion {
  certificate: any;
  conversionDate: Date;
  ip: string;
}

export interface IAddProspect {
  firstName: string;
  lastName: string;
  email: string;
  deliveryEndpoint: string;
  certificateId: string;
  personalizedMessage: string;
  phone?: string;
}

export interface IAddGiftProspect {
  referralCode: string;
  certificateCode: string;
}

export interface IGetProspectByUuid {
  uuid: string;
}

export enum DeliveryMethod {
  Email = 'Email',
  Facebook = 'Facebook',
  FacebookMessenger = 'Facebook Messenger',
  Sms = 'SMS',
  WhatsApp = 'WhatsApp',
  GoogleVoice = 'Google Voice',
  Line = 'Line',
  WeChat = 'WeChat',
  KaKaoTalk = 'KaKaoTalk',
}
