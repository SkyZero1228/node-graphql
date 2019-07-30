
import { IChargeCustomerResult } from '../../interfaces/stripe';
import { IReservationDeposit, IReservationTrip, IReservationUser, IBillingAndCard } from '../../interfaces/reservations';


export class ReservationDeposit implements IReservationDeposit {
  public createdAt?: Date;
  public updatedAt?: Date;
  public userAgent?: string;
  public payment?: IChargeCustomerResult;
  public billingAndCard?: IBillingAndCard;


  constructor(public trip: IReservationTrip, public user: IReservationUser) { }
}
