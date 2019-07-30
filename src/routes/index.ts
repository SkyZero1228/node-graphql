import { Application, Router } from 'express';
import accountRoutes from './accountRoutes';
import testRoutes from './testRoutes';
import sorRoutes from './sorRoutes';
import zapierRoutes from './zapierRoutes';
import stripeRoutes from './stripeRoutes';
import clickFunnelsRoutes from './clickFunnelsRoutes';
import clickFunnelsTemp from './clickFunnelsTemp';
import awsHealthCheck from './awsHealthCheck';
import sfxRoutes from './sfx';
import coinMDRoutes from './coinMDRoutes';
import memberTek from './memberTekRoutes';
import certificates from './certificates';
import mailchimp from './mailchimp';

export function registerRestfulRoutes(app: Application) {
  registerApiRoutes(app);
}

function registerApiRoutes(app: Application) {
  let routePrefix = '/api';

  app.use('/', clickFunnelsTemp);
  app.use('/', awsHealthCheck);

  // Admin Routes
  let router = Router();
  router.use(accountRoutes);
  router.use(testRoutes);
  router.use(sorRoutes);
  router.use(zapierRoutes);
  router.use(stripeRoutes);
  router.use(clickFunnelsRoutes);
  router.use(sfxRoutes);
  router.use(coinMDRoutes);
  router.use(memberTek);
  router.use(certificates);
  router.use(mailchimp);
  app.use(routePrefix, router);
}
