import * as Stripe from 'stripe';
import { find, uniq } from 'lodash';
import { Exception } from '../db/models/Exception';
import {
  ISaleInfo,
  IStripeChargeCustomerResult,
  StripeCustomerReference,
  StripeChargeReference,
  StripeSourceReference,
  StripeSubscriptionReference,
  StripePlanReference,
  StripeProductReference,
  StripeCustomerInvoiceReference,
  ICreateSubscriptionResult,
  ICreateCustomerResult,
  ICreateSourceResult,
  IRetrievePlanResult,
  IRetrieveCustomerResult,
  IGetPlansListResults,
  IRetrieveProductResult,
  IGetProductsListResult,
  ICreateTokenResult,
  ISetDefaultSourceResult,
  ICreateChargeResult,
} from '../interfaces/stripe';
import * as vars from '../../env/vars';
import { IDocumentSession } from 'ravendb';
import { Product, ProductReference } from '../db/models/Product';
import { User, UserReference, UserStripeSubscription, Address } from '../db/models/User';
import { Order, OrderReference } from '../db/models/Order';
import { getAncestorLevelsUp } from './user';
import { ITierLevel, IProduct } from '../interfaces/product';
import { Commission, CommissionRevenueShare } from '../db/models/Commission';
import { EscapeBuck } from '../db/models/EscapeBuck';
import moment = require('moment');
import { IOrder } from '../interfaces/order';
import { UserSubscription } from '../db/models/UserSubscription';
import { DateTime, Duration } from 'luxon';
import { getNowUtc, createAndSendException, sendException, sendExceptionViaEmail, getValidUsername } from '../utils';
import { RevenueShare } from '../db/models/RevenueShare';
import { IUser, IUserReference, IAddress, ICreditCard } from '../interfaces/users';
import { StripeWebhook } from '../db/models/Stripe';
import { IApiMessageResponse } from '../interfaces/common';
import { sorDeactivateMember, sorGetApiCredentials, sorActivateMember } from './sor';
import { DumpBucket } from '../db/models/DumpBucket';
import Roles from './../roles';
import { PaymentAccountEnum } from '../interfaces/product';
import { customers } from 'stripe';
import { v4 } from 'uuid';
import { generate } from 'shortid';

export async function getInvoice(
  invoiceId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.invoices.IInvoice> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.invoices.retrieve(invoiceId);
}

export async function getEvents(
  eventId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.events.IEvent> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.events.retrieve(eventId);
}

export async function getCharge(
  chargeId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.charges.ICharge> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.charges.retrieve(chargeId);
}
export async function getSubscription(
  subscriptionId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.subscriptions.ISubscription> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.subscriptions.retrieve(subscriptionId);
}
export async function createSubscription(
  customerId: string,
  plan: Stripe.plans.IPlan,
  paymentAccountKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
  referralCode: string = null,
  couponCode: string = null,
  additionalMetadata: { [key: string]: string | number } = null,
): Promise<ICreateSubscriptionResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentAccountKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    const customer = await getCustomer(customerId, paymentAccountKey);
    if (customer.success) {
      if (customer.payload.subscriptions.total_count > 0) {
        const existingSubscription = find(customer.payload.subscriptions.data, (sub: Stripe.subscriptions.ISubscription) => {
          console.log('existingSubscription', sub);
          return sub.plan.id === plan.id;
        });
        if (existingSubscription) {
          return { success: true, payload: existingSubscription };
        }
      }
    }

    let payload: Stripe.subscriptions.ISubscriptionCreationOptions = {
      customer: customerId,
      trial_period_days: plan.trial_period_days || 0,
      items: [
        {
          plan: plan.id,
        },
      ],
      metadata: { paymentAccountKey },
    };

    if (referralCode) {
      payload.metadata = { ...payload.metadata, referralCode };
    }

    if (couponCode) {
      payload.metadata = { ...payload.metadata, couponCode };
      payload.coupon = couponCode;
    }

    if (additionalMetadata) {
      payload.metadata = { ...payload.metadata, ...additionalMetadata };
    }

    return {
      success: true,
      payload: await stripe.subscriptions.create(payload),
    };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Create Stripe Subscription',
          function: 'stripe.ts > createSubscription > stripe.subscriptions.create',
        },
        success: false,
        error: ex.message,
        function: 'createSubscription()',
        paymentAccountKey,
      }),
    };
  }
}
export async function createUserAndSubscription(
  user: IUser,
  product: IProduct,
  saleInfo: ICreditCard,
  token: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<IApiMessageResponse> {
  try {
    const customer = await createCustomer(user.email, user.firstName, user.lastName, user.phone, product.amount, token, paymentKey);
    if (!customer) return { success: false, message: 'No User Found/Created' };
    const plan = await getPlan(product.plan.id, paymentKey);
    let subscription: ICreateSubscriptionResult;
    // let card: Stripe.cards.ICard;
    // if (customer.sources.data.length === 0) {
    //   card = await createCardSource(customer, saleInfo, paymentKey);
    // }

    subscription = await createSubscription(customer.payload.id, plan.payload, paymentKey);
    if (!subscription) return { success: false, message: 'No Subscription Created' };

    subscription = await updateSubscription(subscription.payload.id, user, saleInfo, user.address, paymentKey);
    if (subscription) return { success: true, message: 'Subscription Created' };
    else return { success: false, message: 'Failed to Create Subscription' };
  } catch (e) {
    console.error(e);
    return { success: false, message: e };
  }
}
export async function getCharges(
  customer: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.charges.ICharge> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  const res = await stripe.charges.list({
    customer,
  });
  return res.data[0];
}
export async function createSubscriptionItem(
  subscriptionId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.subscriptions.ISubscription> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.subscriptions.retrieve(subscriptionId);
}
export async function getSubscriptions(
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.IList<Stripe.subscriptions.ISubscription>> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.subscriptions.list();
}
export async function cancelSubscription(
  subscriptionId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.subscriptions.ISubscription> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.subscriptions.del(subscriptionId, { at_period_end: true });
}

export async function getCustomers(
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
  limit: number = 100,
): Promise<Stripe.customers.ICustomer[]> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');

  let customers: Stripe.IList<Stripe.customers.ICustomer> = await stripe.customers.list({ limit });
  let response: Stripe.customers.ICustomer[] = [];
  response = customers.data;

  if (customers.has_more) {
    response = response.concat(await paginateCustomers(paymentKey, customers.data[customers.data.length - 1].id, limit, response));
  }
  return response;
}

export async function paginateCustomers(
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
  startingAt: string,
  limit: number,
  response: Stripe.customers.ICustomer[],
): Promise<Stripe.customers.ICustomer[]> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  let customers: Stripe.IList<Stripe.customers.ICustomer> = await stripe.customers.list({ limit, starting_after: startingAt });

  if (customers.has_more) {
    return response.concat(await paginateCustomers(paymentKey, customers.data[customers.data.length - 1].id, limit, response));
  }
  return customers.data;
}

export async function getCustomer(
  customerId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<IRetrieveCustomerResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    const customer = await stripe.customers.retrieve(customerId);
    return { success: true, payload: customer };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Retrieve Stripe Customer',
          function: 'stripe.ts > getCustomer > stripe.customers.retrieve',
        },
        success: false,
        error: ex.message,
        customerId,
        paymentKey,
      }),
    };
  }
}

export async function createCharge(
  customer: Stripe.customers.ICustomer,
  saleInfo: ISaleInfo,
  cardId: string,
  description: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ICreateChargeResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    const charge = await stripe.charges.create({
      amount: saleInfo.chargeAmount,
      currency: 'usd',
      source: cardId,
      customer: customer.id,
      receipt_email: customer.email,
      description: `TripValet: ${description}`,
    });
    return {
      success: true,
      payload: charge,
    };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Create Stripe Charge',
          function: 'stripe.ts > createCharge > stripe.charges.create',
        },
        success: false,
        error: ex.message,
        customer,
        saleInfo,
        token: cardId,
        paymentKey,
      }),
    };
  }
}
export async function getCustomerByEmailAddress(
  email: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.customers.ICustomer> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  const customer = await stripe.customers.list({ email });
  return customer.total_count > 0 ? customer.data[0] : null;
}
export async function getPlan(
  planId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<IRetrievePlanResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    return { success: true, payload: await stripe.plans.retrieve(planId) };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Retrieve Stripe Plan',
          function: 'stripe.ts > getPlan > stripe.plans.retrieve',
        },
        success: false,
        error: ex.message,
        planId,
        paymentKey,
      }),
    };
  }
}
export async function getPlans(paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC): Promise<IGetPlansListResults> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return {
    success: true,
    payload: await stripe.plans.list({ limit: 100 }),
  };
}
export async function getProduct(
  productId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<IRetrieveProductResult> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return {
    success: true,
    payload: await stripe.products.retrieve(productId),
  };
}
export async function getProducts(paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC): Promise<IGetProductsListResult> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return {
    success: true,
    payload: await stripe.products.list(),
  };
}
export async function getCustomerByEmail(
  email: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.customers.ICustomer[]> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  const list = await stripe.customers.list({ email }); // the @types/stripe if not correct here > { email });
  return list.data;
}
export async function getToken(
  tokenId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.tokens.IToken> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  const token = await stripe.tokens.retrieve(tokenId);
  return token;
}
export async function createToken(
  billingInfo: ICreditCard,
  address: IAddress,
  user: IUser,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ICreateTokenResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    const token = await stripe.tokens.create({
      card: {
        object: 'card',
        number: billingInfo.number,
        exp_month: +billingInfo.month,
        exp_year: +billingInfo.year,
        cvc: billingInfo.cvc,
        name: `${user.firstName} ${user.lastName}`,
        address_city: address.city,
        address_line1: address.address,
        address_line2: '',
        address_state: address.state,
        address_zip: address.zip,
      },
    });
    return {
      success: true,
      payload: token,
    };
  } catch (ex) {
    const billingInfoMasked = billingInfo;
    const regex = /\d(?=\d{4})/gm;
    billingInfoMasked.number = billingInfoMasked.number.replace(regex, '*');

    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Create Stripe Token',
          function: 'stripe.ts > createToken > stripe.tokens.create',
        },
        success: false,
        error: ex.message,
        billingInfoMasked,
        address,
        user,
        paymentKey,
      }),
    };
  }
}

export async function deleteCard(
  customerId: string,
  cardId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.IDeleteConfirmation> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.customers.deleteCard(customerId, cardId);
}
export async function updateSubscription(
  subscriptionId: string,
  user: IUser,
  billingInfo: ICreditCard,
  address: IAddress,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ICreateSubscriptionResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    return {
      success: true,
      payload: await stripe.subscriptions.update(subscriptionId, {
        source: {
          object: 'card',
          exp_month: +billingInfo.month,
          exp_year: +billingInfo.year,
          number: billingInfo.number,
          cvc: billingInfo.cvc,
          name: `${user.firstName} ${user.lastName}`,
          address_city: address.city,
          address_line1: address.address,
          address_line2: '',
          address_state: address.state,
          address_zip: address.zip,
        },
      }),
    };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Update Stripe Subscription',
          function: 'stripe.ts > updateSubscription > stripe.subscriptions.update',
        },
        success: false,
        error: ex.message,
        subscriptionId,
        user,
        billingInfo,
        address,
        paymentKey,
      }),
    };
  }
}
export async function createCardSource(
  customer: Stripe.customers.ICustomer,
  saleInfo: ISaleInfo,
  address: IAddress,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ICreateSourceResult> {
  let source: any;
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    source = {
      object: 'card',
      exp_month: +saleInfo.ccExpMonth,
      exp_year: +saleInfo.ccExpYear,
      number: saleInfo.card,
      cvc: saleInfo.cvc,
      name: `${saleInfo.firstNameOnCard} ${saleInfo.lastNameOnCard}`,
      // currency: 'usd', // NOTE: MISSING in Stripe Type D.TS
    };

    if (address) {
      source['address_city'] = address.city;
      source['address_line1'] = address.address;
      source['address_line2'] = '';
      source['address_state'] = address.state;
      source['address_zip'] = address.zip;
    }

    return {
      success: true,
      payload: await stripe.customers.createSource(customer.id, {
        source,
      }),
    };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Create Stripe Customer Source (Card)',
          function: 'stripe.ts > createCardSource > stripe.customers.createSource',
        },
        success: false,
        error: ex.message,
        source,
        customer,
        saleInfo,
        address,
        paymentKey,
      }),
    };
  }
}

export async function setDefaultSource(
  customer: Stripe.customers.ICustomer,
  cardId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ISetDefaultSourceResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    let card: Stripe.cards.ICard = find(customer.sources.data, {
      id: cardId,
    });

    const result = await stripe.customers.update(customer.id, {
      default_source: card.id,
    });

    return {
      success: true,
      payload: result,
    };
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        location: {
          message: 'Failed to Update Stripe Customer Default Source (Card)',
          function: 'stripe.ts > setDefaultSource > stripe.customers.update',
        },
        success: false,
        error: ex.message,
        customer,
        cardId,
        paymentKey,
      }),
    };
  }
}

export async function createCustomer(
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
  amount: number,
  token: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ICreateCustomerResult> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  let customer: Stripe.customers.ICustomer;
  const customerList = await stripe.customers.list({ email: email });
  if (customerList.data && customerList.data.length > 0) {
    customer = customerList.data[0];
    try {
      await stripe.customers.update(customer.id, {
        source: token,
      });
    } catch (ex) {
      return {
        success: true,
        payload: customer,
        exception: new Exception(null, null, new Error(ex.message).stack, ex.message, {
          location: {
            message: 'Failed to Create Stripe Customer',
            function: 'stripe.ts > createCustomer > stripe.customers.update',
          },
          success: false,
          error: ex.message,
          email,
          firstName,
          lastName,
          token,
          paymentKey,
        }),
      };
    }

    return { success: true, payload: customer };
  } else {
    try {
      customer = await stripe.customers.create({
        email: email,
        description: `${firstName} ${lastName}`,
        source: token,
        metadata: {
          firstName,
          lastName,
          phone,
          amount: amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
        },
      });
      return { success: true, payload: customer };
    } catch (ex) {
      return {
        success: false,
        exception: new Exception(null, null, new Error().stack, ex.message, {
          location: {
            message: 'Failed to Create Stripe Customer',
            function: 'stripe.ts > createCustomer > stripe.customers.create',
          },
          success: false,
          error: ex.message,
          email,
          firstName,
          lastName,
          paymentKey,
        }),
      };
    }
  }
}
export async function chargeCustomer(
  saleInfo: ISaleInfo,
  address: IAddress,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<IStripeChargeCustomerResult> {
  try {
    const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
    let customer: Stripe.customers.ICustomer;
    let cardSourceId: string = '';
    // first lookup customer and create if not existing by email
    const customerList = await stripe.customers.list({ email: saleInfo.email });
    if (customerList.data && customerList.data.length > 0) {
      customer = customerList.data[0];
    } else {
      try {
        // Create customer
        const { email, firstNameOnCard, lastNameOnCard } = saleInfo;
        customer = await stripe.customers.create({
          email: email,
          description: `Escape Trip Customer: ${firstNameOnCard} ${lastNameOnCard}`,
        });
      } catch (ex) {
        return {
          success: false,
          exception: new Exception(null, null, new Error().stack, ex.message, {
            location: {
              message: 'Failed to Create Stripe Customer',
              function: 'stripe.ts > chargeCustomer > stripe.customers.create',
            },
            success: false,
            saleInfo,
            paymentKey,
          }),
        };
      }
    }
    // console.log('customer', customer);
    // if customer found, check to see if they have a CC source that matches the card number's last 4 and exp_year and exp_year
    try {
      if (customer.sources && customer.sources.data && customer.sources.data.length > 0) {
        let { data } = customer.sources;
        // console.log('sources', data, {
        //   last4: saleInfo.card.slice(-4),
        //   exp_month: +saleInfo.ccExpMonth,
        //   exp_year: +saleInfo.ccExpYear,
        // });
        let card: Stripe.cards.ICard = find(data, {
          last4: saleInfo.card.slice(-4),
          exp_month: +saleInfo.ccExpMonth,
          exp_year: +saleInfo.ccExpYear,
        });
        if (card) {
          cardSourceId = card.id;
        } else {
          cardSourceId = (await createCardSource(customer, saleInfo, address, paymentKey)).payload.id;
        }
      } else {
        cardSourceId = (await createCardSource(customer, saleInfo, address, paymentKey)).payload.id;
      }
    } catch (ex) {
      // console.log('ex', ex);
      return {
        success: false,
        exception: new Exception(null, null, new Error().stack, ex.message, {
          success: false,
          error: ex.message,
          function: 'chargeCustomer()',
          paymentKey,
        }),
      };
    }
    try {
      const charge = await stripe.charges.create({
        amount: saleInfo.chargeAmount,
        currency: 'usd',
        source: cardSourceId,
        customer: customer.id,
        description: `TripValet # ${saleInfo.uuid}`,
      });
      return {
        success: true,
        payload: {
          success: charge.paid ? true : false,
          customerId: customer.id,
          sourceId: cardSourceId,
          chargeInfo: charge,
        },
      };
    } catch (ex) {
      return {
        success: false,
        exception: new Exception(null, null, new Error().stack, ex.message, {
          success: false,
          error: ex.message,
          function: 'chargeCustomer()',
          paymentKey,
        }),
      };
    }
  } catch (ex) {
    return {
      success: false,
      exception: new Exception(null, null, new Error().stack, ex.message, {
        success: false,
        error: ex.message,
        function: 'chargeCustomer()',
        paymentKey,
      }),
    };
  }
}

export async function processInvoiceUpdated(
  session: IDocumentSession,
  event: Stripe.events.IEvent,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<IOrder> {
  const invoice = <Stripe.invoices.IInvoice>event.data.object;
  try {
    if (invoice.paid && invoice.amount_paid > 0 && invoice.amount_remaining === 0) {
      let stripeProducts: Stripe.products.IProduct[] = [];
      for (let product of invoice.lines.data) {
        stripeProducts.push((await getProduct(product.plan.product.toString(), paymentKey)).payload);
      }
      // const stripeProduct = await getProduct(invoice.lines.data[0].plan.product, paymentKey);

      try {
        const product = await session
          .query<IProduct>({ collection: 'Products' })
          .whereEquals('product.id', stripeProducts[0].id)
          .firstOrNull();
        paymentKey = product ? product.paymentAccount : PaymentAccountEnum.TripValetLLC;
      } catch (ex) {
        await session.store(
          await createAndSendException(invoice.id, new Error(ex.message).stack, ex.message, {
            function: 'processInvoiceUpdated()',
            event,
            stripeProducts,
          }),
        );
        await session.saveChanges();
      }

      let customerId = '';
      if (typeof invoice.customer === 'string') {
        customerId = invoice.customer;
      } else customerId = (<Stripe.customers.ICustomer>invoice.customer).id;

      const stripeCustomer = await getCustomer(customerId, paymentKey);
      const stripeSubscription = await getSubscription(invoice.subscription.toString(), paymentKey);
      const stripeCharge = await getCharge(invoice.charge.toString(), paymentKey);

      const products = await session
        .query<Product>({ collection: 'Products' })
        .whereIn('name', stripeProducts.map(p => p.name))
        .all();

      const customer = await session
        .query<User>({ collection: 'Users' })
        .whereEquals('email', stripeCustomer.payload.email)
        .firstOrNull();

      if (customer && customer.sponsor) {
        const affiliate = await session.load<User>(customer.sponsor.id);

        // Add Product Roles to user for which they bought.
        products.forEach(product => {
          if (product.roles && product.roles.length) {
            customer.roles = uniq(customer.roles.concat(product.roles));
          }
        });

        // We need to add to the SOR Account if they have a TV Role and sendWelcome Email
        let order: IOrder = null;

        const exists = await session
          .query<Order>({ collection: 'Orders' })
          .whereEquals('invoice.invoiceId', invoice.id)
          .any();

        if (!exists) {
          const customerReference = new UserReference(customer.id, customer.email, customer.firstName, customer.lastName);
          const affiliateReference = new UserReference(affiliate.id, affiliate.email, affiliate.firstName, affiliate.lastName);
          const chargeReference = new StripeChargeReference(
            stripeCharge.id,
            stripeCharge.amount,
            moment.unix(stripeCharge.created).toDate(),
            new StripeCustomerReference(stripeCustomer.payload.id, stripeCustomer.payload.email),
            stripeCharge.description,
            stripeCharge.paid,
            new StripeSourceReference(
              stripeCharge.source.id,
              (<Stripe.cards.ICard>stripeCharge.source).brand,
              (<Stripe.cards.ICard>stripeCharge.source).country,
              (<Stripe.cards.ICard>stripeCharge.source).last4,
              (<Stripe.cards.ICard>stripeCharge.source).exp_month,
              (<Stripe.cards.ICard>stripeCharge.source).exp_year,
            ),
            stripeCharge.status,
          );
          const userSubscription = await session.load<UserSubscription>(`${customer.id}/subscriptions/${stripeSubscription.id}`);
          const subscriptionReference = new StripeSubscriptionReference(
            stripeSubscription.id,
            moment.unix(stripeSubscription.current_period_start).toDate(),
            moment.unix(stripeSubscription.current_period_end).toDate(),
            new StripePlanReference(
              stripeSubscription.plan.id,
              stripeSubscription.plan.nickname,
              stripeSubscription.plan.interval,
              stripeSubscription.plan.interval_count,
              stripeSubscription.plan.amount,
              stripeSubscription.plan.product.toString(),
            ),
            userSubscription ? userSubscription.id : null,
          );
          const customerInvoiceReference = new StripeCustomerInvoiceReference(
            event.id,
            stripeCustomer.payload.id,
            typeof invoice.charge === 'string' ? invoice.charge : invoice.charge.id,
            invoice.id,
            subscriptionReference,
          );
          const productReferences = products.map(p => {
            return new ProductReference(p.id, p.name, p.displayName, p.amount, p.plan.interval, p.setup);
          });
          const totalOrderAmount = products.map(p => p.amount).reduce((accumulator, currentValue) => accumulator + currentValue);

          order = new Order(
            null,
            null,
            productReferences,
            totalOrderAmount,
            customerReference,
            affiliateReference,
            products[0].domain,
            chargeReference,
            customerInvoiceReference,
            [],
          );
          if (customer.roles.indexOf('CoinMD Member') > -1) {
            order.isRevenueShare = true;
          }
          await session.store(order);
          const orderReference = new OrderReference(order.id, order.products, order.totalAmount);

          if (customer.roles.some(role => role === Roles.TVIPro)) {
            try {
              const escapeBucks = new EscapeBuck(customerReference, orderReference, order.totalAmount * 0.05);

              await session.store(escapeBucks);
              await session.saveChanges();
            } catch (ex) {
              const dumpBucket = new DumpBucket(null, 'EscapeBucks Exception', {
                function: 'processInvoiceUpdated Trying to add EscapeBuck',
                exception: ex.message,
              });
              await session.store(dumpBucket);
              await session.saveChanges();
            }
          }
          // Store Webhook with the Order
          let webHook = new StripeWebhook(invoice.id, event.type, event, orderReference, customerReference, affiliateReference);
          await session.store(webHook);
          await session.saveChanges();

          const ancestors = getAncestorLevelsUp(customer.ancestry.ancestors);
          const ancestorUsers = await session.load<User>(ancestors);
          let levelUp = 1;
          let isAncestryBroken: boolean = false;
          for (let ancestor of ancestors) {
            if (levelUp === 3 || (isAncestryBroken && levelUp === 2)) {
              break;
            }

            const ancestorUser: IUser = ancestorUsers[ancestor];
            if (ancestorUser.active) {
              // Check depth to not pay Laura at the top since Tom gets 10% across the board
              for (let product of products) {
                let commissionAffiliateUser: IUserReference;
                let productTier: ITierLevel = find<ITierLevel>(product.tierPayouts, { level: levelUp });
                if (productTier) {
                  commissionAffiliateUser = new UserReference(
                    ancestorUser.id,
                    ancestorUser.email,
                    ancestorUser.firstName,
                    ancestorUser.lastName,
                  );
                  console.log();
                  const commission = new Commission(
                    DateTime.fromJSDate(getNextDayOfWeek(moment.unix(event.created).toDate(), 5)).toJSDate(), // Friday Day Of Week
                    Number((product.amount * (productTier.value / 100)).toFixed(2)),
                    'Pending',
                    customerReference,
                    commissionAffiliateUser,
                    customerInvoiceReference,
                    orderReference,
                    productTier,
                    new CommissionRevenueShare(false, null),
                  );
                  commission.createdAt = DateTime.fromMillis(invoice.date * 1000).toJSDate(); // Friday Day Of Week
                  commission.updatedAt = moment().toDate();
                  await session.store(commission);
                }

                // NOTE: Removed this as Laura does not get compression since Tom gets 10%
                // if (ancestorUser.ancestry.depth === 1 && levelUp === 1) {
                //   productTier = find<ITierLevel>(product.tierPayouts, { level: 2 });
                //   if (productTier) {
                //     const commission = new Commission(
                //       DateTime.fromJSDate(getNextDayOfWeek(moment().toDate(), 5)).toJSDate(), // Friday Day Of Week
                //       Number((product.amount * (productTier.value / 100)).toFixed(2)),
                //       'Pending',
                //       customerReference,
                //       commissionAffiliateUser,
                //       customerInvoiceReference,
                //       new OrderReference(order.id, order.products, order.totalAmount),
                //       productTier,
                //       new CommissionRevenueShare(false, null)
                //     );
                //     commission.createdAt = DateTime.fromMillis(invoice.date * 1000).toJSDate(); // Friday Day Of Week
                //     commission.updatedAt = moment().toDate();
                //     await session.store(commission);
                //   }
                // }
              }
              levelUp++;
            } else {
              // Now that ancestry is broken, we need to check to make sure we don't pay
              // pay out the second tier if we paid out the first tier.
              isAncestryBroken = true;
              if (ancestorUser.ancestry.depth === 1) levelUp = 3;
            }
          }

          if (order.isRevenueShare) {
            const revenueShares = await session
              .query<RevenueShare>({ collection: 'RevenueShares' })
              .whereEquals('userRole', 'CoinMD Member')
              .all();

            for (let share of revenueShares) {
              for (let product of products) {
                const commissionAmount = Number((product.amount * (share.commissionAmount / 100)).toFixed(2));
                const revenueCommission = new Commission(
                  DateTime.fromJSDate(getNextDayOfWeek(moment.unix(event.created).toDate(), 5)).toJSDate(), // Friday Day Of Week
                  commissionAmount,
                  'Pending',
                  customerReference,
                  share.user,
                  customerInvoiceReference,
                  orderReference,
                  null,
                  new CommissionRevenueShare(true, share.id),
                );
                revenueCommission.createdAt = DateTime.fromMillis(invoice.date * 1000).toJSDate(); // Friday Day Of Week
                revenueCommission.updatedAt = moment().toDate();
                await session.store(revenueCommission);
              }
            }
          }
        }
        await session.saveChanges();

        return order;
      }
      return null;
    }
    return null;
  } catch (ex) {
    await session.store(
      await createAndSendException(invoice.id, new Error(ex.message).stack, ex.message, { function: 'processInvoiceUpdated()', event }),
    );
    await session.saveChanges();
    return null;
  }
}

export function getNextDayOfWeek(date, dayOfWeek, daysToAdd = 7) {
  var resultDate = moment(date)
    .startOf('day')
    .add(daysToAdd, 'd')
    .toDate();
  resultDate.setDate(resultDate.getDate() + ((daysToAdd + dayOfWeek - date.getDay()) % 7));
  return resultDate;
}

export async function processInvoiceCreated(session: IDocumentSession, invoice: Stripe.invoices.IInvoice): Promise<any> {
  try {
    // Do something?
  } catch (ex) {
    await session.store(
      await createAndSendException(invoice.id, new Error(ex.message).stack, ex.message, { function: 'processInvoiceCreated()', invoice }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processCustomerCreated(session: IDocumentSession, invoice: Stripe.customers.ICustomer): Promise<any> {
  try {
    // We should create the customer at this point once the zap if not used?
  } catch (ex) {
    await session.store(
      await createAndSendException(invoice.id, new Error(ex.message).stack, ex.message, { function: 'processCustomeCreated()', invoice }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processCustomerSubscriptionCreated(
  session: IDocumentSession,
  event: Stripe.events.IEvent,
  paymentAccountKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<any> {
  try {
    const subscription: Stripe.subscriptions.ISubscription = <Stripe.subscriptions.ISubscription>event.data.object;

    const dumpBucket = new DumpBucket(null, `[TRACE]: ${event.type}`, {
      function: 'processCustomerSubscriptionCreated > Line 1050',
      paymentAccountKey,
      subscriptionPlanProduct: subscription.plan.product,
      subscription,
      event,
    });
    await session.store(dumpBucket);
    await session.saveChanges();

    try {
      const product = await session
        .query<IProduct>({ indexName: 'Products' })
        .whereEquals('productId', subscription.plan.product as string)
        .firstOrNull();
      // paymentAccountKey = product ? product.paymentAccount : PaymentAccountEnum.TripValetLLC;
    } catch (ex) {
      await session.store(
        await createAndSendException(event.id, new Error(ex.message).stack, ex.message, {
          function: 'processCustomerSubscriptionCreated()',
          event,
          subscription,
        }),
      );
      await session.saveChanges();
    }

    const stripeProduct = await getProduct(<string>subscription.plan.product, paymentAccountKey);
    const stripeCustomer = await getCustomer(<string>subscription.customer, paymentAccountKey);
    const stripePlan = await getPlan(subscription.plan.id, paymentAccountKey);
    try {
      let user = await session
        .query<User>({ collection: 'Users' })
        .whereEquals('email', stripeCustomer.payload.email)
        .firstOrNull();

      if (!user) {
        const product = await session
          .query<Product>({ indexName: 'Products' })
          .whereEquals('productId', stripeProduct.payload.id)
          .firstOrNull();

        const source: Stripe.cards.ICard =
          stripeCustomer.payload.sources.total_count >= 1 ? (stripeCustomer.payload.sources.data[0] as Stripe.cards.ICard) : null;

        // "address_city": "Cumming",
        // "address_country": "United States of America",
        // "address_line1": "4365 Ambassador Way",
        // "address_line1_check": "pass",
        // "address_line2": null,
        // "address_state": "GA",
        // "address_zip": "30040",
        // "address_zip_check": "pass",
        // "brand": "Visa",
        // "country": "US",

        const address = source
          ? new Address(source.address_line1, source.address_city, source.address_state, source.address_zip, source.address_country)
          : new Address('', '', '', '', '');

        user = new User(
          null,
          v4(),
          stripeCustomer.payload.metadata.first_Name,
          stripeCustomer.payload.metadata.last_name,
          await getValidUsername(session, `${stripeCustomer.payload.metadata.first_name}${stripeCustomer.payload.metadata.last_name}`),
          stripeCustomer.payload.email,
          generate(),
          false,
          [],
          [],
          null,
          null,
          stripeCustomer.payload.metadata.phone,
          uniq(product.roles.concat(['Affiliate'])),
          [],
          null,
          address,
          null,
        );
        await session.store(user);
        await session.saveChanges();
      }

      try {
        if (user.sponsor) {
          const affiliate = await session.load<User>(user.sponsor.id);
          if (
            affiliate &&
            DateTime.fromISO(affiliate.createdAt.toUTCString())
              .diffNow('days')
              .toObject().days < 30
          ) {
            affiliate.threeForFreeUserIds.push(user.id);
            await session.saveChanges();
          }
        }
      } catch (ex) {
        const dumpBucket = new DumpBucket(null, null, {
          function: 'processCustomerSubscriptionCreated Trying to add threeForFreeUserIds',
          exception: ex,
        });
        await session.store(dumpBucket);
        await session.saveChanges();
      }
      if (user) {
        let customerSubscription = new UserSubscription(
          'Stripe',
          new UserReference(user.id, user.email, user.firstName, user.lastName),
          subscription.id,
          subscription.status,
          moment.unix(subscription.start).toDate(),
          moment.unix(subscription.current_period_start).toDate(),
          moment.unix(subscription.current_period_end).toDate(),
          paymentAccountKey,
          new UserStripeSubscription(
            subscription.id,
            new StripeCustomerReference(stripeCustomer.payload.id, stripeCustomer.payload.email),
            new StripePlanReference(
              stripePlan.payload.id,
              stripePlan.payload.nickname,
              stripePlan.payload.interval,
              stripePlan.payload.interval_count,
              stripePlan.payload.amount,
              stripePlan.payload.product.toString(),
            ),
            new StripeProductReference(stripeProduct.payload.id, stripeProduct.payload.name),
          ),
          user.sponsor,
        );
        customerSubscription.id = `${user.id}/subscriptions/${subscription.id}`;
        if (subscription.metadata && subscription.metadata.hasOwnProperty('referralCode')) {
          customerSubscription.referrerCode = subscription.metadata['referralCode'];
        }
        if (user.roles.indexOf('CoinMD Member') > -1) {
          customerSubscription.isRevenueShare = true;
        }

        let webHook = new StripeWebhook(
          subscription.id,
          event.type,
          event,
          null,
          new UserReference(user.id, user.email, user.firstName, user.lastName),
          user.sponsor ? new UserReference(user.sponsor.id, user.sponsor.email, user.sponsor.firstName, user.sponsor.lastName) : null,
        );
        await session.store(webHook);
        await session.saveChanges();

        user.active = true;
        await session.store(customerSubscription);
        await session.saveChanges();
        return customerSubscription;
      } else {
        return null;
      }
    } catch (ex) {
      await session.store(
        await createAndSendException(subscription.id, new Error(ex.message).stack, ex.message, {
          function: 'processCustomerSubscriptionCreated()',
          event,
        }),
      );
      await session.saveChanges();
      return null;
    }
  } catch (ex) {
    await session.store(
      await createAndSendException(event.id, new Error(ex.message).stack, ex.message, {
        function: 'processCustomerSubscriptionCreated()',
        event,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processCustomerSubscriptionUpdated(
  session: IDocumentSession,
  event: Stripe.events.IEvent,
  paymentAccountKey: PaymentAccountEnum,
): Promise<any> {
  try {
    const subscription = <Stripe.subscriptions.ISubscription>event.data.object;
    try {
      const userSubscription = await session
        .query<UserSubscription>({ collection: 'UserSubscriptions' })
        .whereEquals('subscriptionId', subscription.id)
        .include('user.id')
        .firstOrNull();

      if (userSubscription) {
        userSubscription.currentPeriodStart = moment.unix(subscription.current_period_start).toDate();
        userSubscription.currentPeriodEnd = moment.unix(subscription.current_period_end).toDate();
        userSubscription.status = subscription.status;
        userSubscription.updatedAt = getNowUtc();
        userSubscription.paymentAccountKey = paymentAccountKey;

        if (subscription.metadata && subscription.metadata.hasOwnProperty('referralCode')) {
          userSubscription.referrerCode = subscription.metadata['referralCode'];
        }

        await session.saveChanges();

        const user = await session.load<User>(userSubscription.user.id);
        if (user.sorAccount) {
          if (subscription.status === 'past_due' || subscription.status === 'canceled') {
            await sorDeactivateMember(sorGetApiCredentials(user.roles), user.email, user.sorAccount.contractNumber);
            user.active = false;
          } else if (!user.active && subscription.status === 'active') {
            user.active = true;
            await sorActivateMember(sorGetApiCredentials(user.roles), user.email, user.sorAccount.contractNumber);
          }
        } else {
          //should we send an email?
          await createAndSendException(
            event.id,
            new Error('user.sorAccount is null or undefined').stack,
            `Unable to activate or deactivate user due to user.sorAccount being null or undefined > ${user.id}`,
            {
              function: 'processCustomerSubscriptionUpdated()',
              event,
              user,
              subscription,
              userSubscription,
            },
            true,
          );
        }

        let webHook = new StripeWebhook(
          subscription.id,
          event.type,
          event,
          null,
          new UserReference(user.id, user.email, user.firstName, user.lastName),
          user.sponsor ? new UserReference(user.sponsor.id, user.sponsor.email, user.sponsor.firstName, user.sponsor.lastName) : null,
        );
        await session.store(webHook);
        await session.store(user);
        await session.saveChanges();
      }

      return userSubscription;
    } catch (ex) {
      await session.store(
        await createAndSendException(subscription.id, new Error(ex.message).stack, ex.message, {
          function: 'processCustomerSubscriptionUpdated()',
          event,
        }),
      );
      await session.saveChanges();
      return null;
    }
  } catch (ex) {
    await session.store(
      await createAndSendException(event.id, new Error(ex.message).stack, ex.message, {
        function: 'processCustomerSubscriptionUpdated()',
        event,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function listAllCards(
  userId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.cards.ICard[]> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  const res = await stripe.customers.listCards(userId);
  return res.data;
}

export async function createCreditCardAndUpdateDefaultSource(
  userId: string,
  saleInfo: ISaleInfo,
  address: IAddress,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<ICreateSourceResult> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  const customer = await stripe.customers.retrieve(userId);
  const card = await createCardSource(customer, saleInfo, address);
  await updateDefaultSource(customer.id, card.payload.id);
  return card;
}

export async function updateDefaultSource(
  customerId: string,
  cardId: string,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
) {
  let userToUpdate: customers.ICustomerUpdateOptions = {
    default_source: cardId,
  };
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.customers.update(customerId, userToUpdate);
}

export async function updateCard(
  cardId: string,
  customerId: string,
  saleInfo: ISaleInfo,
  address: IAddress,
  paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC,
): Promise<Stripe.cards.ICard> {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  let infoToUpdate: Stripe.cards.ICardUpdateOptions = {
    address_city: address.address,
    address_line1: address.zip,
    address_country: address.country,
    address_state: address.state,
    address_zip: address.zip,
    exp_month: +saleInfo.ccExpMonth,
    exp_year: +saleInfo.ccExpYear,
    name: `${saleInfo.firstNameOnCard} ${saleInfo.lastNameOnCard}`,
  };
  return await stripe.customers.updateCard(customerId, cardId, infoToUpdate);
}

export async function getCardById(customerId: string, cardId: string, paymentKey: PaymentAccountEnum = PaymentAccountEnum.TripValetLLC) {
  const stripe = new Stripe(vars.PaymentApiKeys[paymentKey] || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');
  return await stripe.customers.retrieveCard(customerId, cardId);
}
// moment.unix(yourUnixEpochTime).format('dddd, MMMM Do, YYYY h:mm:ss A')
