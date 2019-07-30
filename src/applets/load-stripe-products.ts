import { initializeStore } from '../db/config';
import * as stripe from '../helpers/stripe';
import { Product } from '../db/models/Product';
import { IProduct } from '../interfaces/product';
import { v4 as uuidV4, v1 as uuidV1 } from 'uuid';
import moment = require('moment');
import { getNowUtc, capitalizeEachFirstLetter } from '../utils';
import { PaymentAccountEnum } from '../interfaces/product';

var api_key = '...';
var example_list_id = '...';

(async () => {
  try {
    const paymentAccount = PaymentAccountEnum.TripValetIncentives;
    const plans = await stripe.getPlans(paymentAccount);
    const store = await initializeStore();
    console.log('paymentAccount', paymentAccount);
    console.log('# Plans', plans.payload.data.length);

    try {
      const session = store.openSession();
      const products = await session.query<Product>({ collection: 'Products' }).all();
      // console.log('products, plans', products, plans);
      let count = 0;

      for (let plan of plans.payload.data) {
        if (plan.nickname === 'TripValet') console.log('PLAN is TripValet', plan.nickname, plan.product);
        const stripeProduct = await stripe.getProduct(plan.product.toString(), paymentAccount);
        console.log(`COUNT: ${++count} : ${stripeProduct.payload.name} : ${stripeProduct.payload.id} : ${plan.nickname} : ${plan.id}`);
        if (stripeProduct.payload.name === 'TripValet') console.log('PRODUCT is TripValet', stripeProduct.payload.name);
        let product = products.find(p => p.name === stripeProduct.payload.name && p.plan.id === plan.id);
        if (product) {
          let productToUpdate: any = await session.load(product.id);
          productToUpdate.product = {
            id: stripeProduct.payload.id,
            name: stripeProduct.payload.name,
          };
          productToUpdate.plan = {
            id: plan.id,
            nickname: plan.nickname,
            interval: capitalizeEachFirstLetter(plan.interval),
            amount: plan.amount,
          };
          product.paymentAccount = paymentAccount;
          productToUpdate.updatedAt = getNowUtc();
        } else {
          console.log('****************** PRODUCT NOT FOUND ******************', stripeProduct.payload.name, plan.id);
          const productToAdd = new Product(
            plan.amount / 100,
            [
              {
                id: uuidV4(),
                level: 1,
                commissionType: 'percentage',
                value: 40,
                daysToPayCommission: 30,
              },
              {
                id: uuidV4(),
                level: 2,
                commissionType: 'percentage',
                value: 10,
                daysToPayCommission: 30,
              },
            ],
            stripeProduct.payload.name,
            stripeProduct.payload.name, // Temp hack - need to rename this in the database to something more human
            {
              id: 'domains/1-A',
              tld: 'tripvalet.com',
            },
            {
              id: stripeProduct.payload.id,
              name: stripeProduct.payload.name,
            },
            {
              id: plan.id,
              nickname: plan.nickname,
              interval: capitalizeEachFirstLetter(plan.interval),
              amount: plan.amount,
            },
            {
              fee: 0,
              description: '',
            },
            paymentAccount,
          );
          productToAdd.createdAt = moment().toDate();
          productToAdd.updatedAt = moment().toDate();
          productToAdd.roles = ['Affiliate'];
          await session.store(productToAdd);
        }
      }
      await session.saveChanges();
      process.exit(0);
    } catch (ex) {
      console.log(ex.message);
      process.exit(1);
    }
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
