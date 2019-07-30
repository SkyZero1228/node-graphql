import { IDocumentStore } from 'ravendb';
import * as indexes from './indexes';
import { Funnel } from '../models/Funnel';
import { Product } from '../models/Product';
import { find } from 'lodash';
import { IProduct } from '../../interfaces/product';

export default {
  name: '018-12-01-AddProductDisplayNameToFunnelSteps',
  up: async (store: IDocumentStore) => {
    const session = store.openSession();
    const products = await session.query<Product>({ collection: 'Products' }).all();
    let funnels = await session.query<Funnel>({ collection: 'Funnels' }).all();

    for (let funnel of funnels) {
      for (let funnelStep of funnel.funnelSteps) {
        for (let funnelStepProduct of funnelStep.products) {
          const product = find(products, (product: IProduct) => {
            return funnelStepProduct.id === product.id;
          });
          funnelStepProduct.displayName = product.displayName;
        }
      }
    }
    await session.saveChanges();
  },
  down: async () => {
    console.log('018-12-01-AddProductDisplayNameToFunnelSteps > down');
  },
};
