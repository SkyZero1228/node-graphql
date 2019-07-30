import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Commission } from '../../db/models/Commission';
import * as CommissionInterface from '../../interfaces/commission';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';
import { GetNextOperationIdCommand, DeleteByQueryOperation, IndexQuery, IDocumentStore } from 'ravendb';
import { OrderReference, Order } from '../../db/models/Order';
import { StripeWebhook } from '../../db/models/Stripe';

export default {
  async addCommission(_parent, args: CommissionInterface.ICommissionArgs, { session, req }: Context): Promise<CommissionInterface.ICommission> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { commission: commissionInput } = args;
      const commission = new Commission(commissionInput.payCommissionOn, commissionInput.commissionAmount, commissionInput.status, commissionInput.customer, commissionInput.affiliate, commissionInput.invoice, commissionInput.order, commissionInput.tier, commissionInput.revenueShare);
      await session.store(commission);
      await session.saveChanges();
      return commission;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editCommission(_parent, args: CommissionInterface.ICommissionArgs, { session, req }: Context): Promise<CommissionInterface.ICommission> {
    verifyAccess(req, [Roles.Administrator]);
    const { commission: commissionInput } = args;
    try {
      let commission = await session.load<Commission>(commissionInput.id);

      if (!commission) {
        return null;
      }

      commission = Object.assign(commission, { ...commissionInput });
      await session.saveChanges();
      return commission;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async removeCommission(_parent, args, { session, req, store }: Context): Promise<CommissionInterface.ICommissionResult> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { orderId } = args;
      const stripeWebhook = await session
        .query<StripeWebhook>({ collection: 'StripeWebhooks' })
        .whereEquals('orderId', orderId)
        .firstOrNull();
      if (stripeWebhook) await session.delete(stripeWebhook);
      await session.delete(orderId);
      const indexQuery = new IndexQuery();
      indexQuery.query = `from index Commissions where orderId = '${orderId}'`;
      const operation = new DeleteByQueryOperation(indexQuery);
      const asyncOp = await store.operations.send(operation);
      await asyncOp.waitForCompletion();

      await session.saveChanges();
      return { success: true, message: 'deleted' };
    } catch (e) {
      // console.log(e);
      return { success: false, message: e };
    }
  },

  async markCommissionAsPaid(_parent, args, { session, req }: Context): Promise<boolean> {
    verifyAccess(req, [Roles.Administrator]);
    for (let id of args.id) {
      try {
        let commission = await session.load<Commission>(id);

        if (!commission) {
          return null;
        }
        commission.status = 'Paid';
        await session.store(commission);
      } catch (ex) {
        await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
        await session.saveChanges();
        throw new Error('There was an error. Please try again. The Tech team has been notified.');
      }
    }
    await session.saveChanges();
    return true;
  },
};
