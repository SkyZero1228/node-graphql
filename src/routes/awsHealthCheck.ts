import { Router, Response } from 'express';
import { CustomRequest } from '../utils';
import { indexOf } from 'lodash';
import { ClickFunnelsWebHook } from '../db/models/ClickFunnelsWebHook';
import config from '../config';
import { HealthCheck } from '../db/models/HealthCheck';

let routes = Router();

routes.get('/ping', async (req: CustomRequest, res: Response) => {
  // const session = req.db.openSession();
  // const healthCheck = new HealthCheck(null, null, { headers: req.headers, body: req.body });
  // await session.store(healthCheck);
  // await session.saveChanges();
  res.sendStatus(200);
});

export default routes;
