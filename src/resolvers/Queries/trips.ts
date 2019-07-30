import { Context, createAndSendException, verifyAccess } from '../../utils';
import * as TripInterfaces from '../../interfaces/trips';
import { Trip } from '../../db/models/Trip';
import Roles from '../../roles';

export default {
  async getTrip(_parent, { id }: TripInterfaces.ITrip, { session, req }: Context): Promise<Trip> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      return await session.load<Trip>(id);
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, id));
      await session.saveChanges();
      throw new Error('Trip Not Found');
    }
  },

  async getTripBySlug(_parent, { urlSlug }: TripInterfaces.ITrip, { session, req }: Context): Promise<Trip> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      return await session
        .query<Trip>({ collection: 'Trips' })
        .whereIn('urlSlug', [urlSlug])
        .singleOrNull();
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, urlSlug));
      await session.saveChanges();
      throw new Error('Trip Not Found');
    }
  },

  async getTrips(_parent, _args, { session, req }: Context): Promise<Trip[]> {
    verifyAccess(req, [Roles.Administrator]);
    return await session.query<Trip>({ collection: 'Trips' }).all();
  },
};
