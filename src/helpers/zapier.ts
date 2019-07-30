import * as bcrypt from 'bcryptjs';
import { IDocumentSession } from 'ravendb';
import * as querystring from 'querystring';
import * as moment from 'moment';
import axios from 'axios';
import { User, StripeData, Address, UserCrypto, UserStripeSubscription, Sponsor, Ancestry } from '../db/models/User';
import { Exception } from '../db/models/Exception';
import { ClickFunnelPurchase, IClickFunnelPurchase } from '../db/models/ClickFunnelPurchase';
import {
  sendTripValetIncentivesWelcome,
  createAndSendException,
  capitalizeEachFirstLetter,
  getNowUtc,
  sendBitcoinTransactionAlert,
  sendTripValetWelcome,
  getValidUsername,
} from '../utils';
import { find, dropWhile, uniq, some, filter } from 'lodash';
import { getSubscription, getPlan, getProduct } from './stripe';
import { IProduct } from '../interfaces/product';
import { IClickFunnelsRootZapierObject, Product } from '../interfaces/zapier';
import { v1, v4 } from 'uuid';
import { DumpBucket } from '../db/models/DumpBucket';
import { UserSubscription } from '../db/models/UserSubscription';
import { IUser } from '../interfaces/users';
import Roles from '../roles';
import { sorCreateMember, ISorCreateMemberRequest, SorClubs, sorTransferMemberFromPlusToViP } from './sor';
import { IApiCredentials } from '../interfaces/sor';
import { stringify } from 'qs';
import { appendUserIdToAncestors } from './user';
import { generate } from 'shortid';

export async function processZapier(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const inbound = new DumpBucket(null, 'processZapier', {
      location: {
        message: 'Inbound Zapier, check data format',
        function: 'zapier.ts > processZapier()',
      },
      data,
    });
    await session.store(inbound);
    await session.saveChanges();

    const parsedData = await parseClickFunnelsZap(data, session);

    if (
      (await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('email', parsedData.contact.email.trim().toLowerCase())
        .count()) === 0
    ) {
      let zappedProducts: IZappedProductSummary[] = [];
      try {
        for (let product of parsedData.products) {
          zappedProducts.push({ name: product.name, productId: product.id, planId: product.stripe_plan });
        }

        zap = new ClickFunnelPurchase(null, null, { data, zappedProducts, parsedData });
        await session.store(zap);
        await session.saveChanges();
      } catch (ex) {
        await session.store(
          await createAndSendException(
            parsedData.subscription_id,
            new Error(ex.message).stack,
            ex.message,
            {
              location: {
                message: ex.message,
                function: 'zapier.ts > processZapier() > for (let product of parsedData.products)',
              },
              products: parsedData.products,
              parsedData,
            },
            true,
          ),
        );
        await session.saveChanges();
      }

      if (parsedData.status === 'paid') {
        let customerId: string;
        try {
          const subscription = await getSubscription(parsedData.subscription_id);
          if (subscription) {
            customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
          }
        } catch (ex) {
          await session.store(
            await createAndSendException(parsedData.subscription_id, new Error(ex.message).stack, ex.message, parsedData, true),
          );
          await session.saveChanges();
        }

        const ourProducts = await session.query<IProduct>({ collection: 'Products' }).all();

        let products: IProduct[] = [];
        let roles: string[] = [];
        let planId: string[] = [];
        let memberTekProperty: string[] = [];

        for (let zappedProduct of zappedProducts) {
          const ourProduct = <IProduct>find(ourProducts, ourProduct => {
            return ourProduct.plan.id === zappedProduct.planId;
          });
          if (!ourProduct) {
            await session.store(
              await createAndSendException(
                parsedData.subscription_id,
                new Error('Our Product Not Found').stack,
                `${zappedProduct.planId} Not Found`,
                {
                  location: {
                    message: `"${zappedProduct.name}" > ${zappedProduct.productId} > ${zappedProduct.planId} : Not Found`,
                    function: 'zapier.ts > processZapier() > for (let product of zappedProducts)',
                  },
                  parsedData,
                },
                true,
              ),
            );
            await session.saveChanges();
          } else {
            products.push(ourProduct);
            roles = uniq(roles.concat(ourProduct.roles));
            memberTekProperty = uniq(memberTekProperty.concat(ourProduct.sorAccount));
            planId = uniq(planId.concat(zappedProduct.planId));
          }
        }

        const stripe = new StripeData(parsedData.subscription_id, customerId);
        const address = new Address(
          capitalizeEachFirstLetter(parsedData.contact.address),
          capitalizeEachFirstLetter(parsedData.contact.city),
          capitalizeEachFirstLetter(parsedData.contact.state),
          parsedData.contact.zip,
          capitalizeEachFirstLetter(parsedData.contact.country),
        );

        let user: User = await session
          .query<User>({ collection: 'Users' })
          .whereEquals('email', parsedData.contact.email.trim().toLowerCase())
          .firstOrNull();

        const password = parsedData.contact.vat_number.trim();

        if (!user) {
          // const cryptPassword = await bcrypt.hash(password, 10);

          const newUser = new User(
            null,
            v1(),
            capitalizeEachFirstLetter(data.contact.first_name),
            capitalizeEachFirstLetter(parsedData.contact.last_name),
            `${parsedData.contact.first_name.trim()}${parsedData.contact.last_name.trim()}`.replace(/\s/g, ''),
            parsedData.contact.email.trim().toLowerCase(),
            password,
            true,
            [],
            [],
            null,
            true,
            parsedData.contact.phone.trim(),
            roles,
            [],
            stripe,
            address,
          );
          await session.store(newUser);
          // newUser.sponsor = new Sponsor(sponsor.id, sponsor.email, sponsor.firstName, sponsor.lastName);
          newUser.ancestry = new Ancestry(1);
          zap.userId = newUser.id;

          await sendTripValetIncentivesWelcome(newUser, password, session);
          await sendTripValetWelcome(newUser, password, session);
        } else if (
          user &&
          (user.coinMD ||
            some(user.roles, role => {
              return role === 'CoinMD Member';
            }))
        ) {
          // This is an existing CoinMD Person that would get a welcome email and add them to SOR
          user = Object.assign(user, {
            active: true,
            stripe,
            address,
            password,
            roles: uniq(user.roles.concat(roles)),
            updatedAt: getNowUtc(),
          });
          zap.userId = user.id;
          await sendTripValetIncentivesWelcome(user, password, session);
          await sendTripValetWelcome(user, password, session);
        } else {
          // This is an existing Non-CoinMD Person that would only get a welcome email if they upgraded to TVI
          const filteredProducts: IProduct[] = filter(products, (product: IProduct) => {
            return (
              product.name === 'TVPlusMember - TVI-PLUS' ||
              product.name === 'TVVIPMember - TVI-PRO' ||
              product.name === 'TVPlusMember - TVI-PRO' ||
              product.name === 'TripValetVIPUpgrade'
            );
          });

          if (filteredProducts && filteredProducts.length) {
            for (let product of filteredProducts) {
              const productRoles = product.roles;
              user.roles = uniq(user.roles.concat(productRoles));
              switch (product.name) {
                case 'TVPlusMember - TVI-PLUS':
                  await sendTripValetIncentivesWelcome(user, password, session);
                  break;

                case 'TVVIPMember - TVI-PRO':
                  await sendTripValetIncentivesWelcome(user, password, session);
                  break;

                case 'TVPlusMember - TVI-PRO':
                  user.roles = filter(user.roles, role => {
                    return role !== Roles.TVPlus;
                  });

                  const transferToVip = new DumpBucket(null, 'processZapier > case "TVPlusMember - TVI-PRO"', {
                    location: {
                      message: 'Inbound Zapier, check data format',
                      function: 'zapier.ts > processZapier()',
                    },
                    data,
                  });
                  await session.store(transferToVip);
                  await session.saveChanges();

                  // await sorTransferMemberFromPlusToViP(user.id);
                  await sendTripValetIncentivesWelcome(user, password, session);
                  break;

                case 'TripValetVIPUpgrade':
                  user.roles = filter(user.roles, role => {
                    return role !== Roles.TVPlus;
                  });

                  const transferToVipUpgrade = new DumpBucket(null, 'processZapier > case "TripValetVIPUpgrade"', {
                    location: {
                      message: 'Inbound Zapier, check data format',
                      function: 'zapier.ts > processZapier()',
                    },
                    data,
                  });
                  await session.store(transferToVipUpgrade);
                  await session.saveChanges();

                  // await sorTransferMemberFromPlusToViP(user.id);
                  // await sendTripValetWelcome(user, password);
                  break;

                default:
                  break;
              }
            }
          }

          user = Object.assign(user, {
            active: true,
            stripe,
            address,
            password,
            roles: uniq(user.roles.concat(roles)),
            updatedAt: getNowUtc(),
          });
          zap.userId = user.id;

          await sendTripValetIncentivesWelcome(user, password, session);
          await sendTripValetWelcome(user, password, session);
        }
      }

      await session.saveChanges();

      return zap;
    } else {
      return { accepted: true };
    }
  } catch (ex) {
    await session.store(
      await createAndSendException(null, new Error(ex.message).stack, ex.message, {
        location: { message: 'Outer Try/Catch', function: 'zapier.ts > processZapier()' },
        data,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processZapierReplay(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const parsedData: any = {
      ...data,
    };

    //await parseClickFunnelsZap(data, session);

    let zappedProducts: IZappedProductSummary[] = [];
    try {
      for (let product of parsedData.products) {
        zappedProducts.push({ name: product.name, productId: product.id, planId: product.stripe_plan });
      }

      zap = new ClickFunnelPurchase(null, null, { data, zappedProducts, parsedData });
      await session.store(zap);
      await session.saveChanges();
    } catch (ex) {
      await session.store(
        await createAndSendException(parsedData.subscription_id, new Error(ex.message).stack, ex.message, {
          products: parsedData.products,
          parsedData,
        }),
      );
      await session.saveChanges();
    }

    if (parsedData.status === 'paid') {
      // Let's get the customerId as it will be needed for future use.
      let customerId: string;
      try {
        const subscription = await getSubscription(parsedData.subscription_id);
        if (subscription) {
          customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        }
      } catch (ex) {
        await session.store(await createAndSendException(parsedData.subscription_id, new Error(ex.message).stack, ex.message, parsedData));
        await session.saveChanges();
      }

      // TVMember - TVI-PLUS
      // TVMember - TVI-PRO
      // TVI - PLUS
      // TVI - VIP
      // TVI-Plus-To-Pro-Upgrade

      // TripValet Annual
      // TVI - PLUS CMD
      // TVI - PRO CMD
      // TripValet Annual - CMD

      const ourProducts = await session.query<IProduct>({ collection: 'Products' }).all();

      let roles: string[] = [];
      let planId: string = '';
      let memberTekProperty: string;

      zappedProducts.map(zappedProduct => {
        const ourProduct = <IProduct>find(ourProducts, ourProduct => {
          return ourProduct.plan.id === zappedProduct.planId;
        });
        if (!ourProduct) {
          console.log('ourProduct not found');
        } else {
          roles = uniq(roles.concat(ourProduct.roles));
          memberTekProperty = ourProduct.sorAccount;
          planId = zappedProduct.planId;
        }
      });

      const tvMemberPlus = find(parsedData.products, { name: 'TVPlusMember - TVI-PLUS' });
      const tvMemberVip = find(parsedData.products, { name: 'TVVIPMember - TVI-PRO' });
      const newTVIPlus = find(parsedData.products, { name: 'TVI - PLUS' });
      const newTVIPro = find(parsedData.products, { name: 'TVI - PRO' });

      const newTVAnnual = find(parsedData.products, { name: 'TripValet Annual' });
      const newTVIPlusCMD = find(parsedData.products, { name: 'TVI - PLUS CMD' });
      const newTVIProCMD = find(parsedData.products, { name: 'TVI - PRO CMD' });
      const newTVAnnualCMD = find(parsedData.products, { name: 'TripValet Annual - CMD' });

      const existingTVIPlusToPro = find(parsedData.products, { name: 'TVPlusMember - TVI-PRO' });

      //PRO
      if (tvMemberVip || newTVIPro || newTVIProCMD || newTVAnnual || newTVAnnualCMD) {
        memberTekProperty = 'TripValet Subscriber 297';
        roles = ['TVI PRO', 'TV VIP'];
        if (tvMemberVip) planId = tvMemberVip.stripe_plan;
        else if (newTVIPro) planId = newTVIPro.stripe_plan;
        else if (newTVIProCMD) planId = newTVIProCMD.stripe_plan;
        else if (newTVAnnual) planId = newTVAnnual.stripe_plan;
        else if (newTVAnnualCMD) planId = newTVAnnualCMD.stripe_plan;
        //PLUS
      } else if (tvMemberPlus || newTVIPlus || newTVIPlusCMD) {
        memberTekProperty = 'TripValet Subscriber';
        roles = ['TVI PLUS', 'TV PLUS'];
        if (tvMemberPlus) planId = tvMemberPlus.stripe_plan;
        else if (newTVIPlus) planId = newTVIPlus.stripe_plan;
        else if (newTVIPlusCMD) planId = newTVIPlusCMD.stripe_plan;
        // PLUS to PRO Upgrade
      } else if (existingTVIPlusToPro) {
        memberTekProperty = 'TripValet Subscriber 297';
        roles = ['TVI PRO', 'TV VIP'];
        planId = existingTVIPlusToPro.stripe_plan;
        // Should never get here
      } else {
        memberTekProperty = 'TripValet Subscriber';
        roles = ['TVI PLUS', 'TV PLUS'];
        await session.store(
          await createAndSendException(
            null,
            new Error().stack,
            'We did not find a Product by Name in Parsed Zap',
            { tvMemberPlus, tvMemberVip, newTVIPlus, newTVIPro, existingTVIPlusToPro, parsedData },
            true,
          ),
        );
        await session.saveChanges();
      }

      const stripe = new StripeData(parsedData.subscription_id, customerId);
      const address = new Address(
        capitalizeEachFirstLetter(parsedData.contact.address),
        capitalizeEachFirstLetter(parsedData.contact.city),
        capitalizeEachFirstLetter(parsedData.contact.state),
        parsedData.contact.zip,
        capitalizeEachFirstLetter(parsedData.contact.country),
      );

      // Check to see if Already in DB
      let user: User = await session
        .query<User>({ collection: 'Users' })
        .whereEquals('email', parsedData.contact.email.trim().toLowerCase())
        .firstOrNull();

      // Trim the spaces around the password which ClickFunnels passes as vat_number
      const password = parsedData.contact.vat_number.trim();

      if (!user) {
        const cryptPassword = await bcrypt.hash(password, 10);

        const newUser = new User(
          null,
          v1(),
          capitalizeEachFirstLetter(data.contact.first_name),
          capitalizeEachFirstLetter(parsedData.contact.last_name),
          `${parsedData.contact.first_name.trim()}${parsedData.contact.last_name.trim()}`.replace(/\s/g, ''),
          parsedData.contact.email.trim().toLowerCase(),
          cryptPassword,
          true,
          [],
          [],
          null,
          true,
          parsedData.contact.phone.trim(),
          roles,
          [],
          stripe,
          address,
        );
        newUser.createdAt = getNowUtc();
        newUser.updatedAt = getNowUtc();
        await session.store(newUser);
        // newUser.sponsor = new Sponsor(sponsor.id, sponsor.email, sponsor.firstName, sponsor.lastName);
        newUser.ancestry = new Ancestry(1);
        zap.userId = newUser.id;
        const sorUser = {
          FirstName: newUser.firstName,
          LastName: newUser.lastName,
          Street: address.address,
          City: address.city,
          State: address.state,
          PostalCode: address.zip,
          Country: address.country,
          Telephone: newUser.phone,
          Email: newUser.email,
          Password: password,
          OrderNumber: parsedData.id,
          ContactPassword: password,
          Status: parsedData.status,
          Product: memberTekProperty,
          Id: parsedData.id,
          SubscriptionId: stripe.subscriptionId,
        };
        await sendWelcomeAndRegisterSor(session, newUser, password, address, parsedData, sorUser);
      } else if (existingTVIPlusToPro) {
        // We need to update TVI Roles to PRO and TV to VIP
        let newRoles: string[] = [];
        try {
          // Upgrade them in MemberTek
          const result = await axios.post(
            'https://api.tripvalet.com/valetupgrade.php',
            querystring.stringify({
              FirstName: user.firstName,
              LastName: user.lastName,
              Email: user.email,
            }),
          );

          newRoles = [
            ...dropWhile(user.roles, r => {
              return r === 'TVI PLUS' || r === 'TV PLUS';
            }),
            ...['TVI PRO', 'TV VIP'],
          ];

          user = Object.assign(user, {
            active: true,
            stripe,
            address,
            roles: newRoles,
            updatedAt: getNowUtc(),
          });
          zap.userId = user.id;

          if (!result.data || (result.data && result.data[0] !== '1')) {
            await session.store(
              await createAndSendException(
                user.id,
                new Error(result.data ? result.data : 'Invalid Attempt to Transfer SOR Membership in MemberTEK').stack,
                result.data,
                { user, newRoles, stripe, address, parsedData, data },
                true,
              ),
            );
            await session.saveChanges();
          }
        } catch (ex) {
          await session.store(
            await createAndSendException(
              user.id,
              new Error(ex.message).stack,
              ex.message,
              { user, newRoles, stripe, address, parsedData, data },
              true,
            ),
          );
          await session.saveChanges();
        }
      } else {
        user = Object.assign(user, {
          active: true,
          stripe,
          address,
          updatedAt: getNowUtc(),
          password: await bcrypt.hash(password, 10),
          roles: uniq(user.roles.concat(roles)),
        });
        zap.userId = user.id;

        if (user && user.coinMD) {
          const sorUser = {
            FirstName: user.firstName,
            LastName: user.lastName,
            Street: address.address,
            City: address.city,
            State: address.state,
            PostalCode: address.zip,
            Country: address.country,
            Telephone: user.phone,
            Email: user.email,
            Password: password,
            OrderNumber: parsedData.id,
            ContactPassword: password,
            Status: parsedData.status,
            Product: memberTekProperty,
            Id: parsedData.id,
            SubscriptionId: stripe.subscriptionId,
          };
          await sendWelcomeAndRegisterSor(session, user, password, address, parsedData, sorUser);
        } else {
          await sendTripValetIncentivesWelcome(user, password, session);
        }
      }
    }

    await session.saveChanges();

    // Send Welcome Email
    return zap;
  } catch (ex) {
    await session.store(
      await createAndSendException(null, new Error(ex.message).stack, ex.message, {
        location: { message: 'Outer Try/Catch', function: 'zapier.ts > processZapier()' },
        data,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

interface IZappedProductSummary {
  name: string;
  productId: string;
  planId: string;
}

export async function processTripValetZapier(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const inbound = new DumpBucket(null, 'processTripValetZapier', {
      location: {
        message: 'Inbound Zapier, check data format',
        function: 'zapier.ts > processTripValetZapier()',
      },
      data,
    });
    await session.store(inbound);
    await session.saveChanges();

    const parsedData = await parseClickFunnelsZap(data, session);

    if (
      (await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('email', parsedData.contact.email.trim().toLowerCase())
        .count()) === 0
    ) {
      let zappedProducts: IZappedProductSummary[] = [];
      try {
        for (let product of parsedData.products) {
          zappedProducts.push({ name: product.name, productId: product.id, planId: product.stripe_plan });
        }

        zap = new ClickFunnelPurchase(null, null, { data, zappedProducts, parsedData });
        await session.store(zap);
        await session.saveChanges();
      } catch (ex) {
        await session.store(
          await createAndSendException(
            parsedData.subscription_id,
            new Error(ex.message).stack,
            ex.message,
            {
              location: {
                message: ex.message,
                function: 'zapier.ts > processTripValetZapier() > for (let product of parsedData.products)',
              },
              products: parsedData.products,
              parsedData,
            },
            true,
          ),
        );
        await session.saveChanges();
      }

      if (parsedData.status === 'paid') {
        let customerId: string;
        try {
          const subscription = await getSubscription(parsedData.subscription_id);
          if (subscription) {
            customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
          }
        } catch (ex) {
          await session.store(
            await createAndSendException(parsedData.subscription_id, new Error(ex.message).stack, ex.message, parsedData, true),
          );
          await session.saveChanges();
        }

        const ourProducts = await session.query<IProduct>({ collection: 'Products' }).all();

        let products: IProduct[] = [];
        let roles: string[] = [];
        let planId: string[] = [];
        let memberTekProperty: string[] = [];

        for (let zappedProduct of zappedProducts) {
          const ourProduct = <IProduct>find(ourProducts, ourProduct => {
            return ourProduct.plan.id === zappedProduct.planId;
          });
          if (!ourProduct) {
            await session.store(
              await createAndSendException(
                parsedData.subscription_id,
                new Error('Our Product Not Found').stack,
                `${zappedProduct.planId} Not Found`,
                {
                  location: {
                    message: `"${zappedProduct.name}" > ${zappedProduct.productId} > ${zappedProduct.planId} : Not Found`,
                    function: 'zapier.ts > processTripValetZapier() > for (let product of zappedProducts)',
                  },
                  parsedData,
                },
                true,
              ),
            );
            await session.saveChanges();
          } else {
            products.push(ourProduct);
            roles = uniq(roles.concat(ourProduct.roles));
            memberTekProperty = uniq(memberTekProperty.concat(ourProduct.sorAccount));
            planId = uniq(planId.concat(zappedProduct.planId));
          }
        }

        const stripe = new StripeData(parsedData.subscription_id, customerId);
        const address = new Address(
          capitalizeEachFirstLetter(parsedData.contact.address),
          capitalizeEachFirstLetter(parsedData.contact.city),
          capitalizeEachFirstLetter(parsedData.contact.state),
          parsedData.contact.zip,
          capitalizeEachFirstLetter(parsedData.contact.country),
        );

        let user: User = await session
          .query<User>({ collection: 'Users' })
          .whereEquals('email', parsedData.contact.email.trim().toLowerCase())
          .firstOrNull();

        const password = parsedData.contact.vat_number.trim();

        if (!user) {
          // const cryptPassword = await bcrypt.hash(password, 10);
          const newUser = new User(
            null,
            v1(),
            capitalizeEachFirstLetter(data.contact.first_name),
            capitalizeEachFirstLetter(parsedData.contact.last_name),
            `${parsedData.contact.first_name.trim()}${parsedData.contact.last_name.trim()}`.replace(/\s/g, ''),
            parsedData.contact.email.trim().toLowerCase(),
            password,
            true,
            [],
            [],
            null,
            true,
            parsedData.contact.phone.trim(),
            roles,
            [],
            stripe,
            address,
          );
          newUser.createdAt = getNowUtc();
          newUser.updatedAt = getNowUtc();
          await session.store(newUser);
          // newUser.sponsor = new Sponsor(sponsor.id, sponsor.email, sponsor.firstName, sponsor.lastName);
          newUser.ancestry = new Ancestry(1);

          zap.userId = newUser.id;
          await sendTripValetWelcome(newUser, password, session); //sendWelcomeAndRegisterSor(session, newUser, password, address, parsedData, sorUser);
        } else if (
          user &&
          (user.coinMD ||
            some(user.roles, role => {
              return role === 'CoinMD Member';
            }))
        ) {
          // This is an existing CoinMD Person that would get a welcome email and add them to SOR
          user = Object.assign(user, {
            active: true,
            stripe,
            address,
            password,
            updatedAt: getNowUtc(),
            roles: uniq(user.roles.concat(roles)),
          });
          zap.userId = user.id;
          await sendTripValetWelcome(user, password, session);
        } else {
          // This is an existing Non-CoinMD Person that would only get a welcome email if they upgraded to TVI
          const filteredProducts: IProduct[] = filter(products, (product: IProduct) => {
            return (
              product.name === 'TVPlusMember - TVI-PLUS' ||
              product.name === 'TVVIPMember - TVI-PRO' ||
              product.name === 'TVPlusMember - TVI-PRO' ||
              product.name === 'TripValetVIPUpgrade'
            );
          });

          if (filteredProducts && filteredProducts.length) {
            for (let product of filteredProducts) {
              const productRoles = product.roles;
              user.roles = uniq(user.roles.concat(productRoles));
              switch (product.name) {
                case 'TVPlusMember - TVI-PLUS':
                  await sendTripValetIncentivesWelcome(user, password, session);
                  break;

                case 'TVVIPMember - TVI-PRO':
                  await sendTripValetIncentivesWelcome(user, password, session);
                  break;

                case 'TVPlusMember - TVI-PRO':
                  user.roles = filter(user.roles, role => {
                    return role !== Roles.TVPlus;
                  });

                  const transferToVip = new DumpBucket(null, 'processTripValetZapier > case "TVPlusMember - TVI-PRO"', {
                    location: {
                      message: 'Inbound Zapier, check data format',
                      function: 'zapier.ts > processTripValetZapier()',
                    },
                    data,
                  });
                  await session.store(transferToVip);
                  await session.saveChanges();

                  // await sorTransferMemberFromPlusToViP(user.id);
                  await sendTripValetIncentivesWelcome(user, password, session);
                  break;

                case 'TripValetVIPUpgrade':
                  user.roles = filter(user.roles, role => {
                    return role !== Roles.TVPlus;
                  });

                  const transferToVipUpgrade = new DumpBucket(null, 'processTripValetZapier > case "TripValetVIPUpgrade"', {
                    location: {
                      message: 'Inbound Zapier, check data format',
                      function: 'zapier.ts > processTripValetZapier()',
                    },
                    data,
                  });
                  await session.store(transferToVipUpgrade);
                  await session.saveChanges();

                  // await sorTransferMemberFromPlusToViP(user.id);
                  // await sendTripValetWelcome(user, password);
                  break;

                default:
                  break;
              }
            }
          }

          user = Object.assign(user, {
            active: true,
            stripe,
            address,
            password,
            roles: uniq(user.roles.concat(roles)),
            updatedAt: getNowUtc(),
          });
          zap.userId = user.id;
        }
      }

      await session.saveChanges();

      return zap;
    } else {
      return { accepted: true };
    }
  } catch (ex) {
    await session.store(
      await createAndSendException(null, new Error(ex.message).stack, ex.message, {
        location: { message: 'Outer Try/Catch', function: 'zapier.ts > processTripValetZapier()' },
        data,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processTripValetFailedPaymentZapier(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const inbound = new DumpBucket(null, 'processTripValetFailedPaymentZapier', {
      location: {
        message: 'Inbound Zapier, check data format',
        function: 'zapier.ts > processTripValetFailedPaymentZapier()',
      },
      data,
    });
    await session.store(inbound);
    await session.saveChanges();

    const parsedData = await parseClickFunnelsZap(data, session);

    try {
      zap = new ClickFunnelPurchase(null, null, { data, parsedData });
      await session.store(zap);
      await session.saveChanges();
    } catch (ex) {
      await session.store(await createAndSendException(parsedData.subscription_id, new Error(ex.message).stack, ex.message, parsedData));
      await session.saveChanges();
    }

    return zap;
  } catch (ex) {
    await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, data));
    await session.saveChanges();
    return null;
  }
}

export async function processBtcZapier(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const inbound = new DumpBucket(null, 'processBtcZapier', {
      location: {
        message: 'Inbound Zapier, check data format',
        function: 'zapier.ts > processBtcZapier()',
      },
      data,
    });
    await session.store(inbound);
    await session.saveChanges();

    const parsedData = await parseClickFunnelsZap(data, session);
    zap = new ClickFunnelPurchase(null, null, { data, parsedData });
    await session.store(zap);

    let user: User = await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('email', parsedData.contact_profile.email.trim().toLowerCase())
      .firstOrNull();

    const password = parsedData.contact_profile.vat_number.trim();
    let newUser: IUser = null;
    if (!user) {
      // const cryptPassword = await bcrypt.hash(password, 10);
      newUser = new User(
        null,
        v1(),
        capitalizeEachFirstLetter(parsedData.contact_profile.first_name),
        capitalizeEachFirstLetter(parsedData.contact_profile.last_name),
        `${parsedData.contact_profile.first_name.trim()}${parsedData.contact_profile.last_name.trim()}`.replace(/\s/g, ''),
        parsedData.contact_profile.email.trim().toLowerCase(),
        password,
        false,
        [],
        [],
        null,
        true,
        parsedData.contact_profile.phone.trim(),
        [],
        null,
        null,
      );
      newUser.crypto = new UserCrypto('Bitcoin', 0, 'Not Provided');
      zap.userId = newUser.id;
      await session.store(newUser);
    } else {
      zap.userId = user.id;
    }

    await session.saveChanges();
    return user ? user.id : 'OK';
  } catch (ex) {
    await session.store(
      await createAndSendException(null, new Error(ex.message).stack, ex.message, {
        location: {
          message: 'Outer Try/Catch',
          function: 'zapier.ts > processBtcZapier()',
        },
        data,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processBtcTransactionZapier(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const inbound = new DumpBucket(null, 'processBtcTransactionZapier', {
      location: {
        message: 'Inbound Zapier, check data format',
        function: 'zapier.ts > processBtcTransactionZapier()',
      },
      data,
    });
    await session.store(inbound);
    await session.saveChanges();

    const parsedData = await parseClickFunnelsZap(data, session);
    zap = new ClickFunnelPurchase(null, null, { data, parsedData });
    await session.store(zap);

    const user = await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('email', parsedData.contact_profile.email.trim().toLowerCase())
      .firstOrNull();

    if (user) {
      let usd: number;
      if (parsedData.memberlevel && parsedData.transactionid) {
        switch (parsedData.memberlevel) {
          case 'Annual - $997/year':
            user.roles = uniq(user.roles.concat([Roles.TVIPro, Roles.TVVip]));
            usd = 997;
            break;
          case 'Pro - $97/month':
            user.roles = uniq(user.roles.concat([Roles.TVIPro, Roles.TVVip]));
            usd = 97;
            break;
          default:
            user.roles = uniq(user.roles.concat([Roles.TVIPlus, Roles.TVPlus]));
            usd = 47;
            break;
        }

        const usdToBtcResponse = await axios.get(`https://blockchain.info/tobtc?currency=USD&value=${usd}`);
        user.crypto = new UserCrypto('Bitcoin', usdToBtcResponse.data, parsedData.TransactionID, parsedData.WalletID);
        zap.userId = user.id;
        await session.saveChanges();
        await sendBitcoinTransactionAlert(user, parsedData.memberlevel);
      } else {
        await session.store(
          await createAndSendException(null, new Error('parsedData.memberlevel not set').stack, 'Skip Check - Investigate', {
            location: {
              message: 'if (parsedData.memberlevel && parsedData.transactionid) {}',
              function: 'zapier.ts > processBtcTransactionZapier()',
            },
            data,
          }),
        );
        await session.saveChanges();
      }
      return { email: user.email, transactionId: parsedData.transactionid };
    }

    await session.saveChanges();
    return { data, parsedData };
  } catch (ex) {
    await session.store(
      await createAndSendException(null, new Error(ex.message).stack, ex.message, {
        location: {
          message: 'Outer Try/Catch',
          function: 'zapier.ts > processBtcTransactionZapier()',
        },
        data,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

export async function processStepOneOfTwo(session: IDocumentSession, data: ClickFunnelsZapier.Payload) {
  let zap: IClickFunnelPurchase;

  try {
    const inbound = new DumpBucket(null, 'processStepOneOfTwo', {
      location: {
        message: 'Inbound Zapier, check data format',
        function: 'zapier.ts > processStepOneOfTwo()',
      },
      data,
    });
    await session.store(inbound);
    await session.saveChanges();

    const parsedData = await parseClickFunnelsZap(data, session);
    const user = new User(
      null,
      v4(),
      parsedData.contact_profile.first_name,
      parsedData.contact_profile.last_name,
      await getValidUsername(session, `${parsedData.contact_profile.first_name}${parsedData.contact_profile.last_name}`),
      parsedData.contact_profile.email,
      parsedData.contact_profile.vat_number ? parsedData.contact_profile.vat_number : generate(),
      false,
      [],
      [],
      null,
      null,
      parsedData.contact_profile.phone,
      ['Affiliate'],
      [],
      null,
      new Address(
        parsedData.contact_profile.shipping_address,
        parsedData.contact_profile.shipping_city,
        parsedData.contact_profile.shipping_state,
        parsedData.contact_profile.shipping_zip,
        parsedData.contact_profile.country,
      ),
      null,
    );

    let existingUser = await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('email', parsedData.contact_profile.email.toLowerCase())
      .firstOrNull();

    const { id, roles, ...rest } = user;
    if (existingUser) {
      existingUser = Object.assign(existingUser, { ...rest });
    } else {
      await session.store(user);
    }
    await session.saveChanges();

    zap = new ClickFunnelPurchase(null, null, { data, parsedData });
    await session.store(zap);

    // let user: User = await session
    //   .query<User>({ indexName: 'Users' })
    //   .whereEquals('email', parsedData.contact_profile.email.trim().toLowerCase())
    //   .firstOrNull();

    // const password = parsedData.contact_profile.vat_number.trim();
    // let newUser: IUser = null;
    // if (!user) {
    //   // const cryptPassword = await bcrypt.hash(password, 10);
    //   newUser = new User(
    //     null,
    //     v1(),
    //     capitalizeEachFirstLetter(parsedData.contact_profile.first_name),
    //     capitalizeEachFirstLetter(parsedData.contact_profile.last_name),
    //     `${parsedData.contact_profile.first_name.trim()}${parsedData.contact_profile.last_name.trim()}`.replace(/\s/g, ''),
    //     parsedData.contact_profile.email.trim().toLowerCase(),
    //     password,
    //     false,
    //     [],
    //     [],
    //     null,
    //     true,
    //     parsedData.contact_profile.phone.trim(),
    //     [],
    //     null,
    //     null
    //   );
    //   newUser.crypto = new UserCrypto('Bitcoin', 0, 'Not Provided');
    //   zap.userId = newUser.id;
    //   await session.store(newUser);
    // } else {
    //   zap.userId = user.id;
    // }

    await session.saveChanges();
    return 'OK';
  } catch (ex) {
    await session.store(
      await createAndSendException(null, new Error(ex.message).stack, ex.message, {
        location: {
          message: 'Outer Try/Catch',
          function: 'zapier.ts > processBtcZapier()',
        },
        data,
      }),
    );
    await session.saveChanges();
    return null;
  }
}

async function sendWelcomeAndRegisterSor(session, user, password, address, parsedData, sorUser) {
  await sendTripValetIncentivesWelcome(user, password, session);
  if (sorUser) {
    try {
      const result = await axios.post('https://api.tripvalet.com/valetregister-v2.php', querystring.stringify(sorUser));
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, { user, address, parsedData });
      await session.store(error);
    }
  }
}
async function sendWelcomeAndCreateSorAccount(session, apiCredentials: IApiCredentials, user: IUser, sorUser: ISorCreateMemberRequest) {
  await sendTripValetIncentivesWelcome(user, user.password, session);

  if (sorUser) {
    try {
      return await sorCreateMember(session, apiCredentials, user);
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, { apiCredentials, user, sorUser });
      await session.store(error);
    }
  }
}
async function parseClickFunnelsZap(data: any, session: IDocumentSession) {
  let products: any = [];
  let parsedData: any;
  try {
    if (data.products) {
      products = JSON.parse(
        data.products
          .replace(new RegExp("u'", 'g'), '"')
          .replace(new RegExp("':", 'g'), '":')
          .replace(new RegExp("',", 'g'), '",')
          .replace(new RegExp('False', 'g'), 'false')
          .replace(new RegExp('True', 'g'), 'true')
          .replace(new RegExp(': None', 'g'), ': "None"')
          .replace(new RegExp("'],", 'g'), '"],')
          .replace(new RegExp("'}", 'g'), '"}'),
      );
    }

    parsedData = {
      ...data,
      products,
    };

    return parsedData;
  } catch (ex) {
    await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, data));
    await session.saveChanges();
    return {
      ...data,
      products,
    };
  }
}

export declare namespace ClickFunnelsZapier {
  export interface Purchase {
    stripe_customer_token: string;
    taxamo_transaction_key: string;
    product_ids: string;
    payment_method_nonce: string;
  }

  export interface AdditionalInfo {
    purchase: Purchase;
    utm_campaign: string;
    utm_content: string;
    utm_term: string;
    webinar_delay: string;
    time_zone: string;
    utm_source: string;
    cf_affiliate_id: string;
    utm_medium: string;
    cf_uvid: string;
  }

  export interface ContactProfile {
    last_name: string;
    known_ltv: string;
    age_range_upper: string;
    location_general: string;
    vat_number: string;
    id: string;
    city: string;
    age_range_lower: string;
    middle_name: string;
    zip: string;
    normalized_location: string;
    state: string;
    email: string;
    cf_uvid: string;
    deduced_location: string;
    shipping_city: string;
    tags: string;
    shipping_address: string;
    unsubscribed_at: string;
    first_name: string;
    updated_at: Date;
    phone: string;
    shipping_state: string;
    address: string;
    shipping_zip: string;
    gender: string;
    age: string;
    action_score: string;
    websites: string;
    shipping_country: string;
    country: string;
    created_at: Date;
  }

  export interface Contact {
    aff_sub: string;
    last_name: string;
    ip: string;
    updated_at: Date;
    vat_number: string;
    additional_info: AdditionalInfo;
    city: string;
    first_name: string;
    zip: string;
    cart_affiliate_id: string;
    id: string;
    contact_profile: ContactProfile;
    state: string;
    page_id: string;
    email: string;
    cf_uvid: string;
    shipping_city: string;
    webinar_ext: string;
    unsubscribed_at: string;
    phone: string;
    cf_affiliate_id: string;
    shipping_state: string;
    address: string;
    webinar_at: string;
    affiliate_id: string;
    funnel_id: string;
    name: string;
    shipping_zip: string;
    country: string;
    created_at: Date;
    time_zone: string;
    shipping_country: string;
    webinar_last_time: string;
    aff_sub2: string;
    shipping_address: string;
    funnel_step_id: string;
  }

  export interface Currency {
    priority: string;
    html_entity: string;
    name: string;
    alternate_symbols: string;
    subunit_to_unit: string;
    symbol_first: string;
    symbol: string;
    thousands_separator: string;
    decimal_mark: string;
    iso_numeric: string;
    disambiguate_symbol?: any;
    smallest_denomination: string;
    iso_code: string;
    subunit: string;
    id: string;
  }

  export interface Rates {
    EUR_TO_IDR: string;
    EUR_TO_HUF: string;
    EUR_TO_PHP: string;
    EUR_TO_RUB: string;
    EUR_TO_CZK: string;
    EUR_TO_MYR: string;
    EUR_TO_ZAR: string;
    EUR_TO_PLN: string;
    EUR_TO_TRY: string;
    EUR_TO_ILS: string;
    EUR_TO_JPY: string;
    EUR_TO_KRW: string;
    EUR_TO_INR: string;
    EUR_TO_ISK: string;
    EUR_TO_RON: string;
    EUR_TO_NZD: string;
    EUR_TO_BGN: string;
    EUR_TO_BRL: string;
    EUR_TO_THB: string;
    EUR_TO_HKD: string;
    EUR_TO_MXN: string;
    EUR_TO_GBP: string;
    EUR_TO_CAD: string;
    EUR_TO_NOK: string;
    EUR_TO_HRK: string;
    EUR_TO_SGD: string;
    EUR_TO_SEK: string;
    EUR_TO_AUD: string;
    EUR_TO_USD: string;
    EUR_TO_CHF: string;
    EUR_TO_DKK: string;
    EUR_TO_CNY: string;
    EUR_TO_EUR: string;
  }

  export interface Bank {
    rates: Rates;
    rates_updated_at: Date;
    last_updated: Date;
    rounding_method?: string;
  }

  export interface OriginalAmount {
    currency: Currency;
    bank: Bank;
    fractional: string;
  }

  export interface Payload {
    stripe_customer_token: string;
    updated_at: Date;
    oap_customer_id: string;
    ctransreceipt: string;
    fulfillment_id: string;
    taxamo_amount: string;
    id: string;
    nmi_customer_vault_id: string;
    original_amount_currency: string;
    contact: Contact;
    infusionsoft_ccid: string;
    subscription_id: string;
    original_amount: OriginalAmount;
    taxamo_tax_rate: string;
    original_amount_cents: string;
    status: string;
    charge_id: string;
    payment_instrument_type: string;
    braintree_customer_id: string;
    funnel_id: string;
    created_at: Date;
    error_message: string;
    manual: string;
    fulfillment_status: string;
    payments_count: string;
    products: string;
    member_id: string;
  }

  export interface ProductCurrency {
    iso_numeric: string;
    html_entity: string;
    name: string;
    alternate_symbols: string[];
    subunit_to_unit: number;
    symbol_first: boolean;
    thousands_separator: string;
    decimal_mark: string;
    priority: number;
    disambiguate_symbol?: any;
    id: string;
    smallest_denomination: number;
    iso_code: string;
    subunit: string;
    symbol: string;
  }

  export interface Mutex {}

  export interface ProductRates {
    EUR_TO_IDR: string;
    EUR_TO_HUF: string;
    EUR_TO_PHP: string;
    EUR_TO_RUB: string;
    EUR_TO_CZK: string;
    EUR_TO_MYR: string;
    EUR_TO_ZAR: string;
    EUR_TO_PLN: string;
    EUR_TO_TRY: string;
    EUR_TO_ILS: string;
    EUR_TO_JPY: string;
    EUR_TO_KRW: string;
    EUR_TO_INR: string;
    EUR_TO_ISK: string;
    EUR_TO_RON: string;
    EUR_TO_NZD: string;
    EUR_TO_BGN: string;
    EUR_TO_BRL: string;
    EUR_TO_THB: string;
    EUR_TO_HKD: string;
    EUR_TO_MXN: string;
    EUR_TO_GBP: string;
    EUR_TO_CAD: string;
    EUR_TO_NOK: string;
    EUR_TO_HRK: string;
    EUR_TO_SGD: string;
    EUR_TO_SEK: string;
    EUR_TO_AUD: string;
    EUR_TO_USD: string;
    EUR_TO_CHF: string;
    EUR_TO_DKK: string;
    EUR_TO_CNY: string;
    EUR_TO_EUR: number;
  }

  export interface ProductBank {
    rounding_method?: any;
    last_updated: Date;
    rates_updated_at: Date;
    mutex: Mutex;
    rates: ProductRates;
  }

  export interface Amount {
    currency: ProductCurrency;
    bank: ProductBank;
    fractional: string;
  }

  export interface Products {
    billing_integration: string;
    ontraport_invoice_id?: any;
    name: string;
    bump: boolean;
    updated_at: Date;
    braintree_cancel_after_payments?: any;
    infusionsoft_subscription_id?: any;
    ontraport_unit?: any;
    braintree_plan?: any;
    thank_you_page_id: number;
    statement_descriptor: string;
    ontraport_payment_type?: any;
    stripe_cancel_after_payments: number;
    ontraport_product_id?: any;
    commissionable: boolean;
    ontraport_payment_count?: any;
    cart_product_id: string;
    created_at: Date;
    ontraport_gateway_id?: any;
    id: number;
    amount: Amount;
    stripe_plan: string;
    amount_currency: string;
    subject: string;
    infusionsoft_product_id?: any;
    html_body: string;
  }
}
