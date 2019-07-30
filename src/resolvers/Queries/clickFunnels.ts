import { Context, verifyAccess } from '../../utils';
import Roles from '../../roles';
import * as ClickFunnelsInterfaces from '../../interfaces/clickFunnels';
import { IClickFunnel, ClickFunnel } from '../../db/models/ClickFunnels';

export default {
  async getClickFunnels(_parent, { skip, pageSize }: ClickFunnelsInterfaces.IGetClickFunnels, ctx: Context): Promise<Array<IClickFunnel>> {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    return await ctx.session
      .query<ClickFunnel>({ collection: 'ClickFunnels' })
      .skip(skip ? skip : 0)
      .take(pageSize ? pageSize : 25)
      .all();
  },

  // async users(parent, args: UserInterfaces.IUsersQuery, ctx: Context): Promise<IUser[]> {
  //   return await ctx.session
  //     .query<User>({ collection: 'users' })
  //     .orderBy('firstName')
  //     .take(args.pageSize)
  //     .skip(args.skip)
  //     .all();
  // },
};
