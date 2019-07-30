import { Router, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { CustomRequest, capitalizeEachFirstLetter, getNowUtc, createAndSendException } from '../utils';
import { indexOf } from 'lodash';
import { ClickFunnelsWebHook } from '../db/models/ClickFunnelsWebHook';
import config from '../config';
import { HealthCheck } from '../db/models/HealthCheck';
import { User } from '../db/models/User';
import users from '../resolvers/Queries/users';
import { appendUserIdToAncestors } from '../helpers/user';
import { IUser } from '../interfaces/users';
import { AwaitableMaintenanceOperation, PatchByQueryOperation } from 'ravendb';
import { v1 } from 'uuid';
import { updateMailChimpUser, findAllMailChimpUsers, updateMailChimpTag } from '../helpers/mailchimp';

let routes = Router();

routes.post('/mailchimp/update-customer', async (req: CustomRequest, res: Response) => {
  try {
    const session = req.db.openSession();
    return res.json(await updateMailChimpUser(session, req.body.userEmail, req.body.listIdMailChimp, req.body.interests || [], true));
  } catch (ex) {
    console.log(ex);
  }
});

routes.post('/mailchimp/customer-tag', async (req: CustomRequest, res: Response) => {
  try {
    const mailChimpUsers = await findAllMailChimpUsers(req.body.listIdMailChimp);
    for (let members of mailChimpUsers.members) {
      if (members.tags.length === 0) {
        if (members.merge_fields.CUSTOMER === 'Yes') {
          await updateMailChimpTag(
            [{ name: 'Optin', status: 'inactive' }, { name: 'Customer', status: 'active' }],
            req.body.listIdMailChimp,
            members.id
          );
        } else {
          await updateMailChimpTag([{ name: 'Optin', status: 'active' }], req.body.listIdMailChimp, members.id);
        }
      }
    }
    res.json({ codeStatus: 200 });
  } catch (ex) {
    console.log(ex);
  }
});

routes.post('/mailchimp/interest-tags', async (req: CustomRequest, res: Response) => {
  try {
    const mailChimpUsers = await findAllMailChimpUsers(req.body.listIdMailChimp);
    for (let members of mailChimpUsers.members) {
      if (members.tags.length >= 0) {
        let tags: { name: string; status: string }[] = [];
        if (members.merge_fields.BENEFITS === 'Yes') tags.push({ name: 'Interest - Business Benefits', status: 'active' });
        if (members.merge_fields.FUNDRAISE === 'Yes') tags.push({ name: 'Interest - Business Fundraising', status: 'active' });
        if (members.merge_fields.NONPROFIT === 'Yes') tags.push({ name: 'Interest - Non-Profit Fundraising', status: 'active' });
        if (members.merge_fields.AFFILIATE === 'Yes') tags.push({ name: 'Interest - Marketing Our Programs', status: 'active' });
        if (tags.length > 0) {
          await updateMailChimpTag(tags, req.body.listIdMailChimp, members.id);
        }
      }
    }
    res.json({ codeStatus: 200 });
  } catch (ex) {
    console.log(ex);
  }
});

routes.post('/mailchimp/special-39', async (req: CustomRequest, res: Response) => {
  try {
    const mailChimpUsers = await findAllMailChimpUsers(req.body.listIdMailChimp);
    for (let members of mailChimpUsers.members) {
      if (members.tags.length >= 0) {
        await updateMailChimpTag([{ name: 'Original-39', status: 'active' }], req.body.listIdMailChimp, members.id);
      }
    }
    res.json({ codeStatus: 200 });
  } catch (ex) {
    console.log(ex);
  }
});
export default routes;
