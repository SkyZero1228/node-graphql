import { Context, verifyAccess, formatSearchTerm } from '../../utils';
import Roles from '../../roles';
import * as ProspectInterfaces from '../../interfaces/prospects';
import { Prospect, ProspectBasics, ProspectLasVegas } from '../../db/models/Prospect';
import { IProspectBasicsPagination, IProspectBasics } from '../../interfaces/prospects';
import { QueryStatistics, IDocumentQuery } from 'ravendb';
import { Certificate } from 'crypto';
const LASVEGAS_CERTIFICATION_DOCUMENT = 'certificates/37-A';
export default {
  async getProspectByUuid(_parent, { uuid }: ProspectInterfaces.IGetProspectByUuid, { session, req }: Context): Promise<Prospect> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    return await session
      .query<Prospect>({ collection: 'Prospects' })
      .whereEquals('uuid', uuid)
      .firstOrNull();
  },

  async getProspectsByAffiliate(_parent, args, { session, req }: Context): Promise<IProspectBasicsPagination> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let stats: QueryStatistics;
    let query: IDocumentQuery<any>;
    let prospects: ProspectBasics[];

    query = session.query<Prospect>({ indexName: 'Prospects' }).whereEquals('userId', req.user.id);

    if (args.searchText) {
      let searchTerm = formatSearchTerm(args.searchText.split(' '));
      query.andAlso().search('Query', searchTerm, 'AND');
    }

    prospects = await query
      .statistics(s => (stats = s))
      .take(args.pageSize)
      .skip(args.skip)
      .selectFields(['firstName', 'lastName', 'deliveryEndpoint', 'deliveryMethod', 'redeemed', 'certificate'])
      .ofType<ProspectBasics>(ProspectBasics)
      .all();

    return { prospects, totalRows: stats.totalResults };
  },

  async getLasVegasProspects(_parent, _args, { session, req }: Context): Promise<IProspectBasics[]> {
    verifyAccess(req, [Roles.Administrator]);
    let stats: QueryStatistics;
    let searchTerm = _args.searchText ? formatSearchTerm(_args.searchText.split(' ')) : null;

    if (_args.searchText) {
      console.log('search', searchTerm);
      return await session
        .query<Prospect>({ collection: 'Prospects' })
        .statistics(s => (stats = s))
        .whereEquals('certificate.id', LASVEGAS_CERTIFICATION_DOCUMENT)
        .whereEquals('payments[].type', 'Activation')
        .andAlso()
        .whereEquals('payments[].type', 'Reservation')
        .search('firstName', searchTerm)
        .whereEquals('certificate.id', LASVEGAS_CERTIFICATION_DOCUMENT)
        .whereEquals('payments[].type', 'Activation')
        .andAlso()
        .whereEquals('payments[].type', 'Reservation')
        .search('deliveryEndpoint', searchTerm)
        .whereEquals('certificate.id', LASVEGAS_CERTIFICATION_DOCUMENT)
        .whereEquals('payments[].type', 'Activation')
        .andAlso()
        .whereEquals('payments[].type', 'Reservation')
        .search('lastName', searchTerm)

        .orderBy('firstName')
        .all();
    }
    return await session
      .query<Prospect>({ collection: 'Prospects' })
      .statistics(s => (stats = s))
      .whereEquals('certificate.id', LASVEGAS_CERTIFICATION_DOCUMENT)
      .whereEquals('payments[].type', 'Activation')
      .andAlso()
      .whereEquals('payments[].type', 'Reservation')
      .orderBy('firstName')
      .all();
  }
};
