import { Context, convertToUrlSlug, verifyAccess, getNowUtc } from '../../utils';
import { Video } from '../../db/models/Video';
import * as TripInterfaces from '../../interfaces/trips';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import { Trip } from '../../db/models/Trip';
import Roles from '../../roles';

export default {
  async addTrip(_parent, args: TripInterfaces.IAddTripArgs, { session, req }: Context): Promise<TripInterfaces.ITrip> {
    try {
      verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
      const { agenda, dates, location, hotel, title, includes, images, ...rest } = args.trip;
      let trip = new Trip(agenda, dates, location, hotel, includes, images, title);
      trip = Object.assign(trip, {
        ...rest,
        createdAt: getNowUtc(),
        updatedAt: getNowUtc(),
        urlSlug: convertToUrlSlug(title).toLowerCase(),
      });

      await session.store(trip);
      await session.saveChanges();
      return trip;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  // async editTrip(_parent, args: TripInterfaces.ITrip, { session }: Context): Promise<TripInterfaces.ITrip> {
  //   try {
  //     let trip = await session.load<Trip>(args.id);

  //     if (!trip) {
  //       return null;
  //     }

  //     trip = Object.assign(trip, { ...args, lastUpdated: new Date() });
  //     await session.saveChanges();
  //     return trip;
  //   } catch (ex) {
  //     await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
  //     await session.saveChanges();
  //     throw new Error('There was an error. Please try again. The Tech team has been notified.');
  //   }
  // },
};
