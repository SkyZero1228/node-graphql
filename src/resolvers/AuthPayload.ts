import { Context } from '../utils';
import { User } from '../db/models/User';

export default {
  user: async ({ user: { id } }, args, ctx: Context) => {
    return await ctx.session.load<User>(id);
  },
};
