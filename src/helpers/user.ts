import { User, Sponsor, Ancestry, UserReference, StripeData } from '../db/models/User';
import * as UserInterfaces from '../interfaces/users';
import { IDocumentSession } from 'ravendb';
import { ICookieSession } from '../utils';
import { reverse, filter, some, cloneDeep, find, uniq } from 'lodash';
import { v1 } from 'uuid';
import { sorGetMemberByEmail } from './sor';
import { DumpBucket } from '../db/models/DumpBucket';
import { updateMailChimpUser } from './mailchimp';
import { Product } from '../db/models/Product';
import * as Utils from '../utils';
import { Lead } from '../db/models/Lead';
import { createToken, createCustomer, getPlan, createSubscription } from './stripe';
import { Funnel } from '../db/models/Funnel';
import { IFunnelStep, ILinks } from '../interfaces/funnel';
import { PaymentAccountEnum } from '../interfaces/product';
import { sendCertificateEmail } from './prospect';
import { IAddProspect } from '../interfaces/prospects';

export async function getUser(
  session: IDocumentSession,
  sessionUser: ICookieSession,
  args: { userId: string }
): Promise<UserInterfaces.IUser> {
  if (process.env.NODE_ENV === 'development') {
    return await session.load<User>(sessionUser ? sessionUser.id : args.userId ? args.userId : '');
  } else {
    return await session.load<User>(sessionUser.id);
  }
}

export function getIdWithoutCollection(id: string): string {
  return id.slice(id.indexOf('/') + 1);
}

export function appendUserIdToAncestors(id: string, ancestors: string): string {
  if (!id) return ancestors;
  if (!ancestors || ancestors === 'undefined') return getIdWithoutCollection(id);
  return `${ancestors},${id.slice(id.indexOf('/') + 1)}`;
}

export function getAncestorsWithCollection(ancestors: string): string {
  let userIds: string[] = [];
  ancestors.split(',').forEach(id => {
    userIds.push(`users/${id}`);
  });
  return userIds.join(',');
}

export function getAncestorsAsArray(ancestors: string): string[] {
  return getAncestorsWithCollection(ancestors).split(',');
}

export function getAncestorLevelsUp(ancestors: string): string[] {
  if (!ancestors) return [];
  const ancestorArray = getAncestorsAsArray(ancestors);
  return reverse(ancestorArray);
}

export function getDepthFromAncestors(ancestors: string): number {
  return ancestors.split(',').length + 1;
}

export function getProductFromUserRoles(userRoles: string[], rolesToLookFor: string[]): string {
  const roleFound = filter(userRoles, role => {
    return some(rolesToLookFor, role);
  });
  return roleFound;
}

export async function registerAndSubscribe(
  session: IDocumentSession,
  args: UserInterfaces.IRegisterAndSubscribeArgs,
  paymentAccountKey: PaymentAccountEnum
) {
  const argsMasked = cloneDeep(args);
  const regex = /\d(?=\d{4})/gm;
  argsMasked.values.card.number = argsMasked.values.card.number.replace(regex, '*');

  const inbound = new DumpBucket(null, 'registerAndSubscribe', {
    location: {
      message: 'Inbound Funnel Order',
      function: 'users.ts > registerAndSubscribe()',
    },
    args: argsMasked,
  });
  await session.store(inbound);
  await session.saveChanges();
  session.advanced.evict(inbound);

  const {
    values: { user, address, product: productId, card, couponCode },
    fid,
    aid,
    step,
    notes,
    luid,
  } = args;

  let customer = await session
    .query<User>({ indexName: 'Users' })
    .whereEquals('email', user.email)
    .firstOrNull();

  if (args.values.interests) {
    updateMailChimpUser(session, args.values.user.email, 'eebfcc06d2', args.values.interests, true);
  }

  try {
    const product = await session.load<Product>(productId);
    session.advanced.evict(product);
    let sponsor: UserInterfaces.IUser;
    let coupon: string = null;

    if (customer && customer.active) {
      // TODO User already exists and is active
      // TODO Do we upgrade them or what is going on?\
      throw new Error('You already have an account.');
    } else if (!customer) {
      if (aid || aid !== '') {
        sponsor = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('uuid', aid)
          .firstOrNull();
        session.advanced.evict(sponsor);
      }

      let username = `${user.firstName.trim()}${user.lastName.trim()}`.replace(/\s/g, '').toLowerCase();
      username = await Utils.getValidUsername(session, username);

      // create the user
      customer = new User(
        null,
        v1(),
        Utils.capitalizeEachFirstLetter(user.firstName),
        Utils.capitalizeEachFirstLetter(user.lastName),
        username,
        user.email.trim().toLowerCase(),
        user.password,
        false,
        [],
        [],
        null,
        true,
        user.phone.trim(),
        [...product.roles],
        [],
        null,
        address
      );
      customer.notes = notes;
      await session.store(customer);
      if (sponsor) {
        customer.sponsor = new Sponsor(sponsor.id, sponsor.email, sponsor.firstName, sponsor.lastName);
        customer.ancestry = new Ancestry(
          sponsor.ancestry.depth + 1,
          sponsor.id,
          appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors)
        );
      } else {
        customer.ancestry = new Ancestry(1);
      }
      await session.saveChanges();
    } else {
      customer.address = address;
      customer.phone = user.phone.trim();
      customer.roles = uniq(customer.roles ? customer.roles.concat(product.roles) : [...product.roles]);
      await session.saveChanges();
    }

    console.log('before', couponCode, paymentAccountKey);
    try {
      console.log('entered', couponCode, paymentAccountKey);
      const tviCouponCodes = ['TVIPRO12', 'TVIPRO6', 'TVIPRO3'];
      const tvCouponCodes = ['50off', '20off'];

      if (couponCode) {
        if (paymentAccountKey === PaymentAccountEnum.TripValetLLC) {
          console.log('paymentAccountKey === PaymentAccountEnum.TripValetLLC');
          if (couponCode.toLowerCase() === '20off' || couponCode.toLowerCase() === '50off') {
            coupon = couponCode.toLowerCase();
          }
        } else if( paymentAccountKey === PaymentAccountEnum.TripValetIncentives) {
          console.log('paymentAccountKey === PaymentAccountEnum.TripValetIncentives');
          if (couponCode.toUpperCase() === 'TVIPRO12' || couponCode.toUpperCase() === 'TVIPRO6'  || couponCode.toUpperCase() === 'TVIPRO3') {
            coupon = couponCode.toUpperCase();
          }
        }
      }
    } catch (ex) {
      await session.store(
        await Utils.createAndSendException(null, null, new Error(ex.message).stack, {
          errorMessage: ex.message,
          user,
          argsMasked,
        })
      );
    }
    console.log('coupon', coupon);

    let lead = await session
      .query<Lead>({ indexName: 'Leads' })
      .whereEquals('uuid', luid)
      .firstOrNull();

    if (lead) {
      lead.user = new UserReference(customer.id, customer.email, customer.firstName, customer.lastName);
    }
    let stripeToken = await createToken(card, customer.address, customer, paymentAccountKey);
    if (!stripeToken.success) {
      customer.active = false;
      customer.updatedAt = Utils.getNowUtc();
      await session.store(await Utils.sendException(stripeToken.exception));
      await session.saveChanges();
      throw new Error(stripeToken.exception.errorMessage);
    }
    let stripeCustomer = await createCustomer(
      customer.email,
      customer.firstName,
      customer.lastName,
      customer.phone,
      product.amount,
      stripeToken.payload.id,
      paymentAccountKey
    );
    if (!stripeCustomer.success) {
      customer.active = false;
      customer.updatedAt = Utils.getNowUtc();
      await session.store(await Utils.sendException(stripeCustomer.exception));
      await session.saveChanges();
      throw new Error(stripeCustomer.exception.errorMessage);
    } else if (stripeCustomer.success && stripeCustomer.exception) {
      await Utils.sendException(stripeCustomer.exception, true);
    }

    // if (product.setup.fee > 0) {
    //   let stripeCharge = await createCharge(stripeCustomer.payload, new SaleInfo(customer.email, customer.firstName, customer.lastName, card.number, card.month, card.year, card.cvc, product.setup.fee * 100, customer.uuid), stripeToken.payload.card.id, product.setup.description);
    //   if (!stripeCharge.success) {
    //     customer.active = false;
    //     customer.updatedAt = Utils.getNowUtc();
    //     await session.store(await Utils.sendException(stripeCharge.exception));
    //     await session.saveChanges();
    //     throw new Error(stripeCharge.exception.errorMessage);
    //   }
    // }

    const stripePlan = await getPlan(product.plan.id, paymentAccountKey);
    if (!stripePlan.success) {
      await session.store(await Utils.sendException(stripePlan.exception));
      await session.saveChanges();
      throw new Error(stripePlan.exception.errorMessage);
    }

    let createSubscriptionResult = await createSubscription(
      stripeCustomer.payload.id,
      stripePlan.payload,
      paymentAccountKey,
      args.values.referralCode,
      coupon,
      { userId: customer.id, productId: product.id});
    if (!createSubscriptionResult.success) {
      await session.store(await Utils.sendException(createSubscriptionResult.exception));
      await session.saveChanges();
      throw new Error(createSubscriptionResult.exception.errorMessage);
    }

    customer.active = true;
    customer.updatedAt = Utils.getNowUtc();
    customer.stripe = new StripeData(
      stripeCustomer.payload.id,
      createSubscriptionResult.payload.id,
      product.product.id,
      stripePlan.payload.id,
      stripeToken.payload.id
    );
    //, new UserStripeSubscription(, new StripeCustomerReference(stripeCustomer.payload.id, stripeCustomer.payload.email), new StripePlanSummary(stripePlan.payload.amount, stripePlan.payload.id, product.product.id, stripePlan.payload.interval, stripePlan.payload.interval_count, stripePlan.payload.nickname), new StripeProductReference(product.product.id, product.product.name));
    //  {
    //   "subscriptionId": createSubscriptionResult.payload.id,
    //   "start": "2018-07-20T03:46:10.0000000Z",
    //   "currentPeriodStart": "2018-10-20T03:46:10.0000000Z",
    //   "currentPeriodEnd": "2018-11-20T03:46:10.0000000Z",
    //   "customer": {
    //       "id": "cus_DGMH8KTroDlquG",
    //       "email": "pyattandassociates@gmail.com"
    //   },
    //   "plan": {
    //       "id": "plan_DCob1bM2Ue8qMH",
    //       "nickname": "TVI - PRO",
    //       "interval": "month",
    //       "intervalCount": 1,
    //       "amount": 9700,
    //       "product": "prod_DCobDzIDQdBlVI"
    //   },
    //   "product": {
    //       "id": "prod_DCobDzIDQdBlVI",
    //       "name": "TVI - PRO"
    //   }
    // });
    await session.saveChanges();

    // send emails
    await Utils.sendTripValetWelcome(customer, user.password, session);
    if (
      some(product.roles, (role: string) => {
        return role.startsWith('TVI');
      })
    ) {
      await Utils.sendTripValetIncentivesWelcome(customer, user.password, session);
    }

    if (args.values.certificate) {
      const sendEmailReference: IAddProspect = {
        certificateId: args.values.certificate,
        deliveryEndpoint: args.values.user.email,
        email: args.values.user.email,
        firstName: args.values.user.firstName,
        lastName: args.values.user.lastName,
        personalizedMessage: null,
        phone: args.values.user.phone,
      };
      await sendCertificateEmail(session, sendEmailReference, aid);
    }

    const funnel = await session.load<Funnel>(fid);
    const funnelStep = find(funnel.funnelSteps, (funnelStep: IFunnelStep) => {
      return funnelStep.stepOrder === step;
    });

    return { success: true, nextFunnelStepUrl: funnelStep.nextFunnelStepUrl };
  } catch (ex) {
    const argsMasked = args;
    const regex = /\d(?=\d{4})/gm;
    argsMasked.values.card.number = argsMasked.values.card.number.replace(regex, '*');
    await session.store(
      await Utils.createAndSendException(null, null, new Error(ex.message).stack, { errorMessage: ex.message, user, argsMasked })
    );
    await session.saveChanges();
    throw ex;
  }
}

export async function generateAffiliateLinks(userId: string, session: IDocumentSession): Promise<Array<ILinks>> {
  try {
    let result = [];
    const funnels = await session
      .query<Funnel>({ indexName: 'Funnels' })
      .whereEquals('hidden', false)
      .orderBy('createdAt')
      .all();
    const user = await session.load<User>(userId);

    funnels.map(funnel => {
      for (let step of funnel.funnelSteps) {
        if (step.url[0] === '/') {
          result.push({
            url: `https://${user.username.toLowerCase()}.${funnel.domain.tld.toLowerCase()}${step.url.toLowerCase()}`,
            title: funnel.title,
          });
        } else {
          result.push({
            url: `https://${user.username.toLowerCase()}.${funnel.domain.tld.toLowerCase()}/${step.url.toLowerCase()}`,
            title: funnel.title,
          });
        }
        break;
      }
    });
    return result;
  } catch (ex) {
    console.log(ex);
  }
}
