import { Context, formatSearchTerm, verifyAccess } from '../../utils';
import { UserSubscription } from '../../db/models/UserSubscription';
import Roles from '../../roles';
import * as UserInterfaces from '../../interfaces/users';
import { QueryStatistics } from 'ravendb';

export default {
  async getAllUserSubscriptions(_parent, args, ctx: Context): Promise<UserInterfaces.IGetAllUserSubscriptions> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    let stats: QueryStatistics;
    const userSubscriptions = await ctx.session
      .query<UserSubscription>({ collection: 'UserSubscriptions' })
      .statistics(s => (stats = s))
      .skip(args.skip)
      .take(args.pageSize)
      .all();

    return { userSubscriptions, totalRows: stats.totalResults };
  },

  async getTrialByAffiliate(_parent, args, ctx: Context): Promise<Array<UserInterfaces.IUserSubscription>> {
    verifyAccess(ctx.req, [Roles.Affiliate, Roles.Administrator]);
    return await ctx.session
      .query<UserSubscription>({ indexName: 'UserSubscriptions' })
      .whereEquals('affiliateId', ctx.req.user.id)
      .whereNotEquals('status', 'active')
      .all();
  },
};
