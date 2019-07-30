import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Funnel, FunnelStepProduct, PromoCode, FunnelStep } from '../../db/models/Funnel';
import * as FunnelInterface from '../../interfaces/funnel';
import * as moment from 'moment';
import { find } from 'lodash';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';
import { Product, ProductReference } from '../../db/models/Product';
import { DomainReference } from '../../db/models/Domain';
import { IProduct } from '../../interfaces/product';
import { IDomain } from '../../interfaces/domains';

export default {
  async addFunnel(_parent, args, { session, req }: Context): Promise<FunnelInterface.IFunnel> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { funnel: funnelInput } = args;

      for (let funnelStep of funnelInput.funnelSteps) {
        let products = Object.assign([], funnelStep.products);
        for (let [index, prod] of products.entries()) {
          let product = await session.load<Product>(prod);
          funnelStep.products[index] = { id: product.id, name: product.name, amount: product.amount, interval: product.plan.interval };
        }
      }
      const funnel = new Funnel(funnelInput.title, funnelInput.active, funnelInput.funnelSteps, funnelInput.domain);
      funnel.createdAt = getNowUtc();
      funnel.updatedAt = getNowUtc();
      await session.store(funnel);
      await session.saveChanges();
      return funnel;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editFunnel(_parent, args: FunnelInterface.IAddEditFunnelArgs, { session, req }: Context): Promise<FunnelInterface.IFunnel> {
    // TODO: update FunnelInterface.IEditFunnelArgs as it would send in strings for products
    verifyAccess(req, [Roles.Administrator]);
    const { funnel: funnelInput } = args;

    try {
      let funnel = await session.load<Funnel>(funnelInput.id);
      const products = await session.query<IProduct>({ collection: 'products' }).all();
      if (!funnel) {
        return null;
      }

      funnel.active = funnelInput.active;
      funnel.hidden = funnelInput.hidden;
      funnel.title = funnelInput.title;
      funnel.updatedAt = getNowUtc();
      if (funnel.domain.id !== funnelInput.domain) {
        const domain = await session.load<IDomain>(funnelInput.id);
        funnel.domain = new DomainReference(domain.id, domain.tld);
      }

      let funnelSteps: FunnelInterface.IFunnelStep[] = [];
      for (let funnelStepInput of funnelInput.funnelSteps) {
        let funnelStepProducts: FunnelInterface.IFunnelStepProduct[] = [];

        for (let funnelStepProductInput of funnelStepInput.products) {
          let promoCodes: FunnelInterface.IPromoCode[] = [];

          if (funnelStepProductInput.promoCodes) {
            for (let promoCodeInput of funnelStepProductInput.promoCodes) {
              const promoCodeProductInput = promoCodeInput.product
                ? find(products, (product: IProduct) => {
                    return product.id === promoCodeInput.product;
                  })
                : null;
              const promoCodeProduct = promoCodeProductInput ? new ProductReference(promoCodeProductInput.id, promoCodeProductInput.name, promoCodeProductInput.displayName, promoCodeProductInput.amount, promoCodeProductInput.interval, promoCodeProductInput.setup) : null;
              promoCodes.push(new PromoCode(promoCodeInput.code, promoCodeInput.discountType, promoCodeInput.discountAmount, promoCodeInput.maxUse, promoCodeInput.currentUse || 0, promoCodeInput.startDate, promoCodeInput.endDate, promoCodeProduct));
            }
          }

          const funnelStepProduct = find(products, (product: IProduct) => {
            return product.id === funnelStepProductInput.product;
          });
          funnelStepProducts.push(new FunnelStepProduct(funnelStepProduct.id, funnelStepProduct.displayName, funnelStepProduct.amount, funnelStepProduct.plan.interval, funnelStepProduct.setup, promoCodes));
        }
        funnelSteps.push(new FunnelStep(funnelStepInput.stepOrder, funnelStepInput.url, funnelStepInput.nextFunnelStepUrl, funnelStepProducts));
      }
      funnel.funnelSteps = funnelSteps;

      // funnel = Object.assign(
      //   funnel,
      //   { ...funnelInput },
      //   {
      //     updateAt: moment()
      //       .utc()
      //       .toDate(),
      //   }
      // );
      await session.saveChanges();
      return funnel;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
};
