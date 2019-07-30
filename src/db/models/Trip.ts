import { ITrip, IDailyTripAgenda, ITripExcursion, ITripImage, ITripDate, ITripLocation, ITripHotel, ICouponCode } from '../../interfaces/trips';

export class Trip implements ITrip {
  public createdAt?: Date;
  public description?: string;
  public excursions?: ITripExcursion[];
  public id?: string;
  public updatedAt?: Date;
  public urlSlug?: string[];
  public videoUrl?: string;
  public couponCodes?: ICouponCode[];

  constructor(public agenda: IDailyTripAgenda[] = [], public dates: ITripDate[] = [], public location: ITripLocation = null, public hotel: ITripHotel = null, public includes: string[] = [], public images: ITripImage[] = [], public title: string = '') {}
}
