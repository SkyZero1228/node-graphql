import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Product } from '../../db/models/Product';
import * as ProductInterface from '../../interfaces/product';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';

export default {
  async addProduct(_parent, args: ProductInterface.IProductArgs, { session, req }: Context): Promise<ProductInterface.IProduct> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      const { product: productInput } = args;
      const product = new Product(
        productInput.amount,
        productInput.tierPayouts,
        productInput.name,
        productInput.displayName,
        productInput.domain,
        productInput.product,
        productInput.plan,
        productInput.setup,
        productInput.paymentAccount
      );
      product.sorAccount = productInput.sorAccount;
      product.roles = productInput.roles;
      product.createdAt = getNowUtc();
      product.updatedAt = getNowUtc();
      await session.store(product);
      await session.saveChanges();
      return product;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editProduct(_parent, args: ProductInterface.IProductArgs, { session, req }: Context): Promise<ProductInterface.IProduct> {
    verifyAccess(req, [Roles.Administrator]);
    const { product: productInput } = args;
    try {
      let product = await session.load<Product>(productInput.id);

      if (!product) {
        return null;
      }
      product = Object.assign(product, { ...productInput, updatedAt: getNowUtc() });
      await session.saveChanges();
      return product;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },
};
