import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Domain } from '../../db/models/Domain';
import * as DomainInterface from '../../interfaces/domains';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';
import { DateTime } from 'luxon';

export default {
  async addDomain(_parent, args: DomainInterface.IDomainArgs, { session, req }: Context): Promise<DomainInterface.IDomain> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { domain: domainInput } = args;
      const domain = new Domain(domainInput.tld, domainInput.enabled);
      domain.createdAt = getNowUtc();
      domain.updatedAt = getNowUtc();
      await session.store(domain);
      await session.saveChanges();
      return domain;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editDomain(_parent, args: DomainInterface.IDomainArgs, { session, req }: Context): Promise<DomainInterface.IDomain> {
    verifyAccess(req, [Roles.Administrator]);
    const { domain: domainInput } = args;
    try {
      let domain = await session.load<Domain>(domainInput.id);

      if (!domain) {
        return null;
      }

      // let utc = DateTime.fromJSDate(new Date(Date.UTC()))
      //   .toUTC(new Date().getTimezoneOffset())
      //   .toJSDate();

      domain = Object.assign(
        domain,
        { ...domainInput },
        {
          updatedAt: getNowUtc(),
        }
      );
      await session.saveChanges();
      return domain;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
};
