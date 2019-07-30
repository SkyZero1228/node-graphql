import { initializeStore } from '../db/config';
import * as Stripe from 'stripe';
import * as stripe from '../helpers/stripe';
import { PaymentAccountEnum } from '../interfaces/product';
import { User, StripeData } from '../db/models/User';
import { IUser } from '../interfaces/users';
import { find, uniq, uniqBy } from 'lodash';

(async () => {
  try {
    const paymentAccount = PaymentAccountEnum.TripValetIncentives;
    const stripeCustomers = await stripe.getCustomers(paymentAccount, 100);
    const uniqStripCustomers: Stripe.customers.ICustomer[] = uniqBy(stripeCustomers, 'email');
    const store = await initializeStore();

    console.log('paymentAccount', paymentAccount);
    console.log('# stripeCustomers', stripeCustomers.length);
    console.log('# uniqStripCustomers', uniqStripCustomers.length);

    const session = store.openSession();

    let emails = uniq(uniqStripCustomers.reduce((prev, current) => prev.concat(current.email), new Array<string>()));
    console.log('customer emails', emails.length);

    const databaseUsers = await session
      .query<User>({ indexName: 'Users' })
      .whereIn('email', emails)
      .all();
    console.log('users', databaseUsers.length);

    try {
      for (let stripeCustomer of uniqStripCustomers) {
        let u: IUser = find<User>(databaseUsers, u => u.email === stripeCustomer.email);
        if (u) {
          if (!u.stripe) {
            u.stripe = new StripeData(stripeCustomer.id);
          } else {
            u.stripe.customerId = stripeCustomer.id;
          }

          let subscriptionCount = stripeCustomer.subscriptions.total_count;
          if (subscriptionCount > 0) {
            for (let subscriptionItem of stripeCustomer.subscriptions.data) {
              u.stripe.subscriptionId = subscriptionItem.id;
              u.stripe.planId = subscriptionItem.plan ? subscriptionItem.plan.id : '';
              u.stripe.productId = subscriptionItem.plan ? (subscriptionItem.plan.product as string) : '';
              if (subscriptionItem.status === 'active') {
                u.stripe.status = subscriptionItem.status;
              } else if (subscriptionCount === 1) {
                u.stripe.status = subscriptionItem.status;
              }
            }
          } else {
            u.stripe.subscriptionId = '';
            u.stripe.planId = '';
            u.stripe.productId = '';
            u.stripe.status = '';
          }
        } else {
          console.log('user not found', stripeCustomer.email);
        }
      }

      const tryBulkUpdate = store.bulkInsert();
      for (const user of databaseUsers) {
        await tryBulkUpdate.store(user, user.id);
      }
      await tryBulkUpdate.finish();
      console.log('Finished Updating Database Users');

      process.exit(0);
    } catch (ex) {
      console.log(ex.message);
      process.exit(1);
    }
    process.exit(0);
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
