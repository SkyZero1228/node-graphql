import { Context, verifyAccess } from '../../utils';
import Roles from '../../roles';
import { IProduct, DomainProductRolesSorAccount, IAllProducts } from '../../interfaces/product';
import { Product } from '../../db/models/Product';
import { IDomain } from '../../interfaces/domains';
import { AppSettings } from '../../db/models/AppSettings';
import { QueryStatistics } from 'ravendb';

export default {
  async getAllProducts(_parent, args, ctx: Context): Promise<IAllProducts> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    let stats: QueryStatistics;
    const product = await ctx.session
      .query<IProduct>({ collection: 'Products' })
      .statistics(s => (stats = s))
      .skip(args.skip)
      .take(args.pageSize)
      .all();

    return { product, totalRows: stats.totalResults };
  },

  async getProductById(_parent, args, ctx: Context): Promise<DomainProductRolesSorAccount> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    const product = await ctx.session.load<Product>(args.id);
    const domain = await ctx.session.query<IDomain>({ collection: 'Domains' }).all();
    let appSettings = await ctx.session.load<AppSettings>('AppSettings/1-A');

    return { domain, product, role: appSettings.roles, sorAccount: appSettings.sorAccount };
  },
};
