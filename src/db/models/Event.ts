import { IAmbassador } from './Ambassador';

export interface IEventAttendee {
  updatedAt: Date;
  isPaid: boolean;
  id: string;
  ticketDescription: string;
  createdAt?: Date;
  ambassador: IAmbassador;
  payment: IPayment;
}

export interface IExcursion {
  updatedAt: Date;
  amount: boolean;
  id: string;
  description: string;
  createdAt?: Date;
  includes: string[];
}

export interface IEvent {
  name: string;
  updatedAt: Date;
  maxAttendees: number;
  id: string;
  status: string;
  createdAt?: Date;
  dateOfEvent: Date;
  program: IProgram;
}

export interface IJsonResponse {
  responsetext: string;
  response_code: string;
  transactionid: string;
  response: string;
  cvvresponse: string;
  orderid: string;
  authcode: string;
  type: string;
  avsresponse: string;
}

export interface IPayment {
  updatedAt: Date;
  isApproved: boolean;
  orderId: string;
  paymentAmount: number;
  paymentType: string;
  jsonResponse: IJsonResponse;
  code: string;
  id: string;
  createdAt?: Date;
  gatewayMessage: string;
  merchant: string;
  cardMasked: string;
  transactionId: string;
}

export interface IProgram {
  name: string;
  updatedAt: Date;
  id: string;
  createdAt?: Date;
  siteUrl: string;
}

export interface IReservation {
  updatedAt: Date;
  otherInstructions: string;
  totalPrice: number;
  isPaid: boolean;
  id: string;
  ipAddress: string;
  hasPaymentPlan: boolean;
  numberOfRooms: number;
  createdAt?: Date;
  ambassadorStatus: string;
  balanceDue: number;
  ambassador: IAmbassador;
  payment: IPayment;
  scheduledPayments: IScheduledPayment[];
  program: IProgram;
  travelers: ITraveler[];
  excursions: IExcursion[];
}

export interface IScheduledPayment {
  updatedAt: Date;
  paymentAmount: number;
  id: string;
  createdAt?: Date;
  paymentDate: Date;
}

export interface ITraveler {
  updatedAt: Date;
  dob: Date;
  age: number;
  passportNumber: string;
  lastName: string;
  firstName: string;
  passportExpiration: Date;
  id: string;
  createdAt?: Date;
  isPrimary: boolean;
  displayOrder: number;
  gender: string;
}

export interface ITrip {
  priceVip: number;
  totalRooms: number;
  updatedAt: Date;
  priceNonMember: number;
  _typeName: string;
  endDate: Date;
  urlSlug: string;
  hotel: string;
  pricePlus: number;
  country: string;
  id: string;
  roomDescription: string;
  status: string;
  cityOrRegion: string;
  createdAt?: Date;
  title: string;
  startDate: Date;
  priceDescription: string;
  summary: string;
  reservations: IReservation[];
}
