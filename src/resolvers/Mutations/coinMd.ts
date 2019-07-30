import { Context, verifyAccess } from '../../utils';
import { ISubscription, Result } from '../../interfaces/coinMd';
import * as Stripe from '../../helpers/stripe';
import Roles from '../../roles';
import { SaleInfo } from '../../interfaces/stripe';
import { v1 } from 'uuid';
import { Exception } from '../../db/models/Exception';

export default {
  async createSubscriptionCoinMd(_parent, args: ISubscription, ctx: Context): Promise<Result> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    // TODO: Need to update how we create the Card and Customer to use a Token
    throw new Exception(null, 'createSubscriptionCoinMd', new Error('TODO').stack, 'TODO: Redo Card and Customer', {
      location: {
        message: 'Need to Redo the Card and Customer to use a token',
        function: 'coindMd.ts > createSubscriptionCoinMd()',
      },
      args,
    });

    try {
      const {
        invoice: {
          user,
          billingInfo: { firstNameOnCard, lastNameOnCard },
          planId,
        },
      } = args;
      const customer = await Stripe.createCustomer(user.email, firstNameOnCard, lastNameOnCard, '', args.invoice.totalAmount, '');
      const plan = await Stripe.getPlan(planId);
      if (!customer) return { success: false, message: 'No User Found/Created' };
      if (customer.payload.sources.data.length > 0) {
        const subscription = await Stripe.createSubscription(customer.payload.id, plan.payload);
        if (!subscription) return { success: false, message: 'No Subscription Found' };
        await Stripe.updateSubscription(subscription.payload.id, null, null, null);
        return { success: true, message: 'Subscription Created' };
      } else {
        await Stripe.createCardSource(customer.payload, new SaleInfo(args.invoice.user.email, args.invoice.user.firstName, args.invoice.user.lastName, args.invoice.billingInfo.card, args.invoice.billingInfo.ccExpMonth, args.invoice.billingInfo.ccExpYear, args.invoice.billingInfo.cvc, args.invoice.totalAmount * 100, v1()), null);
        await Stripe.createSubscription(customer.payload.id, plan.payload);
        return { success: true, message: 'Subscription Created' };
      }
    } catch (e) {
      console.error(e);
      return { success: false, message: e };
    }
  },
};
