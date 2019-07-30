import { QueryStatistics } from 'ravendb';
import { Context, verifyAccess, formatSearchTerm } from '../../utils';
import { Reservation } from '../../db/models/Reservation';
import { IReservation, IReservationAndTrip } from '../../interfaces/reservations';
import Roles from '../../roles';
import { Trip } from '../../db/models/Trip';

export default {
  async getReservations(_parent, _args, { session, req }: Context): Promise<IReservation[]> {
    verifyAccess(req, [Roles.Administrator]);
    let stats: QueryStatistics;
    let searchTerm = _args.searchText ? formatSearchTerm(_args.searchText.split(' ')) : null;
    if (_args.searchText) {
      return await session
        .query<Reservation>({ indexName: 'Reservations' })
        .statistics(s => (stats = s))
        .search('Query', searchTerm, 'AND')
        .orderBy('firstName')
        .all();
    }
    return await session
      .query<Reservation>({ indexName: 'Reservations' })
      .statistics(s => (stats = s))
      .orderBy('firstName')
      .all();
  },

  async getReservationAndTripById(_parent, args, { session, req }: Context): Promise<IReservationAndTrip> {
    verifyAccess(req, [Roles.Administrator]);
    const { id } = args;
    const reservation = await session.load<Reservation>(id);
    const trip = await session.load<Trip>(reservation.trip.id);

    return { reservation, trip };
  },
};
