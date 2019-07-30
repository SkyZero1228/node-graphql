import * as uuid from 'uuid';
import Mailchimp = require('mailchimp-api-v3');
import { Certificate } from '../db/models/Certificate';
import { ICertificate } from '../interfaces/certificates';
import { IUser } from '../interfaces/users';
import { IDocumentSession } from 'ravendb';
import { Prospect } from '../db/models/Prospect';
import { capitalizeEachFirstLetter, getNowUtc, sendInvitation, createAndSendException } from '../utils';
import { Exception } from '../db/models/Exception';
import { User } from '../db/models/User';
import { DeliveryMethod } from '../interfaces/prospects';
export async function updateMailChimpUser(
  session: IDocumentSession,
  userEmail: string,
  listIdMailChimp: string,
  interests: string[],
  customer: boolean
): Promise<any> {
  try {
    const user = await findMailChimpUserByEmail(userEmail);

    if (user.exact_matches.total_items > 0) {
      const tags = interests.map(interest => ({ name: interest, status: 'active' }));
      await updateMailChimpTag(
        tags.concat([{ name: 'Optin', status: 'inactive' }, { name: 'Customer', status: 'active' }]),
        listIdMailChimp,
        user.exact_matches.members[0].id
      );
    }
  } catch (ex) {
    const error = new Exception(
      null,
      null,
      'addProspectAndSendEmail error trying to insert the user email in the mailChimp list',
      ex.message
    );
    session.store(error);
    session.saveChanges();
  }
}

export async function findMailChimpUserByEmail(userEmail: string): Promise<any> {
  const mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');
  return await mailchimp.get(`/search-members?query=${userEmail}`);
}

export async function findAllMailChimpUsers(listIdMailChimp: string): Promise<any> {
  const mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');
  return await mailchimp.get(`/lists/${listIdMailChimp}/members?count=200`);
}

export async function updateMailChimpTag(tags: any, listIdMailChimp: string, userHash: string): Promise<any> {
  const mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');
  return await mailchimp.post(`/lists/${listIdMailChimp}/members/${userHash}/tags`, {
    tags,
  });
}
