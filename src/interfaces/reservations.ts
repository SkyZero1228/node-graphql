import { IChargeCustomerResult } from "./stripe";
import { Trip } from "../db/models/Trip";
import { IAddressAndCreditCard, IUserBasics, IAddress, ICreditCard } from "./users";

export interface IReservationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

export interface IReservationPricing {
  id: string;
  role: string;
  pricePerRoomPerPerson: number;
  pricePerRoom: number;
  downPaymentPerPerson: number;
  downPaymentMinimum: number;
  extraPricePerNightPerPerson: number;
  extraPricePerNightMinimum: number;
}

export interface IReservationDate {
  days: number;
  end: Date;
  extraDaysAfter: number;
  extraDaysBefore: number;
  id?: string;
  start: Date;
  pricing?: IReservationPricing;
}

export interface IReservationGuest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dob?: Date;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  shareType?: string;
}

export interface IReservationExcursion {
  id: string;
  imageUrl: string;
  included: string;
  price: string;
  what: string;
  whatType: string;
  when: string;
}

export interface IReservationExcursionDate {
  id: string;
  tripDateId: string;
  day: Date;
}

export interface IReservationTime {
  id: string;
  start: Date;
  end: Date;
  price: number;
}

export interface IReservationExcursionExtra {
  excursion: IReservationExcursion;
  excursionDate: IReservationExcursionDate;
  time: IReservationTime;
}

export interface IReservationBillingProfile {}

export interface Card {}

export interface IReservationFuturePayment {
  amount: number;
  date: Date;
}

export interface IReservationPaymentDetails {
  dueToday: number;
  balanceDue: number;
  futurePayments: IReservationFuturePayment[];
}

export interface IReservationTrip {
  id: string;
  title: string;
}

export interface IReservation {
  id: string;
  userAgent?: string;
  willingToRoom: boolean;
  trip: IReservationTrip;
  user: IReservationUser;
  date?: IReservationDate;
  guests: IReservationGuest[];
  excursionExtras: IReservationExcursionExtra[];
  pricing: IReservationPricing;
  createdAt?: Date;
  updatedAt?: Date;
  paid: boolean;
  uuid: string;
  payment?: IChargeCustomerResult;
  notes?: string;
}

export interface IReservationInput {
  reservation: {
    id: string;
    trip: IReservationTrip;
    user: IReservationUser;
    date: IReservationDate;
    guests: IReservationGuest[];
    excursionExtras: IReservationExcursionExtra[];
    billingAndCard: IBillingAndCard;
    pricing: IReservationPricing;
    createdAt?: Date;
    updatedAt?: Date;
    paymentOption: string;
    willingToRoom: boolean;
  };
}

export interface IReservationGuestsUpdate {
  id: string;
  guests: IReservationGuest[];
  willingToRoom: boolean;
}

export interface IReservationDateUpdate {
  id: string;
  date: IReservationDate;
}

export interface IReservationExcursionExtrasUpdate {
  id: string;
  excursionExtras: IReservationExcursionExtra[];
}

export interface IBillingAndCard {
  firstNameOnCard: string;
  lastNameOnCard: string;
  agreement: boolean;
  ccAddress1: string;
  ccAddress2?: string;
  ccCity: string;
  ccExpMonth: string;
  ccExpYear: string;
  ccNumber: string;
  ccPostalCode: string;
  ccState: string;
  cvc: string;
}

export interface ICard {
  card: string;
  month: string;
  year: string;
  cvc: string;
}

export interface IReservationPricing {
  downPaymentMinimum: number;
  downPaymentPerPerson: number;
  excursionsDownPayment: number;
  excursionsPrice: number;
  extraDaysPrice: number;
  extraDaysPricePerPerson: number;
  futurePayments: IReservationFuturePayment[];
  minimumRoomPrice: number;
  perPersonPrice: number;
  totalDownPayment: number;
  totalPrice: number;
}

export interface IReservationDeposit {
  createdAt?: Date;
  updatedAt?: Date;
  userAgent?: string;
  payment?: IChargeCustomerResult;
  billingAndCard?: IBillingAndCard;
  trip: IReservationTrip;
  user: IReservationUser;
}

export interface IReservationAndTrip {
  reservation: IReservation;
  trip: Trip;
}

export interface IReserveTrip {
  values: IGreeceReservationInput;
  user: IUserBasics;
  guests: IReservationGuest[];
  price: number;
}

export interface IGreeceReservationInput {
  guests: IReservationGuest[];
  address: IAddress;
  card: ICreditCard;
  //cabinType: string;
}
