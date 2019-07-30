import { Router, Response } from 'express';

import { CustomRequest } from '../utils';
import { User } from '../db/models/User';
import { find } from 'lodash';
import * as bcrypt from 'bcryptjs';
import { v1 } from 'uuid';

import * as Utils from '../utils';
import { Certificate } from '../db/models/Certificate';
import { ICertificate } from '../interfaces/certificates';
import { Prospect } from '../db/models/Prospect';
import { Exception } from '../db/models/Exception';
import { getTemplateHtml } from '../helpers/membertek';
import { DeliveryMethod } from '../interfaces/prospects';
import { IUser } from '../interfaces/users';

let routes = Router();

routes
  .post('/membertek/login', async (req: CustomRequest, res: Response) => {
    try {
      const { Email: email, Password: password } = req.body;
      const session = req.db.openSession();
      let user = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('email', email)
        .whereEquals('active', true)
        .firstOrNull();

      if (!user) {
        return res.json({ Status: 0 });
      }
      user.updatedAt = Utils.getNowUtc();

      const valid = await bcrypt.compare(password, user.password);
      if (!valid && password != user.password) {
        return res.json({ Status: 0 });
      }
      await session.saveChanges();

      return res.json({ Status: 1, ID: user.uuid });
    } catch (ex) {
      return res.json({ Status: 0 });
    }
  })
  .post('/membertek/member/info', async (req: CustomRequest, res) => {
    try {
      const { ID: uuid } = req.body;

      const session = req.db.openSession();
      let user = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('uuid', uuid)
        .whereEquals('active', true)
        .firstOrNull();

      if (!user) {
        return res.json({ Status: 0 });
      }
      user.updatedAt = Utils.getNowUtc();
      await session.saveChanges();

      let sponsor: IUser;
      if (user.sponsor && user.sponsor.id) {
        sponsor = await session.load<User>(user.sponsor.id);
        session.advanced.evict(sponsor);
      }

      return res.json({
        Status: 1,
        FirstName: user.firstName,
        LastName: user.lastName,
        Country: user.address.country,
        PostalCode: user.address.zip,
        Username: user.username,
        Telephone: user.phone,
        Email: user.email,
        Language: 'English',
        JoinDateTime: user.createdAt,
        EnrollerID: sponsor ? sponsor.uuid : '',
      });
    } catch (ex) {
      return res.json({ Status: 0 });
    }
  })
  .get('/membertek/certificates', async (req: CustomRequest, res) => {
    try {
      const session = req.db.openSession();
      let certificates = await session
        .query<Certificate>({ collection: 'Certificates' })
        .whereEquals('active', true)
        .all();

      let certs: any[] = certificates.map((cert: ICertificate) => {
        const image = find(cert.images, { type: 'Email' });
        return { ImageURL: `https://incentives.tripvalet.com${image.url}`, ID: cert.id, DefaultMessage: cert.defaultMessage };
      });

      return res.json(certs);
    } catch (ex) {
      return res.json({ Status: 0, ReasonText: ex.message });
    }
  })
  .post('/membertek/certificate/send', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    try {
      const {
        MemberID: uuid,
        CertificateID: certificateId,
        FirstName: firstName,
        LastName: lastName,
        Email: deliveryEndpoint,
        Message: message,
      } = req.body;
      const certificate = await session.load<Certificate>(certificateId);
      session.advanced.evict(certificate);
      let user = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('uuid', uuid)
        .firstOrNull();
      let prospect = new Prospect(
        null,
        v1(),
        user.id,
        Utils.capitalizeEachFirstLetter(firstName),
        Utils.capitalizeEachFirstLetter(lastName),
        deliveryEndpoint.toLowerCase().trim(),
        DeliveryMethod.Email,
        [],
        certificate,
        message
      );
      prospect.createdAt = Utils.getNowUtc();
      prospect.updatedAt = Utils.getNowUtc();
      await session.store<Prospect>(prospect);
      await session.saveChanges();

      try {
        const url = `https://incentives.tripvalet.com/gift/${prospect.uuid}`;
        return res.json({ Status: 1, ProspectID: prospect.id, Url: url, Html: getTemplateHtml(prospect, certificate, user) });
      } catch (ex) {
        await session.store(
          await Utils.createAndSendException(null, prospect.id, new Error(ex.message).stack, {
            errorMessage: ex.message,
            user,
            prospect,
            certificate,
            body: req.body,
          })
        );
        await session.saveChanges();
        return res.json({ Status: 0, ReasonText: ex.message });
      }
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, req.body);
      await session.store(error);
      await session.saveChanges();
      return res.json({ Status: 0, ReasonText: ex.message });
    }
  })
  .post('/membertek/certificate/sent', async (req: CustomRequest, res) => {
    try {
      const session = req.db.openSession();
      const { ProspectID: prospectId, DeliveryMethod: deliveryMethod, Endpoint: deliveryEndpoint } = req.body;
      let prospect = await session.load<Prospect>(prospectId);
      prospect.deliveryEndpoint = deliveryEndpoint;
      prospect.deliveryMethod = deliveryMethod;
      await session.saveChanges();

      return res.json({ Status: 1 });
    } catch (ex) {
      return res.json({ Status: 0, ReasonText: ex.message });
    }
  });

export default routes;
