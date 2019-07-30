import * as Stripe from 'stripe';
import * as StripeInterfaces from '../../interfaces/stripe';
import * as stripe from '../../helpers/stripe';
import { Context, createAndSendException, verifyAccess } from '../../utils';
import { getUser } from '../../helpers/user';
import { User } from '../../db/models/User';
import Roles from '../../roles';

export default {
  async getStripeCustomer(_parent, { customerId }: StripeInterfaces.GraphQLArgs, { req }: Context): Promise<Stripe.customers.ICustomer> {
    verifyAccess(req, [Roles.Administrator]);
    return (await stripe.getCustomer(customerId)).payload;
  },

  async getStripeToken(_parent, { tokenId }: StripeInterfaces.GraphQLArgs, { req }: Context): Promise<Stripe.tokens.IToken> {
    verifyAccess(req, [Roles.Administrator]);
    return await stripe.getToken(tokenId);
  },

  async getStripeCard(_parent, args, { session, req }: Context): Promise<Stripe.cards.ICard> {
    let user: User;
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const { user: sessionUser } = req;
      user = await getUser(session, sessionUser, args);
      const token = await stripe.getToken(user.stripe.tokenId);
      return token.card;
    } catch (ex) {
      throw new Error('No Stripe Information');
    }
  },

  async getStripePlan(_parent, args, { session, req }: Context): Promise<Stripe.plans.IPlan> {
    verifyAccess(req, [Roles.Administrator]);
    const { user: sessionUser } = req;
    let user: User;
    try {
      user = await getUser(session, sessionUser, args);
      return (await stripe.getPlan(user.stripe.planId)).payload;
    } catch (ex) {
      await session.store(await createAndSendException(user.id, new Error(ex.message).stack, ex.message, user));
      await session.saveChanges();
      throw new Error('No Stripe Information');
    }
  },

  async getStripSubscription(_parent, args, { session, req }: Context): Promise<Stripe.subscriptions.ISubscription> {
    verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
    const { user: sessionUser } = req;
    let user: User;
    try {
      user = await getUser(session, sessionUser, args);
      const res = await stripe.getSubscription(user.stripe.subscriptionId);
      return res;
    } catch (ex) {
      await session.store(await createAndSendException(user.id, new Error(ex.message).stack, ex.message, user));
      await session.saveChanges();
      throw new Error('No Stripe Information');
    }
  },

  async getStripeCustomerByEmail(_parent, { email }, { session, req }: Context): Promise<Stripe.customers.ICustomer[]> {
    verifyAccess(req, [Roles.Administrator]);
    try {
      return await stripe.getCustomerByEmail(email);
    } catch (ex) {
      await session.store(await createAndSendException(email, new Error(ex.message).stack, ex.message));
      await session.saveChanges();
      throw new Error('No Stripe Information');
    }
  },

  async getUserCards(_parent, _args, { session, req }: Context): Promise<Stripe.cards.ICard[]> {
    //
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const user = await session.load<User>(req.user.id);
      const rest = await stripe.listAllCards(user.stripe.customerId);
      return rest;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, _args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async getCardById(_parent, _args, { session, req }: Context): Promise<Stripe.cards.ICard> {
    //
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const user = await session.load<User>(req.user.id);
      return await stripe.getCardById(user.stripe.customerId, _args.cardId);
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, _args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async getStripeSubscriptionById(
    _parent,
    { subscriptionId }: StripeInterfaces.GraphQLArgs,
    { req }: Context
  ): Promise<Stripe.subscriptions.ISubscription> {
    verifyAccess(req, [Roles.Administrator]);
    return await stripe.getSubscription(subscriptionId);
  },
};
