import { Context, verifyAccess } from '../../utils';
import Roles from '../../roles';
import { IOrder, IGetAllOrders, IOrderDataRow, IOrderDataRowResponse } from '../../interfaces/order';
import { Order, OrderDataRow } from '../../db/models/Order';
import { QueryStatistics } from 'ravendb';

export default {
  async getAllOrders(_parent, args, ctx: Context): Promise<IGetAllOrders> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    let stats: QueryStatistics;
    const orders = await ctx.session
      .query<IOrder>({ collection: 'Orders' })
      .statistics(s => (stats = s))
      .skip(args.skip)
      .take(args.pageSize)
      .all();

    return { orders, totalRows: stats.totalResults };
  },

  async getOrdersForUser(_parent, args, ctx: Context): Promise<IOrderDataRowResponse> {
    verifyAccess(ctx.req, [Roles.Affiliate, Roles.CoinMD]);
    let stats: QueryStatistics;
    const orders = await ctx.session
      .query<IOrder>({ indexName: 'Orders' })
      .statistics(s => (stats = s))
      .whereEquals('affiliateId', ctx.req.user.id)
      .skip(args.skip)
      .take(args.pageSize)
      .all();

    const response = orders.map(order => OrderDataRow.filterCommissions(order, ctx.req.user.id));
    return { orders: response, totalRows: stats.totalResults };
  },

  async getOrderById(_parent, args, ctx: Context): Promise<IOrder> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session.load<Order>(args.id);
  },
};
