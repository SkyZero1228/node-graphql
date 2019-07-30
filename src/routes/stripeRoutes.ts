import { Router, Response } from 'express';
import { CustomRequest, createAndSendException } from '../utils';
import { indexOf } from 'lodash';
import { DumpBucket } from '../db/models/DumpBucket';
import config from '../config';
import * as stripe from '../helpers/stripe';
import { Order } from '../db/models/Order';
import { processInvoiceUpdated, processCustomerSubscriptionCreated, processCustomerSubscriptionUpdated } from '../helpers/stripe';
import { PaymentAccountEnum } from '../interfaces/product';

let routes = Router();

routes.post('/stripe/web/hook', async (req: CustomRequest, res: Response) => {
  const session = req.db.openSession();
  const sourceIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
  if (indexOf(config.StripeWebHookIPs, sourceIp) >= 0 || true) {
    const dump = new DumpBucket(null, null, req.body);
    await session.store(dump);
    await session.saveChanges();
    try {
      const hasEventHappenedBefore = await session
        .query<Order>({ collection: 'Orders' })
        .whereEquals('invoice.eventId', req.body.id)
        .orElse()
        .whereEquals('invoice.invoiceId', req.body.data.object.id)
        .any();

      if (!hasEventHappenedBefore) {
        switch (req.body.type) {
          case 'invoice.updated':
            //res.json(await processInvoiceUpdated(session, req.body.data.id, req.body.data.object));
            res.sendStatus(202);
            break;

          case 'invoice.payment_succeeded':
            res.json(await processInvoiceUpdated(session, req.body));
            break;

          case 'invoice.created':
            res.sendStatus(202);
            break;

          case 'invoice.upcoming':
            res.sendStatus(202);
            break;

          case 'customer.subscription.created':
            res.json(await processCustomerSubscriptionCreated(session, req.body));
            break;

          case 'customer.subscription.updated':
            res.json(await processCustomerSubscriptionUpdated(session, req.body, PaymentAccountEnum.TripValetIncentives));
            break;

          case 'plan.created':
            res.sendStatus(202);
            break;

          case 'plan.updated':
            res.sendStatus(202);
            break;

          case 'plan.deleted':
            res.sendStatus(202);
            break;

          case 'product.created':
            res.sendStatus(202);
            break;

          case 'product.updated':
            res.sendStatus(202);
            break;

          case 'product.deleted':
            res.sendStatus(202);
            break;

          default:
            res.sendStatus(202);
            break;
        }
      } else {
        res.sendStatus(202);
      }
    } catch (ex) {
      await session.store(await createAndSendException(req.body.data.object.id, new Error(ex.message).stack, ex.message, req.body));
      await session.saveChanges();
      res.sendStatus(400);
    }
  } else {
    const dump = new DumpBucket(null, null, {
      headers: req.headers,
      success: false,
      reason: 'IP not found in Stripe WebHook IP list',
      stripWebHookIPs: config.StripeWebHookIPs,
      body: req.body,
    });
    await session.store(dump);
    await session.saveChanges();
    res.sendStatus(400);
  }
});

routes.post('/stripe/web/hook/tv', async (req: CustomRequest, res: Response) => {
  return await handleStripeWebHook(req, res, PaymentAccountEnum.TripValetLLC);
});

routes.post('/stripe/web/hook/tvi', async (req: CustomRequest, res: Response) => {
  return await handleStripeWebHook(req, res, PaymentAccountEnum.TripValetIncentives);
});

routes.post('/stripe/web/hook/gm', async (req: CustomRequest, res: Response) => {
  return await handleStripeWebHook(req, res, PaymentAccountEnum.GetMotivated);
});

routes.post('/stripe/web/hook/tvg', async (req: CustomRequest, res: Response) => {
  return await handleStripeWebHook(req, res, PaymentAccountEnum.TripValetGeneral);
});

async function handleStripeWebHook(req: CustomRequest, res: Response, paymentAccountKey: PaymentAccountEnum) {
  const session = req.db.openSession();
  const sourceIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];
  if (indexOf(config.StripeWebHookIPs, sourceIp) >= 0 || true) {
    const dump = new DumpBucket(null, req.body.type, req.body);
    await session.store(dump);
    await session.saveChanges();
    try {
      const hasEventHappenedBefore = await session
        .query<Order>({ collection: 'Orders' })
        .whereEquals('invoice.eventId', req.body.id)
        .orElse()
        .whereEquals('invoice.invoiceId', req.body.data.object.id)
        .any();

      if (!hasEventHappenedBefore) {
        const dumpBucket = new DumpBucket(null, `[TRACE]: ${req.body.type}`, {
          function: 'handleStripeWebHook > Line 121',
          paymentAccountKey,
          event: req.body,
        });
        await session.store(dumpBucket);
        await session.saveChanges();

        switch (req.body.type) {
          case 'invoice.updated':
            //res.json(await processInvoiceUpdated(session, req.body.data.id, req.body.data.object));
            res.sendStatus(202);
            break;

          case 'invoice.payment_succeeded':
            res.json(await processInvoiceUpdated(session, req.body, paymentAccountKey));
            break;

          case 'invoice.created':
            res.sendStatus(202);
            break;

          case 'invoice.upcoming':
            res.sendStatus(202);
            break;

          case 'customer.subscription.created':
            res.json(await processCustomerSubscriptionCreated(session, req.body, paymentAccountKey));
            break;

          case 'customer.subscription.updated':
            res.json(await processCustomerSubscriptionUpdated(session, req.body, paymentAccountKey));
            break;

          case 'plan.created':
            res.sendStatus(202);
            break;

          case 'plan.updated':
            res.sendStatus(202);
            break;

          case 'plan.deleted':
            res.sendStatus(202);
            break;

          case 'product.created':
            res.sendStatus(202);
            break;

          case 'product.updated':
            res.sendStatus(202);
            break;

          case 'product.deleted':
            res.sendStatus(202);
            break;

          default:
            res.sendStatus(202);
            break;
        }
      } else {
        res.sendStatus(202);
      }
    } catch (ex) {
      await session.store(await createAndSendException(req.body.data.object.id, new Error(ex.message).stack, ex.message, req.body));
      await session.saveChanges();
      res.sendStatus(400);
    }
  } else {
    const dump = new DumpBucket(null, null, {
      headers: req.headers,
      success: false,
      reason: 'IP not found in Stripe WebHook IP list',
      stripWebHookIPs: config.StripeWebHookIPs,
      body: req.body,
    });
    await session.store(dump);
    await session.saveChanges();
    res.sendStatus(400);
  }
}

routes.get('/stripe/invoice/:id', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getInvoice(req.params.id);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/product/:id', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getProduct(req.params.id);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/plan/:id', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getPlan(req.params.id);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/charge/:id', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getCharge(req.params.id, PaymentAccountEnum.TripValetIncentives);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/event/:id', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getEvents(req.params.id);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/customer/:id', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getCustomer(req.params.id, PaymentAccountEnum.TripValetIncentives);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/plans', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getPlans();
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/products', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getProducts();
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/subscriptions', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getSubscriptions();
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/customer/email/:email', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getCustomerByEmailAddress(req.params.email);
  console.log(resp);
  res.json(resp);
});

routes.post('/stripe/create/subscription', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.createSubscription(req.body.customer, req.body.plan);
  console.log(resp);
  res.json(resp);
});

routes.get('/stripe/customers/charges/:customer', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.getCharges(req.params.customer);
  console.log(resp);
  res.json(resp);
});

routes.post('/stripe/delete/card', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.deleteCard(req.body.customerId, req.body.cardId);
  console.log(resp);
  res.json(resp);
});

routes.post('/stripe/subscription/update-subscription', async (req: CustomRequest, res: Response) => {
  const resp = await stripe.updateSubscription(req.body.subscriptionId, req.body.user, req.body.billingInfo, req.body.address);
  console.log(resp);
  res.json(resp);
});

export default routes;
