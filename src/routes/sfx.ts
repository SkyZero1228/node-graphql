import { Router, Response } from 'express';
import { CustomRequest } from '../utils';
import axios from 'axios';
import * as sfx from '../helpers/sfx';
import * as assuredTravelClasses from '../db/models/sfx';
import { v1 } from 'uuid';
import { indexOf } from 'lodash';
import { ClickFunnelsWebHook } from '../db/models/ClickFunnelsWebHook';
import config from '../config';
import { HealthCheck } from '../db/models/HealthCheck';

const constants = {
  urls: {
    live: 'https://tripvaletclix.htoademos.com/tripvaletintegration',
    test: 'http://reg8.htoademos.com/tripvaletintegration/',
  },
  userIds: {
    live: 62,
    test: 53,
  },
};
let routes = Router();

routes.get('/test', async (req: CustomRequest, res: Response) => {
  const url = ``;
  const response = await sfx.test(new assuredTravelClasses.AssuredTravelTest(v1()));
  if (response.data) {
    const session = req.db.openSession();
  }
  res.sendStatus(200);
});

routes.post('/sfx/getProducts', async (req: CustomRequest, res: Response) => {
  const response = await sfx.getProducts(new assuredTravelClasses.AssuredTravelGetProductsRequest(v1()));
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.json(response);
});

routes.post('/sfx/getOffers', async (req: CustomRequest, res: Response) => {
  const response = await sfx.getOffers();
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.json(response);
});

routes.post('/requestCertificate', async (req: CustomRequest, res: Response) => {
  const { certificateTypeId, memberId, prospectEmailAddress, prospectId } = req.body;
  const response = await sfx.getProducts(
    new assuredTravelClasses.AssuredTravelRequestCertificateRequest(certificateTypeId, memberId, prospectEmailAddress, prospectId, v1())
  );
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.sendStatus(200);
});

routes.post('/requestSfxCertificate', async (req: CustomRequest, res: Response) => {
  const { offerId, memberId, prospectEmailAddress, prospectId } = req.body;
  const response = await sfx.requestSfxCertificate(
    new assuredTravelClasses.SfxCertificateOrderRequest(offerId, memberId, prospectEmailAddress, prospectId)
  );
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.sendStatus(200);
});

routes.post('/getCertificateActivity', async (req: CustomRequest, res: Response) => {
  const { activityType, fromDate, endDate } = req.body;
  const response = await sfx.getProducts(
    new assuredTravelClasses.AssuredTravelGetCertificateActivityRequest(activityType, fromDate, endDate, v1())
  );
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.sendStatus(200);
});

routes.post('/getCertificateStatus', async (req: CustomRequest, res: Response) => {
  const { certificateNumber, prospectId } = req.body;
  const response = await sfx.getProducts(
    new assuredTravelClasses.AssuredTravelGetCertificateStatusRequest(certificateNumber, prospectId, v1())
  );
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.sendStatus(200);
});

routes.post('/revokeCertificate', async (req: CustomRequest, res: Response) => {
  const { certificateNumber, prospectId, reason } = req.body;
  const response = await sfx.getProducts(
    new assuredTravelClasses.AssuredTravelRevokeCertificateRequest(certificateNumber, prospectId, reason, v1())
  );
  if (response.status == 0) {
    const session = req.db.openSession();
  }
  res.sendStatus(200);
});

export default routes;
