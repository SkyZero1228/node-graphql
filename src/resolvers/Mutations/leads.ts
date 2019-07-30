import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Lead, LeadVisit } from '../../db/models/Lead';
import * as LeadInterface from '../../interfaces/lead';
import * as moment from 'moment';
import { find } from 'lodash';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';
import { User, UserReference } from '../../db/models/User';
import { Funnel, FunnelReference, FunnelStepReference } from '../../db/models/Funnel';
import { IFunnelStep } from '../../interfaces/funnel';
import { v4 } from 'uuid';
import { DomainReference } from '../../db/models/Domain';
import { IUser } from '../../interfaces/users';
import { addProspectAndSendEmail } from '../../helpers/prospect';
import { Exception } from '../../db/models/Exception';

export default {
  async addLead(_parent, args: LeadInterface.ILeadArgs, { session, req }: Context): Promise<LeadInterface.ILead> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { lead: leadInput } = args;
      const lead = new Lead(
        leadInput.funnel,
        leadInput.funnelStep,
        leadInput.domain,
        leadInput.ip,
        leadInput.uuid,
        leadInput.email,
        leadInput.name,
        leadInput.affiliateUserId
      );
      lead.user = leadInput.user;
      lead.phone = leadInput.phone;
      lead.createdAt = getNowUtc();
      lead.updatedAt = getNowUtc();
      await session.store(lead);
      await session.saveChanges();
      return lead;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editLead(_parent, args: LeadInterface.ILeadArgs, { session, req }: Context): Promise<LeadInterface.ILead> {
    verifyAccess(req, [Roles.Administrator]);
    const { lead: leadInput } = args;
    try {
      let lead = await session.load<Lead>(leadInput.id);

      if (!lead) {
        return null;
      }

      lead = Object.assign(lead, { ...leadInput });
      await session.saveChanges();
      return lead;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async updateLead(_: any, args: any, { session, req }: Context): Promise<LeadInterface.IUpdateLeadResponse> {
    try {
      const funnel = await session.load<Funnel>(args.fid);
      if (!funnel) return null;
      // let internationalStep = null;
      const funnelStep = find<IFunnelStep>(funnel.funnelSteps, (step: IFunnelStep) => {
        return step.stepOrder === args.step;
      });

      // if (funnelStep.nextFunnelStepUrl === '/incentives/join' && (args.country !== 'United States' && args.country !== 'Canada')) {
      //   internationalStep = '/incentives/join-international';
      // }
      let user: IUser;

      if (args.aid) {
        user = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('uuid', args.aid)
          .firstOrNull();
      }

      let lead: LeadInterface.ILead;
      if (args.luid) {
        lead = await session
          .query<Lead>({ indexName: 'Leads' })
          .whereEquals('uuid', args.luid)
          .firstOrNull();
      }

      if (!lead) {
        lead = new Lead(
          new FunnelReference(funnel.id, funnel.title),
          new FunnelStepReference(funnelStep.stepOrder, funnelStep.url),
          new DomainReference(funnel.domain.id, funnel.domain.tld),
          <string>req.headers['x-forwarded-for'],
          v4(),
          args.email,
          null,
          user ? user.id : null
        );
        await session.store(lead);
      }

      lead.email = args.email;

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

      const nextFunnelStep: IFunnelStep = find<IFunnelStep>(funnel.funnelSteps, (step: IFunnelStep) => {
        return step.stepOrder === funnelStep.stepOrder + 1;
      });
      // return { next: internationalStep || funnelStep.nextFunnelStepUrl, nextFunnelStep };
      return { next: funnelStep.nextFunnelStepUrl, nextFunnelStep };
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
  async updateLeadSeminar(_: any, args: any, { session, req }: Context): Promise<LeadInterface.IUpdateLeadResponse> {
    try {
      const funnel = await session.load<Funnel>(args.fid);
      if (!funnel) return null;
      let internationalStep = null;
      const funnelStep = find<IFunnelStep>(funnel.funnelSteps, (step: IFunnelStep) => {
        return step.stepOrder === args.step;
      });

      if (funnelStep.nextFunnelStepUrl === '/incentives/join' && (args.country !== 'United States' && args.country !== 'Canada')) {
        internationalStep = '/incentives/join-international';
      }
      let user: IUser;

      if (args.aid) {
        user = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('uuid', args.aid)
          .firstOrNull();
      }

      let lead: LeadInterface.ILead;
      if (args.luid) {
        lead = await session
          .query<Lead>({ indexName: 'Leads' })
          .whereEquals('uuid', args.luid)
          .firstOrNull();
      }

      if (!lead) {
        lead = new Lead(
          new FunnelReference(funnel.id, funnel.title),
          new FunnelStepReference(funnelStep.stepOrder, funnelStep.url),
          new DomainReference(funnel.domain.id, funnel.domain.tld),
          <string>req.headers['x-forwarded-for'],
          v4(),
          args.email,
          null,
          user ? user.id : null
        );
        await session.store(lead);
      }

      lead.email = args.email;

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
      try {
        if (args.email && args.firstName && args.lastName) {
          await addProspectAndSendEmail(
            session,
            {
              deliveryEndpoint: args.email,
              firstName: args.firstName,
              lastName: args.lastName,
              certificateId: 'certificates/35-A',
              email: args.email,
              personalizedMessage: null,
            },
            'users/65-A',
            'eebfcc06d2',
            false
          );
        }
      } catch (ex) {
        const error = new Exception(
          null,
          null,
          'updateLead > addProspectAndSendEmail Error trying to add a prospect and send email',
          ex.message,
          args
        );
        await session.store(error);
        await session.saveChanges();
      }

      const nextFunnelStep: IFunnelStep = find<IFunnelStep>(funnel.funnelSteps, (step: IFunnelStep) => {
        return step.stepOrder === funnelStep.stepOrder + 1;
      });
      return { next: internationalStep || funnelStep.nextFunnelStepUrl, nextFunnelStep };
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async addToMailchimp(_parent, args: any, { session, req }: Context): Promise<LeadInterface.IResult> {
    try {
      addProspectAndSendEmail(
        session,
        {
          deliveryEndpoint: args.deliveryEndpoint,
          firstName: args.firstName,
          lastName: args.lastName,
          certificateId: 'certificates/35-A',
          email: args.email,
          personalizedMessage: null,
          phone: args.phone,
        },
        null,
        'c1bdb95443',
        false,
        args.tags
      );
      return { message: 'success', success: true };
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
};
