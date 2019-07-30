import { v4 } from 'uuid';
import { Context, verifyAccess, getNowUtc } from '../../utils';
import Roles from '../../roles';
import { IFunnel, IFunnelStep, IGetFunnelStepArgs, IFunnelStepWithData } from '../../interfaces/funnel';
import { Funnel, FunnelReference, FunnelStepReference } from '../../db/models/Funnel';
import { DumpBucket } from '../../db/models/DumpBucket';
import { remove, find } from 'lodash';
import { ILead, IUpdateLeadArgs, IUpdateLeadResponse } from '../../interfaces/lead';
import { Lead, LeadVisit } from '../../db/models/Lead';
import { User, UserBasics } from '../../db/models/User';
import { DomainReference } from '../../db/models/Domain';
import { AwaitableMaintenanceOperation } from 'ravendb';

export default {
  async getAllFunnels(_parent, args, ctx: Context): Promise<Array<IFunnel>> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session
      .query<IFunnel>({ collection: 'Funnels' })
      .skip(args.skip)
      .take(args.pageSize)
      .all();
  },

  async getAllFunnelsForAffiliateLinks(_parent, args, ctx: Context): Promise<Array<IFunnel>> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session
      .query<IFunnel>({ collection: 'Funnels' })
      .whereEquals('hidden', false)
      .skip(args.skip)
      .take(args.pageSize)
      .all();
  },

  async getFunnelById(_parent, args, ctx: Context): Promise<IFunnel> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    return await ctx.session.load<Funnel>(args.id);
  },

  async getFunnelStepWithData(_parent, args: IGetFunnelStepArgs, { session, req }: Context): Promise<IFunnelStepWithData> {
    let url = req.headers['origin'] ? <string>req.headers['origin'] : <string>req.headers['referer'];
    if (!url) {
      const dumpBucket = new DumpBucket(null, null, {
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        hostname: req.hostname,
        headers: req.headers,
      });
      await session.store(dumpBucket);
      await session.saveChanges();
      return null;
    }

    let domain = /troyzarger\.me|mytripvalet.com|localhost/g;
    var match = domain.exec(url);

    const path = args.path === '/' ? '/membership' : args.path;
    const funnel = await session
      .query<Funnel>({ indexName: 'Funnels' })
      .whereEquals('domain', 'mytripvalet.com')
      .whereEquals('url', path)
      .firstOrNull();

    if (!funnel) return null;
    const funnelStep: IFunnelStep = find<IFunnelStep>(funnel.funnelSteps, step => {
      return step.url === path;
    });

    const protocolMatch = /^(https?):\/\//;
    url = url.replace(protocolMatch, '');
    let segments: string[] = url.split('.');
    remove(segments, (segment: any) => {
      return segment.toLowerCase() === 'www';
    });

    if (segments[0] === 'localhost:3000') segments[0] = 'troyzargerr';
    let user = await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('username', segments[0])
      .selectFields(['id', 'firstName', 'lastName', 'email', 'uuid'])
      .ofType<UserBasics>(UserBasics)
      .firstOrNull();

    let lead: ILead;
    if (args.luid) {
      lead = await session
        .query<Lead>({ indexName: 'Leads' })
        .whereEquals('uuid', args.luid)
        .firstOrNull();
    }

    if (!lead) {
      const dumpBucket = new DumpBucket(null, 'getFunnelStepWithData', { args, user, funnel, funnelStep, headers: req.headers });
      await session.store(dumpBucket);
      lead = new Lead(
        new FunnelReference(funnel.id, funnel.title),
        new FunnelStepReference(funnelStep.stepOrder, funnelStep.url),
        new DomainReference(funnel.domain.id, funnel.domain.tld),
        <string>req.headers['x-forwarded-for'],
        v4(),
        null,
        null,
        user ? user.id : null
      );
      await session.store(lead);
    }

    const visit = new LeadVisit(
      lead.id,
      new FunnelReference(funnel.id, funnel.title),
      new FunnelStepReference(funnelStep.stepOrder, funnelStep.url),
      new DomainReference(funnel.domain.id, funnel.domain.tld),
      <string>req.headers['x-forwarded-for'],
      user ? user.id : null
    );
    await session.store(visit);
    await session.saveChanges();
    return { fid: funnel.id, funnelStep, affiliate: user, luid: lead.uuid };
  },
};
