import { IDocumentStore, PutIndexesOperation, IndexDefinition } from 'ravendb';
import * as indexes from './indexes';
import { IOrder } from '../../interfaces/order';
import { ICommission } from '../../interfaces/commission';
import { Commission } from '../models/Commission';
import { OrderReference } from '../models/Order';
import moment = require('moment');
import { DateTime } from 'luxon';
import order from '../../resolvers/Mutations/order';
import { UserSubscription } from '../models/UserSubscription';

export default {
  name: '2019-10-28-OrderCommissionToRootCommissionDocuments',
  up: async (store: IDocumentStore) => {
    const session = store.openSession();
    const orders = await session.query<IOrder>({ collection: 'Orders' }).all();

    let commissions: ICommission[] = [];
    for (let order of orders) {
      for (let c of order.commissions) {
        let commission = new Commission(c.payCommissionOn, c.commissionAmount, c.status, order.customer, c.affiliate, order.invoice, new OrderReference(order.id, order.products, order.totalAmount), c.tier, c.revenueShare);
        commission.createdAt = moment(order.payment.created).toDate();
        commission.updatedAt = moment().toDate();
        commissions.push(commission);
      }
    }

    const tryBulkUpdate = store.bulkInsert();
    for (const commission of commissions) {
      await tryBulkUpdate.store(commission, commission.id);
    }
    await tryBulkUpdate.finish();
  },
  down: async (store: IDocumentStore) => {
    console.log('0001-OrdersIndex > down');
  },
};
