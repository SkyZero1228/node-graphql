import { Context, verifyAccess } from '../../utils';
import * as OrderInterface from '../../interfaces/order';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';
import { ICreateSourceResult, IUpdateCreditCard } from '../../interfaces/stripe';
import { createCreditCardAndUpdateDefaultSource, updateCard, deleteCard, updateDefaultSource } from '../../helpers/stripe';
import { User } from '../../db/models/User';
import { ICard } from 'stripe';
import { IResult } from '../../interfaces/lead';

export default {
  async createStripeCard(_parent, args: IUpdateCreditCard, { session, req }: Context): Promise<any> {
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const user = await session.load<User>(req.user.id);
      return await createCreditCardAndUpdateDefaultSource(user.stripe.customerId, args.values.saleInfo, args.values.address);
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async updateStripeCard(_parent, args: IUpdateCreditCard, { session, req }: Context): Promise<any> {
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const user = await session.load<User>(req.user.id);
      return await updateCard(args.values.cardId, user.stripe.customerId, args.values.saleInfo, args.values.address);
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async deleteStripeCard(_parent, args, { session, req }: Context): Promise<IResult> {
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const user = await session.load<User>(req.user.id);
      const result = await deleteCard(user.stripe.customerId, args.cardId);
      return { message: `Card ${result.id} Deleted`, success: result.deleted };
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async setStripeCardAsDefault(_parent, args, { session, req }: Context): Promise<IResult> {
    try {
      verifyAccess(req, [Roles.Administrator, Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate, Roles.CoinMD]);
      const user = await session.load<User>(req.user.id);
      const result = await updateDefaultSource(user.stripe.customerId, args.cardId);
      return { message: `Card ${result.id} Set as Default`, success: true };
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },
};
