import { Router, Request, Response } from 'express';
import * as sgMail from '@sendgrid/mail';
import * as bcrypt from 'bcryptjs';

import { sendInvitation } from '../utils';
import { sorGetMemberByEmail, SorClubs, sorSsoLogin, sorCreateMember, sorCreateMemberIfNeeded, sorGetApiCredentials, sorGetLoginUrl, sorTransferMemberFromBoomerangToVip } from '../helpers/sor';
import { CustomRequest } from '../utils';
import { processZapier, ClickFunnelsZapier } from '../helpers/zapier';
import { ISorApiResponse, ISorSsoLoginResponse, ISorMember, ISorGetMemberApiResponse } from '../interfaces/sor';
import { User } from '../db/models/User';

let routes = Router();

routes.get('/test/', async (req: CustomRequest, res: Response) => {
  const session = req.db.openSession();
  let certificates = session.query({ collection: 'Products' }).whereEquals('active', true);

  certificates.search('title', `*las*`);

  const result = await certificates.all();
  res.json(result);
});

routes.post('/sor/test/sso', async (req: CustomRequest, res: Response) => {
  try {
    console.log(req.body);
    const response: ISorSsoLoginResponse = await sorSsoLogin(SorClubs.TripValetPlus.apiCredentials, req.body.email);
    console.log('response', response);
    res.json(response);
  } catch (ex) {
    res.json({ success: false, message: ex.message });
  }
});

routes.post('/sor/get/member', async (req: CustomRequest, res: Response) => {
  try {
    const response: ISorGetMemberApiResponse = await sorGetMemberByEmail(SorClubs.TripValetPlus.apiCredentials, req.body.email);
    res.json(response.success ? { success: true, sorMember: response } : { success: false, message: `Member with email "${req.body.email}" not Found` });
  } catch (ex) {
    res.json({ success: false, message: ex.message });
  }
});

routes.post('/sor/sso', async (req: CustomRequest, res: Response) => {
  try {
    const session = req.db.openSession();

    let email = decodeURIComponent(req.body.email);
    let password = decodeURIComponent(req.body.password);

    const user = await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('email', email)
      .firstOrNull();

    if (user) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid && password != user.password) {
        res.json({ success: false, message: 'Email or Password Invalid' });
      } else {
        user.password = password;
        await session.saveChanges();

        let apiCredentials = sorGetApiCredentials(user.roles);
        await sorCreateMemberIfNeeded(apiCredentials, session, user);
        const response: ISorSsoLoginResponse = await sorSsoLogin(apiCredentials, email);
        if (response.success) {
          res.json({ success: true, url: `${sorGetLoginUrl(user.roles)}${response.token}` });
        } else {
          res.json({ success: false, message: 'Email or Password Invalid' });
        }
      }
    } else {
      res.json({ success: false, message: 'Email or Password Invalid' });
    }
  } catch (ex) {
    res.json({ success: false, message: ex.message });
  }
});

routes.post('/sor/test/create/member', async (req: CustomRequest, res: Response) => {
  // const session = req.db.openSession();

  try {
    console.log(req.body.params);
    const session = req.db.openSession();
    const response: ISorApiResponse = await sorCreateMember(session, SorClubs.TripValetPlus.apiCredentials, req.body);
    console.log('response', response.ResultType);
    res.json(response);
  } catch (ex) {
    res.json({ success: false, message: ex.message });
  }
});

routes.post('/sor/transfer/from/boomerang/to/vip', async (req: CustomRequest, res: Response) => {
  try {
    const response: ISorApiResponse = await sorTransferMemberFromBoomerangToVip(req.body.email);
    res.json(response);
  } catch (ex) {
    res.json({ success: false, message: ex.message });
  }
});

export default routes;
