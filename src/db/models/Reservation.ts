import { IReservationUser, IReservationDate, IReservationGuest, IReservationExcursionExtra, IReservationPaymentDetails, IReservation, IReservationPricing, IReservationTrip } from '../../interfaces/reservations';
import { IChargeCustomerResult } from '../../interfaces/stripe';

export class Reservation implements IReservation {
  public createdAt?: Date;
  public updatedAt?: Date;
  public payment?: IChargeCustomerResult;

  public userAgent?: string;
  notes?: string;

  constructor(public id: string, public trip: IReservationTrip, public user: IReservationUser, public date: IReservationDate, public guests: IReservationGuest[], public excursionExtras: IReservationExcursionExtra[], public pricing: IReservationPricing, public paid: boolean = false, public uuid: string = '', public willingToRoom: boolean = false) {}
}
