import * as uuid from 'uuid';
import Mailchimp = require('mailchimp-api-v3');
import { Certificate } from '../db/models/Certificate';
import { ICertificate } from '../interfaces/certificates';
import { IProspect, IAddProspect } from '../interfaces/prospects';
import { IUser } from '../interfaces/users';
import { IDocumentSession } from 'ravendb';
import { Prospect } from '../db/models/Prospect';
import { capitalizeEachFirstLetter, getNowUtc, sendInvitation, createAndSendException } from '../utils';
import { Exception } from '../db/models/Exception';
import { User } from '../db/models/User';
import { DeliveryMethod } from '../interfaces/prospects';
import { findMailChimpUserByEmail } from './mailchimp';
const mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');

export async function addProspectAndSendEmail(
  session: IDocumentSession,
  args: IAddProspect,
  userId: string,
  listIdMailChimp?: string,
  customer?: boolean,
  tags: string[] = ['Optin']
): Promise<IProspect> {
  let prospect: IProspect;
  let user: IUser;
  try {
    if (listIdMailChimp) {
      mailchimp
        .post(`/lists/${listIdMailChimp}/members`, {
          email_address: args.deliveryEndpoint.toLowerCase().trim(),
          status: 'subscribed',
          merge_fields: { FNAME: args.firstName, LNAME: args.lastName, PHONE: args.phone },
          tags,
        })
        .then(res => {})
        .catch(err => {
          const error = new Exception(
            null,
            null,
            'addProspectAndSendEmail error trying to insert the user email in the mailChimp list',
            err,
            args
          );
          session.store(error);
          session.saveChanges();
        });
    }

    return await sendCertificateEmail(session, args, userId, listIdMailChimp);

    return prospect;
  } catch (ex) {
    const error = new Exception(null, null, new Error(ex.message).stack, ex.message, args);
    await session.store(error);
    await session.saveChanges();
    throw new Error('There was an error. Please try again. The Tech team has been notified.');
  }
}

export async function sendCertificateEmail(
  session: IDocumentSession,
  args: IAddProspect,
  userId: string = 'users/65-A',
  listIdMailChimp?: string
): Promise<IProspect> {
  let certificate: ICertificate;
  let prospect: IProspect;
  certificate = await session.load<Certificate>(args.certificateId);
  const user = await session.load<User>(userId);
  prospect = new Prospect(
    null,
    uuid.v1(),
    userId,
    capitalizeEachFirstLetter(args.firstName),
    capitalizeEachFirstLetter(args.lastName),
    args.deliveryEndpoint.toLowerCase().trim(),
    DeliveryMethod.Email,
    [],
    certificate,
    args.personalizedMessage || certificate.defaultMessage
  );
  prospect.createdAt = getNowUtc();
  prospect.updatedAt = getNowUtc();
  await session.store(prospect);
  await session.saveChanges();
  try {
    sendInvitation(prospect, certificate, user, !listIdMailChimp);
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
  }
  await session.saveChanges();

  return prospect;
}
