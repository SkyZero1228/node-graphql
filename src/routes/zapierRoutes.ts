import { Router, Response } from 'express';
import { CustomRequest } from '../utils';
import {
  processZapier,
  processTripValetZapier,
  processZapierReplay,
  processBtcZapier,
  processBtcTransactionZapier,
  processTripValetFailedPaymentZapier,
  processStepOneOfTwo,
} from '../helpers/zapier';
import { DumpBucket } from '../db/models/DumpBucket';

let routes = Router();

routes
  .post('/zap/tvi/purchase', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    await processZapier(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/tvi/purchase/replay', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    await processZapierReplay(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/btc/purchase', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    await processBtcZapier(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/btc/transaction', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    await processBtcTransactionZapier(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/tv/purchase', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    await processTripValetZapier(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/failed/payment', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    await processTripValetFailedPaymentZapier(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/step/one/registration', (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    //await processStepOneOfTwo(session, req.body);
    res.sendStatus(200);
  })
  .post('/zap/affiliate/signup', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    const dump = new DumpBucket(null, null, { type: 'Affiliate Signup', payload: req.body });
    await session.store(dump);
    await session.saveChanges();
    res.sendStatus(200);
  });

export default routes;
