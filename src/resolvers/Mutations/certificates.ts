import {
  Context,
  verifyAccess,
  getIp,
  getNowUtc,
  createAndSendException,
  sendException,
  sendSfxCertificateLink,
  sendUnlimitedCertificatesLink,
  sendCertificate,
  sendLasVegasActivationAndReservationReceipt,
  sendLasVegasActivationOnlyReceipt,
  sendLasVegasReservationOnlyReceipt
} from '../../utils';
import { Certificate } from '../../db/models/Certificate';
import { Document, IDocument } from '../../db/models/Document';
import * as CertificateInterfaces from '../../interfaces/certificates';
import Roles from '../../roles';
import * as uuid from 'uuid';
import { ICertificate } from '../../interfaces/certificates';
import * as AuthorizeNet from 'authorizenet';
import {
  ILasVegasCertificatePayment,
  IAuthorizeCaptureResult,
  DeliveryMethod,
  CertificatePaymentEnum,
  IProspect
} from '../../interfaces/prospects';
import { triggerAsyncId } from 'async_hooks';
import { Exception } from '../../db/models/Exception';
import { Prospect, Visit, CertificatePayment } from '../../db/models/Prospect';
import { User, UserReference } from '../../db/models/User';
import { SfxCertificateOrderRequest } from '../../db/models/sfx';
import { DumpBucket } from '../../db/models/DumpBucket';
import * as sfx from '../../helpers/sfx';
import * as vars from '../../../env/vars';
import { find, uniq } from 'lodash';
import * as Stripe from 'stripe';
import { NextIdentityForCommand } from 'ravendb';
import { createToken, createCustomer, createCharge, getNextDayOfWeek } from '../../helpers/stripe';
import product from '../Queries/product';
import { createRequest } from '@sendgrid/client';
import { PaymentAccountEnum } from '../../interfaces/product';
import { v1 } from 'uuid';
import {
  SaleInfo,
  Card,
  StripeChargeReference,
  StripeCustomerReference,
  StripeSourceReference,
  StripeCustomerInvoiceReference
} from '../../interfaces/stripe';
import { DateTime } from 'luxon';
import moment = require('moment');
import { Commission, CommissionRevenueShare } from '../../db/models/Commission';
import { Order, OrderReference } from '../../db/models/Order';
import { IOrder } from '../../interfaces/order';
import { IUserReference, IUser } from '../../interfaces/users';
import { ProductReference, Product } from '../../db/models/Product';
import { createWriteStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs';
import { IBooleanResponse } from '../../interfaces/common';
import { initializeStore } from '../../db';
const node_xj = require('xls-to-json');

const COMMISSION_FEE = 6;
const MEXICO_AMOUNT = 39.95;

const storeUpload = ({ stream, filename }) =>
  new Promise((resolve, reject) =>
    stream
      .pipe(createWriteStream(filename))
      .on('finish', () => resolve())
      .on('error', reject)
  );

export default {
  async addCertificate(_parent, args: ICertificate, ctx: Context): Promise<ICertificate> {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const certificate = new Certificate(
      null,
      args.title,
      args.description,
      args.imageUrl,
      args.membershipLevel,
      args.apiAccessToken,
      args.active,
      args.defaultMessage,
      args.displayOrder,
      args.images
    );
    await ctx.session.store(certificate);
    await ctx.session.saveChanges();
    return certificate;
  },

  async editCertificate(_parent, args, ctx: Context) {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let certificate = await ctx.session.load<Certificate>(args.id);
    if (!certificate) {
      return null;
    }

    Object.assign(certificate, { ...args });
    await ctx.session.saveChanges();
    return certificate;
  },

  async addCertificateDocument(
    _parent,
    args: CertificateInterfaces.IAddDocumentToCertificate,
    { session, req }: Context
  ): Promise<IDocument> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);

    let certificate = await session.load<Certificate>(args.certificateId);
    if (certificate) {
      const document = new Document(uuid.v1(), args.type, args.url, args.displayOrder, args.images, args.active);
      if (!certificate.documents) certificate.documents = [document];
      else certificate.documents.push(document);
      await session.saveChanges();
      return document;
    }
    return null;
  },
  async captureVegasCertificate(
    _parent,
    args: ILasVegasCertificatePayment,
    { session, store, req }: Context
  ): Promise<IAuthorizeCaptureResult> {
    console.log('entered');

    const { card, address } = args;
    let customer = new User();
    customer.firstName = args.firstName;
    customer.lastName = args.lastName;
    customer.email = args.deliveryEndpoint;
    customer.phone = args.phone;

    let paymentAmount: number = 0;
    if (args.payActivation) {
      paymentAmount += 17.95;
    }

    if (args.payReservation) {
      paymentAmount += 99;
    }

    const nextIdentityCommand = new NextIdentityForCommand('TV-LVC');
    await store.getRequestExecutor().execute(nextIdentityCommand);
    const invoiceNumber = `TV-LVC-${nextIdentityCommand.result.toString().padStart(10, '0')}`;

    const paymentAccountKey = PaymentAccountEnum.TripValetIncentives;
    let stripeToken = await createToken(card, address, customer, paymentAccountKey);
    if (!stripeToken.success) {
      await session.store(await sendException(stripeToken.exception));
      await session.saveChanges();
      throw new Error(stripeToken.exception.errorMessage);
    }

    let stripeCustomer = await createCustomer(
      customer.email,
      customer.firstName,
      customer.lastName,
      customer.phone,
      paymentAmount,
      stripeToken.payload.id,
      paymentAccountKey
    );
    if (!stripeCustomer.success) {
      await session.store(await sendException(stripeCustomer.exception));
      await session.saveChanges();
      throw new Error(stripeCustomer.exception.errorMessage);
    } else if (stripeCustomer.success && stripeCustomer.exception) {
      await sendException(stripeCustomer.exception, true);
    }

    let stripeCharge = await createCharge(
      stripeCustomer.payload,
      new SaleInfo(
        customer.email,
        customer.firstName,
        customer.lastName,
        card.number,
        card.month,
        card.year,
        card.cvc,
        paymentAmount * 100,
        invoiceNumber
      ),
      stripeToken.payload.card.id,
      'Las Vegas Certificate Fees',
      paymentAccountKey
    );
    if (!stripeCharge.success) {
      await session.store(await sendException(stripeCharge.exception));
      await session.saveChanges();
      throw new Error(stripeCharge.exception.errorMessage);
    } else {
      let prospect = await session
        .query<Prospect>({ collection: 'Prospects' })
        .whereEquals('uuid', args.uuid)
        .firstOrNull();

      prospect.visits.push(new Visit(new Date(), getIp(req), req.url));
      prospect = Object.assign(prospect, {
        firstName: args.firstName,
        lastName: args.lastName,
        deliveryEndpoint: args.deliveryEndpoint,
        deliveryMethod: DeliveryMethod.Email,
        phone: args.phone,
        redeemed: true,
        updatedAt: getNowUtc()
      });
      prospect.travelers = args.travelers;
      prospect.preferredDates = args.preferredDates;
      prospect.alternateDates = args.alternateDates;
      await session.saveChanges();

      try {
        const certificate = await session.load<Certificate>(prospect.certificate.id);
        if (args.payActivation) {
          if (args.payReservation) {
            sendLasVegasActivationAndReservationReceipt(prospect, customer, invoiceNumber, stripeCharge.payload);
          } else {
            sendLasVegasActivationOnlyReceipt(prospect, customer, invoiceNumber, stripeCharge.payload);
          }
        } else {
          sendLasVegasReservationOnlyReceipt(prospect, customer, invoiceNumber, stripeCharge.payload);
        }
      } catch (ex) {
        await session.store(await createAndSendException(prospect.id, new Error(ex.message).stack, ex.message, prospect));
        await session.saveChanges();
      }

      //Create Order
      let order: IOrder = null;
      const customerReference = new UserReference(customer.id, customer.email, customer.firstName, customer.lastName);
      const affiliate = await session.load<User>(prospect.userId);
      const affiliateReference = new UserReference(affiliate.id, affiliate.email, affiliate.firstName, affiliate.lastName);
      const lasVegasCharge = stripeCharge.payload;
      const chargeReference = new StripeChargeReference(
        lasVegasCharge.id,
        lasVegasCharge.amount,
        moment.unix(lasVegasCharge.created).toDate(),
        new StripeCustomerReference(stripeCustomer.payload.id, stripeCustomer.payload.email),
        lasVegasCharge.description,
        lasVegasCharge.paid,
        new StripeSourceReference(
          lasVegasCharge.source.id,
          (<Stripe.cards.ICard>lasVegasCharge.source).brand,
          (<Stripe.cards.ICard>lasVegasCharge.source).country,
          (<Stripe.cards.ICard>lasVegasCharge.source).last4,
          (<Stripe.cards.ICard>lasVegasCharge.source).exp_month,
          (<Stripe.cards.ICard>lasVegasCharge.source).exp_year
        ),
        lasVegasCharge.status
      );

      order = new Order(
        null,
        null,
        null,
        paymentAmount,
        customerReference,
        affiliateReference,
        {
          id: 'domains/1-A',
          tld: 'mytripvalet.com'
        },
        chargeReference,
        null,
        []
      );
      order.isRevenueShare = false;
      await session.store(order);

      //Create commission
      const orderReference = new OrderReference(order.id, order.products, order.totalAmount);
      const commission = new Commission(
        DateTime.fromJSDate(getNextDayOfWeek(moment().toDate(), 5, 0)).toJSDate(), // Friday Day Of Week
        COMMISSION_FEE,
        'Pending',
        customerReference,
        affiliateReference,
        new StripeCustomerInvoiceReference(
          null,
          stripeCustomer.payload.id,
          stripeCharge.payload.id,
          stripeCharge.payload.invoice as string,
          null
        ),
        orderReference,
        null,
        new CommissionRevenueShare(false, null)
      );
      commission.createdAt = DateTime.fromMillis(new Date().getTime()).toJSDate(); // Friday Day Of Week
      commission.updatedAt = moment().toDate();

      await session.store(commission);
      await session.saveChanges();

      return { transId: stripeCharge.payload.id, authCode: stripeCharge.payload.receipt_number, message: '' };
    }

    // const apiLoginKey = vars.yobo.apiLoginId; // '4s9JuvjWB9Y';
    // const transactionKey = vars.yobo.transactionKey; // '52BFBPuV7kz35h28';
    // // const apiLoginKey = '4s9JuvjWB9Y';
    // // const transactionKey = '52BFBPuV7kz35h28';

    // let merchantAuthenticationType = new AuthorizeNet.APIContracts.MerchantAuthenticationType();
    // merchantAuthenticationType.setName(apiLoginKey);
    // merchantAuthenticationType.setTransactionKey(transactionKey);

    // let creditCard = new AuthorizeNet.APIContracts.CreditCardType();
    // creditCard.setCardNumber(args.card.number);
    // creditCard.setExpirationDate(`${args.card.month}${args.card.year}`);
    // creditCard.setCardCode(args.card.cvc);

    // const paymentType = new AuthorizeNet.APIContracts.PaymentType();
    // paymentType.setCreditCard(creditCard);

    // const nextIdentityCommand = new NextIdentityForCommand('TV-LVC');
    // await store.getRequestExecutor().execute(nextIdentityCommand);

    // const orderDetails = new AuthorizeNet.APIContracts.OrderType();
    // const invoiceNumber = `TV-LVC-${nextIdentityCommand.result.toString().padStart(10, '0')}`;
    // orderDetails.setInvoiceNumber(invoiceNumber);
    // orderDetails.setDescription('Las Vegas Certificate Activation');

    // const billTo = new AuthorizeNet.APIContracts.CustomerAddressType();
    // billTo.setFirstName(args.firstName);
    // billTo.setLastName(args.lastName);
    // billTo.setAddress(args.address.address);
    // billTo.setCity(args.address.city);
    // billTo.setState(args.address.state);
    // billTo.setZip(args.address.zip);
    // billTo.setCountry('USA');

    // const lineItemList = [];
    // let paymentAmount: number = 0;

    // if (args.payActivation) {
    //   const lineItem_id1 = new AuthorizeNet.APIContracts.LineItemType();
    //   lineItem_id1.setItemId('1');
    //   lineItem_id1.setName('Las Vegas Activation Fee');
    //   lineItem_id1.setDescription('Activation Fee for the Las Vegas 4 Day and 3 Night Vacation.');
    //   lineItem_id1.setQuantity('1');
    //   lineItem_id1.setUnitPrice(17.95);
    //   lineItemList.push(lineItem_id1);
    //   paymentAmount += 17.95;
    // }

    // if (args.payReservation) {
    //   const lineItem_id2 = new AuthorizeNet.APIContracts.LineItemType();
    //   lineItem_id2.setItemId('2');
    //   lineItem_id2.setName('3 Night Stay');
    //   lineItem_id2.setDescription('Complete stay for 3 Nights Included in price.');
    //   lineItem_id2.setQuantity('1');
    //   lineItem_id2.setUnitPrice('99.00');
    //   lineItemList.push(lineItem_id2);
    //   paymentAmount += 99;
    // }

    // const lineItems = new AuthorizeNet.APIContracts.ArrayOfLineItem();
    // lineItems.setLineItem(lineItemList);

    // const transactionSetting1 = new AuthorizeNet.APIContracts.SettingType();
    // transactionSetting1.setSettingName('duplicateWindow');
    // transactionSetting1.setSettingValue('120');

    // const transactionSetting2 = new AuthorizeNet.APIContracts.SettingType();
    // transactionSetting2.setSettingName('recurringBilling');
    // transactionSetting2.setSettingValue('false');

    // const transactionSettingList = [];
    // transactionSettingList.push(transactionSetting1);
    // transactionSettingList.push(transactionSetting2);

    // const transactionSettings = new AuthorizeNet.APIContracts.ArrayOfSetting();
    // transactionSettings.setSetting(transactionSettingList);

    // const transactionRequestType = new AuthorizeNet.APIContracts.TransactionRequestType();
    // transactionRequestType.setTransactionType(AuthorizeNet.APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    // transactionRequestType.setPayment(paymentType);
    // transactionRequestType.setAmount(paymentAmount);
    // transactionRequestType.setLineItems(lineItems);
    // transactionRequestType.setOrder(orderDetails);
    // transactionRequestType.setBillTo(billTo);
    // transactionRequestType.setTransactionSettings(transactionSettings);

    // const createRequest = new AuthorizeNet.APIContracts.CreateTransactionRequest();
    // createRequest.setMerchantAuthentication(merchantAuthenticationType);
    // createRequest.setTransactionRequest(transactionRequestType);

    // //pretty print request
    // console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    // const ctrl = new AuthorizeNet.APIControllers.CreateTransactionController(createRequest.getJSON());
    // // Defaults to sandbox
    // ctrl.setEnvironment(AuthorizeNet.Constants.endpoint.production);

    // let returnResult = null;
    // try {
    //   let result = await new Promise(function(resolve, reject) {
    //     ctrl.execute(async () => {
    //       const apiResponse = ctrl.getResponse();
    //       const response = new AuthorizeNet.APIContracts.CreateTransactionResponse(apiResponse);

    //       //pretty print response
    //       console.log(JSON.stringify(response, null, 2));

    //       if (response != null) {
    //         if (response.getMessages().getResultCode() == AuthorizeNet.APIContracts.MessageTypeEnum.OK) {
    //           if (response.getTransactionResponse().getMessages() != null) {
    //             const transaction = response.getTransactionResponse();
    //             console.log('01: transaction', transaction);
    //             console.log('transaction.transId', transaction.transId);
    //             console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
    //             console.log('Successfully created transaction with Auth Code: ' + response.getTransactionResponse().getAuthCode());
    //             console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
    //             console.log('authCode Code: ' + response.getTransactionResponse().getResponseCode().authCode);
    //             console.log('transId Code: ' + response.getTransactionResponse().getResponseCode().transId);
    //             console.log(
    //               'Message Code: ' +
    //                 response
    //                   .getTransactionResponse()
    //                   .getMessages()
    //                   .getMessage()[0]
    //                   .getCode(),
    //             );
    //             console.log(
    //               'Description: ' +
    //                 response
    //                   .getTransactionResponse()
    //                   .getMessages()
    //                   .getMessage()[0]
    //                   .getDescription(),
    //             );

    //             try {
    //               let prospect = await session
    //                 .query<Prospect>({ collection: 'Prospects' })
    //                 .whereEquals('uuid', args.uuid)
    //                 .firstOrNull();

    //               if (prospect) {
    //                 const user = await session.load<User>(prospect.userId);

    //                 prospect.visits.push(new Visit(new Date(), getIp(req), req.url));
    //                 prospect = Object.assign(prospect, {
    //                   firstName: args.firstName,
    //                   lastName: args.lastName,
    //                   deliveryEndpoint: args.deliveryEndpoint,
    //                   deliveryMethod: DeliveryMethod.Email,
    //                   // redeemed: true,
    //                   updatedAt: getNowUtc(),
    //                 });
    //                 prospect.travelers = args.travelers;
    //                 prospect.preferredDates = args.preferredDates;
    //                 prospect.alternateDates = args.alternateDates;
    //                 // console.log('prospect', prospect, args);

    //                 if (args.payActivation) {
    //                   prospect.payments = prospect.payments.concat(
    //                     new CertificatePayment(
    //                       CertificatePaymentEnum.Activation,
    //                       17.95,
    //                       transaction.transId,
    //                       transaction.authCode,
    //                       invoiceNumber,
    //                       transaction,
    //                     ),
    //                   );
    //                 }

    //                 if (args.payReservation) {
    //                   prospect.payments = prospect.payments.concat(
    //                     new CertificatePayment(
    //                       CertificatePaymentEnum.Reservation,
    //                       99,
    //                       transaction.transId,
    //                       transaction.authCode,
    //                       invoiceNumber,
    //                       transaction,
    //                     ),
    //                   );
    //                 }

    //                 await session.saveChanges();

    //                 try {
    //                   const certificate = await session.load<Certificate>(prospect.certificate.id);
    //                   if (args.payActivation) {
    //                     if (args.payReservation) {
    //                       sendLasVegasActivationAndReservationReceipt(prospect, user, invoiceNumber, transaction);
    //                     } else {
    //                       sendLasVegasActivationOnlyReceipt(prospect, user, invoiceNumber, transaction);
    //                     }
    //                   } else {
    //                     sendLasVegasReservationOnlyReceipt(prospect, user, invoiceNumber, transaction);
    //                   }
    //                 } catch (ex) {
    //                   await session.store(await createAndSendException(prospect.id, new Error(ex.message).stack, ex.message, prospect));
    //                   await session.saveChanges();
    //                 }
    //                 // return prospect;
    //               }
    //             } catch (ex) {
    //               const error = new Exception(null, null, new Error(ex.message).stack, ex.message, args);
    //               await session.store(error);
    //               await session.saveChanges();
    //               throw new Error('There was an error. Please try again. The Tech team has been notified.');
    //             }

    //             resolve({
    //               transId: transaction.transId,
    //               authCode: transaction.authCode,
    //             });
    //           } else {
    //             console.log('02: Failed Transaction.');
    //             if (response.getTransactionResponse().getErrors() != null) {
    //               reject(
    //                 response
    //                   .getTransactionResponse()
    //                   .getErrors()
    //                   .getError()[0]
    //                   .getErrorText(),
    //               );

    //               // throw new Exception(
    //               //   response
    //               //     .getTransactionResponse()
    //               //     .getErrors()
    //               //     .getError()[0]
    //               //     .getErrorText()
    //               // );
    //               console.log(
    //                 'Error Code: ' +
    //                   response
    //                     .getTransactionResponse()
    //                     .getErrors()
    //                     .getError()[0]
    //                     .getErrorCode(),
    //               );
    //               console.log(
    //                 'Error message: ' +
    //                   response
    //                     .getTransactionResponse()
    //                     .getErrors()
    //                     .getError()[0]
    //                     .getErrorText(),
    //               );
    //             } else reject('Payment Transaction Failed.');
    //           }
    //         } else {
    //           console.log('03: Failed Transaction. ');
    //           if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {
    //             console.log('03.1: Failed Transaction. ');
    //             reject(
    //               response
    //                 .getTransactionResponse()
    //                 .getErrors()
    //                 .getError()[0]
    //                 .getErrorText(),
    //             );

    //             console.log(
    //               'Error Code: ' +
    //                 response
    //                   .getTransactionResponse()
    //                   .getErrors()
    //                   .getError()[0]
    //                   .getErrorCode(),
    //             );
    //             console.log(
    //               'Error message: ' +
    //                 response
    //                   .getTransactionResponse()
    //                   .getErrors()
    //                   .getError()[0]
    //                   .getErrorText(),
    //             );
    //             // reject(returnResult.message);
    //           } else {
    //             console.log('03.2: Failed Transaction. ');
    //             reject(
    //               response
    //                 .getMessages()
    //                 .getMessage()[0]
    //                 .getText(),
    //             );

    //             returnResult = {
    //               success: false,
    //               message: response
    //                 .getMessages()
    //                 .getMessage()[0]
    //                 .getText(),
    //             };
    //             console.log(
    //               'Error Code: ' +
    //                 response
    //                   .getMessages()
    //                   .getMessage()[0]
    //                   .getCode(),
    //             );
    //             console.log(
    //               'Error message: ' +
    //                 response
    //                   .getMessages()
    //                   .getMessage()[0]
    //                   .getText(),
    //             );
    //             // reject(returnResult.message);
    //           }
    //         }
    //       } else {
    //         console.log('04: Null Response.');
    //         reject('Null Response.');
    //         throw new Exception('Unknown Response. Please try again.');
    //       }
    //     });
    //   });

    //   console.log('********** Result >>>> ', result);
    //   return result;
    // } catch (ex) {
    //   const argsMasked = cloneDeep(args);
    //   const regex = /\d(?=\d{4})/gm;
    //   argsMasked.card.number = argsMasked.card.number.replace(regex, '*');

    //   const createRequestMasked = cloneDeep(createRequest);
    //   createRequestMasked.transactionRequest.payment.creditCard.cardNumber = createRequestMasked.transactionRequest.payment.creditCard.cardNumber.replace(
    //     regex,
    //     '*',
    //   );

    //   await session.store(
    //     await createAndSendException('Authorize.Net Merchant Error', new Error(ex.message).stack, ex.message, {
    //       argsMasked,
    //       endpoint: AuthorizeNet.Constants.endpoint.production,
    //       response: ctrl.getResponse(),
    //       merchantAuthenticationType,
    //       orderDetails,
    //       billTo,
    //       lineItemList,
    //       transactionSettingList,
    //       createRequestMasked,
    //     }),
    //   );

    //   await session.saveChanges();
    //   throw new Error('There was an error. Please try again. The Tech team has been notified.');
    // }
  },

  async uploadMexicoCerts(_parent, { file }, { session, req }: Context): Promise<IBooleanResponse> {
    const { createReadStream, filename } = await file;
    const filePath = path.resolve(`./src/${filename}`);
    const store = await initializeStore();
    const stream = createReadStream();

    await storeUpload({ stream, filename: filePath });

    var getLocationsFromExcel = function(sheet: string, filename: string): Promise<any[]> {
      return new Promise((resolve, reject) => {
        node_xj(
          {
            input: filePath,
            output: null,
            sheet: sheet
          },
          async function(err, result: any[]) {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });
    };

    const emailsFromExcel = await getLocationsFromExcel('Sheet1', filePath);
    const emails = uniq(emailsFromExcel.reduce((prev, current) => prev.concat(current['Email']), new Array<string>()));
    const customers = await session
      .query<Prospect>({ collection: 'Prospects' })
      .whereIn('deliveryEndpoint', emails)
      .whereEquals('deliveryMethod', 'Email')
      .whereEquals('certificate.id', 'certificates/35-A')
      .all();
    const userIds = uniq(customers.reduce((prev, current) => prev.concat(current['userId']), new Array<string>()));
    const users = await session
      .query<User>({ indexName: 'Users' })
      .whereIn('id', userIds)
      .all();

    if (customers.length === 0 || users.length === 0) {
      return { success: false };
    }

    let orders = [];
    let commissions = [];
    let order: IOrder = null;

    for (const customer of customers) {
      //Create Order
      let affiliate: IUser = find<User>(users, user => user.id === customer.userId);
      const customerReference = new UserReference(customer.id, customer.deliveryEndpoint, customer.firstName, customer.lastName);
      const affiliateReference = new UserReference(affiliate.id, affiliate.email, affiliate.firstName, affiliate.lastName);
      order = new Order(
        null,
        null,
        null,
        MEXICO_AMOUNT,
        customerReference,
        affiliateReference,
        {
          id: 'domains/1-A',
          tld: 'mytripvalet.com'
        },
        null,
        null,
        []
      );
      order.isRevenueShare = false;
      orders.push(order);
      //Create commission
      const commission = new Commission(
        DateTime.fromJSDate(getNextDayOfWeek(moment().toDate(), 5, 0)).toJSDate(), // Friday Day Of Week
        COMMISSION_FEE,
        'Pending',
        customerReference,
        affiliateReference,
        null,
        new OrderReference(order.id, order.products, order.totalAmount),
        null,
        new CommissionRevenueShare(false, null)
      );
      commission.createdAt = DateTime.fromMillis(new Date().getTime()).toJSDate();
      commission.updatedAt = moment().toDate();
      commissions.push(commission);
    }

    const tryBulkUpdate = store.bulkInsert();
    for (const order of orders) {
      await tryBulkUpdate.store(order, order.id);
    }
    for (const commission of commissions) {
      await tryBulkUpdate.store(commission, commission.id);
    }
    await tryBulkUpdate.finish();
    //Delete the csv file
    fs.unlink(filePath, err => {
      if (err) {
        console.error(err);
      }
    });
    return { success: true };
  }
};
