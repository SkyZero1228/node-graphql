import * as moment from 'moment';
import { ICertificate, ISfxCertificateOrderResponse, IAssuredTravelRequestCertificateResponse } from '../../interfaces/certificates';
import {
  IProspect,
  IVisit,
  IConversion,
  IProspectBasics,
  ICertificatePayment,
  CertificatePaymentEnum,
  IAuthorizeNetTransaction,
  ICertificateTraveler,
  ILasVegasProspect,
  IPaymentType,
} from '../../interfaces/prospects';
import { DeliveryMethod } from '../../interfaces/prospects';
import { DateTime } from 'luxon';

export class Prospect implements IProspect {
  public assuredTravel?: IAssuredTravelRequestCertificateResponse;
  public sfx?: ISfxCertificateOrderResponse;
  public travelers?: ICertificateTraveler[];
  public preferredDates?: Date[];
  public alternateDates?: Date[];
  public phone?: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(
    public id?: string,
    public uuid: string = '',
    public userId: string = '',
    public firstName: string = '',
    public lastName: string = '',
    public deliveryEndpoint: string = '',
    public deliveryMethod: DeliveryMethod = DeliveryMethod.Email,
    public visits: IVisit[] = [],
    public certificate: ICertificate = null,
    public personalizedMessage: string = '',
    public redeemed: boolean = false,
    public payments: ICertificatePayment[] = [],
  ) {}
}

export class CertificatePayment implements ICertificatePayment {
  public createdAt?: Date;

  constructor(
    public type: CertificatePaymentEnum,
    public amount: number,
    public transId: string,
    public authCode: string,
    public invoiceNumber: string,
    public authorizeNet: IAuthorizeNetTransaction,
  ) {
    this.createdAt = DateTime.utc().toJSDate();
  }
}

export class ProspectBasics implements IProspectBasics {
  constructor(
    public firstName: string,
    public lastName: string,
    public deliveryEndpoint: string,
    public deliveryMethod: string,
    public redeemed: boolean,
    public certificate: ICertificate,
  ) {}
}

export class ProspectLasVegas implements ILasVegasProspect {
  constructor(
    public payments: IPaymentType[],
    public firstName: string,
    public lastName: string,
    public deliveryEndpoint: string,
    public deliveryMethod: string,
    public phone: string,
    public updatedAt: Date,
  ) {}
}

export class Visit implements IVisit {
  constructor(public visitDate: Date = null, public ip: string = null, public url: string = null) {}
}

export class Conversion implements IConversion {
  constructor(public certificate, public conversionDate = null, public ip = null) {}
}
