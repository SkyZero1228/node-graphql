import { Context, verifyAccess, formatSearchTerm, formatLuceneQueryForDate } from '../../utils';
import Roles from '../../roles';
import { ICommission, IGetCommission, IGetAllCommissions, IDownloadCommissions, ICommissionTotal } from '../../interfaces/commission';
import { Commission } from '../../db/models/Commission';
import { QueryStatistics } from 'ravendb';
import { IUser } from '../../interfaces/users';
import { DateTime, Duration } from 'luxon';
import { getNextDayOfWeek } from '../../helpers/stripe';
import moment = require('moment');

export default {
  async getAllCommissionsByUser(_parent, { skip, pageSize }: IGetCommission, ctx: Context): Promise<IGetAllCommissions> {
    verifyAccess(ctx.req, [Roles.Affiliate, Roles.CoinMD]);
    let stats: QueryStatistics;
    const userId: string = ctx.req.user.id;
    const commissions = await ctx.session
      .query<ICommission>({ collection: 'Commissions' })
      .statistics(s => (stats = s))
      .whereEquals('affiliate.id', userId)
      .orderByDescending('createdAt')
      .skip(skip ? skip : 0)
      .take(pageSize)
      .all();

    const totalPaidCommission = await ctx.session
      .query<ICommissionTotal>({ indexName: 'TotalCommissionsPaidByUserId' })
      .whereEquals('userId', userId)
      .firstOrNull();
    const totalPendingCommission = await ctx.session
      .query<ICommissionTotal>({ indexName: 'TotalCommissionsPendingByUserId' })
      .whereEquals('userId', userId)
      .firstOrNull();

    return {
      commissions,
      totalRows: stats.totalResults,
      totalCommissionPaid: totalPaidCommission ? totalPaidCommission.commissionAmount : 0,
      totalCommissionPending: totalPendingCommission ? totalPendingCommission.commissionAmount : 0,
    };
  },

  async getCommissionById(_parent, args, ctx: Context): Promise<ICommission> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session.load<Commission>(args.id);
  },

  async getAllCommissions(
    _parent,
    { skip, pageSize, isAffiliate, searchText, dateFilter }: IGetCommission,
    ctx: Context
  ): Promise<IGetAllCommissions> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    let searchTerm = formatSearchTerm(searchText.split(' '));
    let luceneQuery = formatLuceneQueryForDate(dateFilter);
    let stats: QueryStatistics;
    try {
      let query = await ctx.session
        .query<ICommission>({ indexName: 'Commissions' })
        .statistics(s => (stats = s))
        .whereLucene('payCommissionOn', luceneQuery || '*');

      if (searchText) {
        query = query.andAlso().search('Query', searchTerm, 'AND');
      }
      if (isAffiliate) {
        query = query.andAlso().whereEquals('affiliate.id', ctx.req.user.id);
      }

      const commissions = await query
        .orderByDescending('createdAt')
        .skip(skip ? skip : 0)
        .take(pageSize)
        .all();

      return { commissions, totalRows: stats.totalResults, totalCommissionPending: 0, totalCommissionPaid: 0 };
    } catch (ex) {
      console.error(ex);
      throw Error(ex);
    }
  },

  async downloadCommissions(_parent, vars, ctx: Context): Promise<IDownloadCommissions[]> {
    const start = DateTime.fromJSDate(getNextDayOfWeek(moment().toDate(), 5, 0)).toJSDate();
    const end = DateTime.fromJSDate(getNextDayOfWeek(moment().toDate(), 5, 0))
      .plus(1000 * 60)
      .toJSDate();
    return await ctx.session
      .query<IDownloadCommissions>({ indexName: 'CommissionsPendingByAffiliate' })
      .whereBetween('payCommissionOn', start, end)
      .all();
  },
};
