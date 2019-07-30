import { Router, Request, Response } from 'express';
import { CustomRequest } from '../utils';
import { User, PasswordResetToken } from '../db/models/User';
import { ISorSsoLoginResponse } from '../interfaces/sor';
import { sorSsoLogin, SorClubs } from '../helpers/sor';
import * as Utils from '../utils';
import { v4 as uuidV4 } from 'uuid';

let routes = Router();

routes
  .post('/account/createLocalAccount', (req, res) => {
    return res.json({
      success: true,
      localUser: {
        firstName: 'Troy',
        lastName: 'Zarger',
        email: 'troy@troyzarger.com',
      },
      token: 'token-goes-here',
    });
  })
  .get('/account/createLocalAccount', (req, res) => {
    return res.json({
      success: true,
      localUser: {
        firstName: 'Troy',
        lastName: 'Zarger',
        email: 'troy@troyzarger.com',
      },
      token: 'token-goes-here',
    });
  })
  .get('/account/byToken', async (req, res) => {
    const session = req.app.locals.db.openSession();
    const testing = {
      Name: 'from Api',
    };
    await session.store(testing, 'Doh|');
    await session.saveChanges();
    return res.json({ result: testing });
  })
  .post('/account', (req, res) => {
    return res.json({ success: true });
  })
  .get('/account', (req, res) => {
    return res.json({ success: true });
  })
  .get('/account/by/:date', (req, res) => {
    return res.json({ success: true });
  })
  .post('/account/status', (req, res) => {
    return res.json({ success: true });
  })
  .post('/account/range', (req, res) => {
    return res.json({ success: true });
  })
  .post('/account/filtered', (req, res) => {
    return res.json({ success: true });
  })
  .post('/account/tv/password/reset', async (req: CustomRequest, res: Response) => {
    try {
      const session = req.db.openSession();

      try {
        const { email } = req.body;
        const user = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('email', email)
          .firstOrNull();

        if (user) {
          const token = uuidV4();
          user.resetToken = token;
          user.updatedAt = Utils.getNowUtc();

          const expiresAt: Date = new Date(new Date().getTime() + 10 * 60000);
          const passwordResetTokenId: string = token;
          let passwordResetToken = new PasswordResetToken(passwordResetTokenId, user.id);
          await session.store(passwordResetToken);
          const metadata = session.advanced.getMetadataFor(passwordResetToken);
          metadata['@expires'] = expiresAt.toISOString();

          await session.saveChanges();

          Utils.sendPasswordReset(user, token);
        } else {
          res.json({ success: false, message: 'Email Invalid' });
        }
      } catch (ex) {
        await session.store(await Utils.createAndSendException(null, new Error(ex.message).stack, ex.message, req.body));
        await session.saveChanges();
        throw new Error('Unable to locate account by email entered.');
      }
    } catch (ex) {
      res.json({ success: false, message: ex.message });
    }
  });

export default routes;
