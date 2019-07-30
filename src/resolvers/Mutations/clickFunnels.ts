import { Context, verifyAccess } from '../../utils';
import { ClickFunnel, IClickFunnel } from '../../db/models/ClickFunnels';
import Roles from '../../roles';

export default {
  async addClickFunnel(_parent, args: IClickFunnel, ctx: Context): Promise<IClickFunnel> {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const clickFunnel = new ClickFunnel(null, args.title, args.url, args.active);
    await ctx.session.store(clickFunnel);
    await ctx.session.saveChanges();
    return clickFunnel;
  },

  async editClickFunnel(_parent, args, ctx: Context) {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let clickFunnel = await ctx.session.load<ClickFunnel>(args.id);
    if (!clickFunnel) {
      return null;
    }

    Object.assign(clickFunnel, { ...args });
    await ctx.session.saveChanges();
    return clickFunnel;
  },
};
