import { Router, Response } from 'express';
import { CustomRequest } from '../utils';
import { indexOf } from 'lodash';
import { ClickFunnelsWebHook } from '../db/models/ClickFunnelsWebHook';
import config from '../config';
import { v1 } from 'uuid';

let routes = Router();

routes.post('/clickfunnels/web/hook', async (req: CustomRequest, res: Response) => {
  const session = req.db.openSession();
  const sourceIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.headers['x-zeit-co-forwarded-for'];
  const dump = new ClickFunnelsWebHook(null, { headers: req.headers, body: req.body });
  await session.store(dump);
  await session.saveChanges();
  res.sendStatus(200);
});

routes.post('/clickfunnels/web/hook/id', async (req: CustomRequest, res: Response) => {
  const session = req.db.openSession();
  const sourceIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.headers['x-zeit-co-forwarded-for'];
  const dump = new ClickFunnelsWebHook(null, { callType: 'Twilio Inbound - Request ID', headers: req.headers, body: req.body });
  await session.store(dump);
  await session.saveChanges();
  res.json({ id: v1(), modality: 'OPI' });
});

export default routes;
