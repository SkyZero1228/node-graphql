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

let routes = Router();

routes
  .post('/coinmd/new/member', async (req: CustomRequest, res: Response) => {
    const { memberNumber, firstName, lastName, email, username, phone, sponsorMemberNumber, password } = req.body;
    const session = req.db.openSession();
    let newUser: IUser;
    let reason: string;
    try {
      newUser = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('coinMDMemberNumber', memberNumber)
        .firstOrNull();

      if (newUser) {
        reason = `${newUser.firstName} ${newUser.lastName} with Member Number: ${newUser.coinMD.memberNumber} already exists.`;
        await session.store(await createAndSendException(memberNumber, new Error().stack, reason, req.body));
        await session.saveChanges();
        res.json({ success: false, reason });
      } else {
        const sponsor = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('coinMDMemberNumber', sponsorMemberNumber)
          .firstOrNull();
        if (!sponsor) {
          reason = `A Sponsor with Member Number '${sponsorMemberNumber}' not found. User Rejected.`;
          await session.store(await createAndSendException(memberNumber, new Error().stack, reason, req.body));
          await session.saveChanges();
          res.json({
            success: false,
            reason: reason,
          });
        } else {
          const hashedPassword = await bcrypt.hash(password ? password : username.toLowerCase(), 10);
          newUser = new User(null, v1(), capitalizeEachFirstLetter(firstName.trim()), capitalizeEachFirstLetter(lastName.trim()), username, email, hashedPassword, false, [], [], null, true, phone.trim(), ['CoinMD Member'], null, null, null);
          newUser.createdAt = getNowUtc();

          //CoinMD Properties
          newUser.coinMD = {
            memberNumber: +memberNumber,
            sponsorMemberNumber: sponsorMemberNumber,
            sponsorEmail: sponsor ? sponsor.email : '',
            sponsorUsername: sponsor ? sponsor.username : '',
          };

          newUser.sponsor = {
            id: sponsor.id,
            email: sponsor.email,
            firstName: sponsor.firstName,
            lastName: sponsor.lastName,
          };

          // Tree Ancestry
          newUser.ancestry = {
            parentUserId: sponsor.id,
            ancestors: appendUserIdToAncestors(sponsor.id, sponsor.ancestry ? sponsor.ancestry.ancestors : ''),
            depth: sponsor.ancestry ? sponsor.ancestry.depth + 1 : 1,
          };

          newUser.updatedAt = getNowUtc();
          await session.store(newUser);
          await session.saveChanges();

          let response = {
            success: true,
            user: {
              id: newUser.id,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              email: newUser.email,
              phone: newUser.phone,
              username: newUser.username,
              coinMD: newUser.coinMD,
              sponsor: newUser.sponsor,
              createdAt: newUser.createdAt,
              updatedAt: newUser.updatedAt,
            },
          };

          res.json({ response });
        }
      }
    } catch (ex) {
      await session.store(await createAndSendException(memberNumber, new Error(ex.message).stack, ex.message, req.body));
      await session.saveChanges();
      res.json({ success: false, reason: 'There was an error in your request. Please try again.' });
    }
  })
  .post('/coinmd/update/email', async (req: CustomRequest, res: any) => {
    try {
      const { oldEmail, newEmail } = req.body;
      if (oldEmail.trim() && oldEmail.trim()) {
        const patchOperation = new PatchByQueryOperation(`from index Users  as u
where u.email = "${oldEmail.trim()}" or u.coinmdSponsorEmail = "${oldEmail.trim()}" or u.sponsorEmail = "${oldEmail.trim()}" 
update {
  if( this.email == "${oldEmail.trim()}" ) {
    this.email = "${newEmail.trim()}"
  }
  if( this.coinMD.sponsorEmail == "${oldEmail.trim()}" ) {
    this.coinMD.sponsorEmail = "${newEmail.trim()}"
  }
  if( this.sponsor.email == "${oldEmail.trim()}" ) {
    this.sponsor.email = "${newEmail.trim()}"
  }
}`);
        const op = await req.db.operations.send(patchOperation);
        await op.waitForCompletion();
        res.json({ success: true, message: 'Update Completed' });
      }
    } catch (ex) {
      const session = req.db.openSession();
      await session.store(await createAndSendException(req.body.data.object.id, new Error(ex.message).stack, ex.message, req.body));
      await session.saveChanges();
      res.json({ success: false, message: ex.message });
    }
  });

export default routes;
