import { Context, formatSearchTerm, verifyAccess } from '../../utils';
import Roles from '../../roles';
import { IDomain, IDomainRoleSorAccount } from '../../interfaces/domains';
import { Domain } from '../../db/models/Domain';
import { AppSettings } from '../../db/models/AppSettings';

export default {
  async getAllDomains(_parent, args, ctx: Context): Promise<Array<IDomain>> {
    verifyAccess(ctx.req, [Roles.Administrator]);

    if (args.searchText) {
      let searchTerm = formatSearchTerm(args.searchText.split(' '));
      return await ctx.session
        .query<Domain>({ collection: 'Domains' })
        .search('Query', searchTerm, 'AND')
        .skip(args.skip)
        .take(args.pageSize)
        .all();
    }
    return await ctx.session
      .query<Domain>({ collection: 'Domains' })
      .skip(args.skip)
      .take(args.pageSize)
      .all();
  },

  async getAllDomainsRolesAndSorAccount(_parent, args, ctx: Context): Promise<IDomainRoleSorAccount> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    let appSettings = await ctx.session.query<AppSettings>({ collection: 'AppSettings' }).all();

    const domain = await ctx.session
      .query<Domain>({ collection: 'Domains' })
      .skip(args.skip)
      .take(args.pageSize)
      .all();

    return { domain, role: appSettings[0].roles, sorAccount: appSettings[0].sorAccount };
  },

  async getDomainById(_parent, args, ctx: Context): Promise<IDomain> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session.load<Domain>(args.id);
  },
};
