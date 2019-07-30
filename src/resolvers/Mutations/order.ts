import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Order } from '../../db/models/Order';
import * as OrderInterface from '../../interfaces/order';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';

export default {
  async addOrder(_parent, args: OrderInterface.IOrderArgs, { session, req }: Context): Promise<OrderInterface.IOrder> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { order: orderInput } = args;
      const order = new Order(orderInput.leadId, orderInput.funnel, orderInput.products, orderInput.totalAmount, orderInput.customer, orderInput.affiliate, null, null, null, []);
      order.createdAt = getNowUtc();
      order.updatedAt = getNowUtc();
      order.payment = orderInput.payment;

      await session.store(order);
      await session.saveChanges();
      return order;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editOrder(_parent, args: OrderInterface.IOrderArgs, { session, req }: Context): Promise<OrderInterface.IOrder> {
    verifyAccess(req, [Roles.Administrator]);
    const { order: orderInput } = args;
    try {
      let order = await session.load<Order>(orderInput.id);

      if (!order) {
        return null;
      }
      order = Object.assign(
        order,
        { ...orderInput },
        {
          updatedAt: getNowUtc(),
        }
      );
      await session.saveChanges();
      return order;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
};
