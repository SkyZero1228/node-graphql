import { Context, verifyAccess } from '../../utils';
import Roles from '../../roles';
import { IEscapeBuck, IGetAllEscapeBucks, ITotalEscapeBucksByUserID } from '../../interfaces/escapeBucks';
import { EscapeBuck } from '../../db/models/EscapeBuck';
import { QueryStatistics } from 'ravendb';

export default {
  async getAllEscapeBucks(_parent, args, ctx: Context): Promise<IGetAllEscapeBucks> {
    verifyAccess(ctx.req, [Roles.Administrator, Roles.TVIPro]);
    const userId: string = ctx.req.user.id;
    let stats: QueryStatistics;
    const escapeBucks = await ctx.session
      .query<IEscapeBuck>({ collection: 'EscapeBucks' })
      .whereEquals('user.id', userId)
      .statistics(s => (stats = s))
      .skip(args.skip)
      .take(args.pageSize)
      .all();
    const totalEscapeBucks = await ctx.session
      .query<ITotalEscapeBucksByUserID>({ indexName: 'TotalEscapeBucksByUserId' })
      .whereEquals('userId', userId)
      .firstOrNull();
    return { escapeBucks, totalRows: stats.totalResults, bucks: totalEscapeBucks ? totalEscapeBucks.bucks : 0 };
  },
};
