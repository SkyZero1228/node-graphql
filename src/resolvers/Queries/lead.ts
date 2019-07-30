import { Context, verifyAccess } from '../../utils';
import Roles from '../../roles';
import { ILead, ILeadVisit } from '../../interfaces/lead';
import { Lead } from '../../db/models/Lead';

export default {
  async getAllLeads(_parent, args, ctx: Context): Promise<Array<ILead>> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session
      .query<ILead>({ collection: 'Leads' })
      .skip(args.skip)
      .take(args.pageSize)
      .all();
  },

  async getLeadById(_parent, args, ctx: Context): Promise<ILead> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session.load<Lead>(args.id);
  },

  async getLeadsByAffiliateUser(_parent, args, ctx: Context): Promise<Array<ILead>> {
    verifyAccess(ctx.req, [Roles.Affiliate, Roles.CoinMD]);
    return await ctx.session
      .query<ILead>({ collection: 'Leads' })
      .whereEquals('affiliateUserId', ctx.req.user.id)
      .all();
  },
  async getLeadsVisitsById(_parent, args, ctx: Context): Promise<Array<ILeadVisit>> {
    verifyAccess(ctx.req, [Roles.Affiliate, Roles.CoinMD]);
    return await ctx.session
      .query<ILeadVisit>({ collection: 'LeadVisits' })
      .whereEquals('leadId', args.id)
      .all();
  },
};
