import * as uuid from 'uuid';
import * as moment from 'moment';
import { Context, getNowUtc, sendAssuredTravelCertificateLink, sendUnlimitedCertificatesLink, sendSfxCertificateLink } from '../../utils';
import { Prospect, Visit } from '../../db/models/Prospect';
import { verifyAccess, createAndSendException, sendInvitation, getIp, sendCertificate, capitalizeEachFirstLetter } from '../../utils';
import Roles from '../../roles';
import { User } from '../../db/models/User';
import { Certificate } from '../../db/models/Certificate';
import { Exception } from '../../db/models/Exception';
import { IUser } from '../../interfaces/users';
import { ICertificate } from '../../interfaces/certificates';
import * as sfx from '../../helpers/sfx';
import { AssuredTravelRequestCertificateRequest, SfxCertificateOrderRequest } from '../../db/models/sfx';
import { DumpBucket } from '../../db/models/DumpBucket';
import { IProspect, IAddProspect, IAddGiftProspect } from '../../interfaces/prospects';
import { DeliveryMethod } from '../../interfaces/prospects';
import { addProspectAndSendEmail } from '../../helpers/prospect';

export default {
  async addProspectGift(_parent, args: IAddGiftProspect, { req, session }: Context): Promise<IProspect> {
    try {
      const user = await session
        .query<IUser>({ indexName: 'Users' })
        .whereEquals('username', args.referralCode)
        .firstOrNull();
      const certificate = await session.load<Certificate>(`certificates/${args.certificateCode}`);
      const prospect = new Prospect(null, uuid.v1(), user.id, '', '', '', null, [], certificate, certificate.defaultMessage);
      prospect.createdAt = getNowUtc();
      prospect.updatedAt = getNowUtc();
      await session.store(prospect);
      await session.saveChanges();

      return prospect;
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, args);
      await session.store(error);
      await session.saveChanges();
      console.log(ex);
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async addProspect(_parent, args: IAddProspect, { req, session }: Context): Promise<IProspect> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      return await addProspectAndSendEmail(session, args, req.user.id);
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, args);
      await session.store(error);
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async acceptProspectCertificate(_parent, args: IProspect, { session, req }: Context): Promise<Prospect> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      let prospect = await session
        .query<Prospect>({ collection: 'Prospects' })
        .whereEquals('uuid', args.uuid)
        .firstOrNull();

      if (!prospect) {
        return null;
      }

      const user = await session.load<User>(prospect.userId);

      prospect.visits.push(new Visit(new Date(), getIp(req), req.url));
      prospect = Object.assign(prospect, {
        firstName: args.firstName,
        lastName: args.lastName,
        deliveryEndpoint: args.deliveryEndpoint,
        deliveryMethod: DeliveryMethod.Email,
        redeemed: true,
        updatedAt: getNowUtc(),
      });
      await session.saveChanges();

      try {
        const certificate = await session.load<Certificate>(prospect.certificate.id);
        switch (certificate.vendor) {
          case 'Assured Travel':
            if (certificate.sfx) {
              try {
                const response = await sfx.requestSfxCertificate(
                  new SfxCertificateOrderRequest(
                    certificate.sfx.offer_id,
                    prospect.userId,
                    prospect.deliveryEndpoint,
                    prospect.id,
                  )
                );
                if (response) {
                  prospect.sfx = response;
                  const dump = new DumpBucket(null, 'Prospects > RequestCertificate', {
                    location: {
                      message: 'SFX Certificate Order Response',
                      function: 'prospects.ts > assuredTravel.requestCertificate()',
                    },
                    prospect,
                    response,
                  });
                  await session.store(dump);
                  await session.saveChanges();

                  if (response.status !== 1) {
                    await session.store(
                      await createAndSendException(
                        null,
                        prospect.id,
                        new Error(response.error).stack,
                        { response, errorMessage: response.error, user, prospect, certificate, args },
                        true
                      )
                    );
                    await session.saveChanges();
                  }

                  await sendSfxCertificateLink(prospect, user, response.certs[0].code);
                }
              } catch (ex) {
                await session.store(
                  await createAndSendException(null, prospect.id, new Error(ex.message).stack, {
                    errorMessage: ex.message,
                    user,
                    prospect,
                    certificate,
                    args,
                  })
                );
                await session.saveChanges();
              }
            }
            break;

          case 'Unlimited Certificates':
            await sendUnlimitedCertificatesLink(prospect, user);
            break;

          default:
            const cmiResponse = await sendCertificate(prospect);
            if (!cmiResponse.sent) {
              await session.store(
                await createAndSendException(
                  prospect.id,
                  new Error(cmiResponse.message).stack,
                  cmiResponse.message,
                  {
                    location: {
                      function: 'prospects.ts > acceptProspectCertificate()',
                      location: 'await sendCertificate(prospect)',
                    },
                    data: cmiResponse.data,
                    prospect,
                  },
                  true
                )
              );
              await session.saveChanges();
            }
            break;
        }
      } catch (ex) {
        await session.store(await createAndSendException(prospect.id, new Error(ex.message).stack, ex.message, prospect));
        await session.saveChanges();
      }
      return prospect;
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, args);
      await session.store(error);
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async sendCertificateLink(_parent, args: IProspect, { session, req }: Context): Promise<Prospect> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      let prospect = await session
        .query<Prospect>({ collection: 'Prospects' })
        .whereEquals('uuid', args.uuid)
        .firstOrNull();
      if (!prospect) {
        return null;
      }

      prospect.visits.push(new Visit(new Date(), getIp(req), req.url));
      prospect = Object.assign(prospect, {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.deliveryEndpoint,
        redeemed: true,
        updatedAt: getNowUtc(),
      });
      await session.saveChanges();

      try {
        await sendCertificate(prospect);
      } catch (ex) {
        await session.store(await createAndSendException(prospect.id, new Error(ex.message).stack, ex.message, prospect));
        await session.saveChanges();
      }

      return prospect;
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, args);
      await session.store(error);
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async addProspectVisit(_parent, args: IProspect, { session, req }: Context) {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      let prospect = await session
        .query<Prospect>({ collection: 'Prospects' })
        .whereEquals('uuid', args.uuid)
        .firstOrNull();
      if (!prospect) {
        return null;
      }
      prospect.visits.push(new Visit(new Date(), getIp(req), req.url));
      prospect.updatedAt = getNowUtc();
      await session.saveChanges();
      return prospect;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
};
