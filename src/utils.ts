import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import * as express from 'express';
import * as sgMail from '@sendgrid/mail';
import * as gravatar from 'gravatar';
import * as Stripe from 'stripe';
import { find, some } from 'lodash';
import { IDocumentStore, IDocumentSession } from 'ravendb';
import { User } from './db/models/User';
import * as UserInterfaces from './interfaces/users';
import { MailData } from '@sendgrid/helpers/classes/mail';
import axios from 'axios';
import { Exception, IException } from './db/models/Exception';
import { htmlEncode } from 'js-htmlencode';
import * as vars from '../env/vars';
import { ICertificate } from './interfaces/certificates';
import { DateTime } from 'luxon';
import { Personalization } from '@sendgrid/helpers/classes';
import prospects from './resolvers/Mutations/prospects';
import certificates from './resolvers/Mutations/certificates';
import { IProspect, IAuthorizeNetTransaction } from './interfaces/prospects';
import { generateAffiliateLinks } from './helpers/user';
import { Card } from './interfaces/stripe';

export interface Context {
  store: IDocumentStore;
  session: IDocumentSession;
  req: CustomRequest;
  res: express.Response;
  user?: UserInterfaces.IUser;
}

export interface ICookieSession {
  id?: string;
  email?: string;
  roles?: string[];
  token: string;
}

export interface IDateFilter {
  value: Date;
  filter: String;
}

export interface CustomRequest extends express.Request {
  session: {
    user: ICookieSession;
    nowInMinutes: number;
  };
  db: IDocumentStore;
}

export function getUserId({ req }: Context) {
  const Authorization = req.get('Authorization');
  if (Authorization) {
    const token = Authorization.replace('Bearer ', '');
    const { userId } = jwt.verify(token, vars.JwtSecretKey) as { userId: string };
    return userId;
  }

  throw new AuthError();
}

export function verifyAccess(req: CustomRequest, roles?: string[]) {
  const { user } = req;
  if (!user) {
    throw new Error('Not Logged in');
  } else if (user && roles === null) {
    return true;
  } else if (user && !user.roles.some(r => roles.indexOf(r) >= 0)) {
    throw new Error('Not Authorized');
  }
  return true;
}

export function isUsernameExcluded(username: string): boolean {
  const usernameExcludeList = [
    'members',
    'member',
    'corporate',
    'backoffice',
    'back-office',
    'support',
    'faq',
    'terms',
    'policies',
    'contact',
    'contact-us',
    'about',
    'about-us',
    'testimonies',
    'testimony',
    'testimonials',
    'affiliates',
    'affiliate',
    'sponsor',
    'sponsors',
    'login',
    'go',
    'tripvalet',
    'incentives',
  ];
  return usernameExcludeList.indexOf(username) >= 0 ? true : false;
}

export async function isUsernameTaken(session: IDocumentSession, userId: string, username: string): Promise<boolean> {
  if (isUsernameExcluded(username)) {
    return true;
  }

  return await session
    .query<User>({ collection: 'Users' })
    .whereEquals('username', username)
    .andAlso()
    .whereNotEquals('id', userId)
    .waitForNonStaleResults()
    .any();
}

export async function getValidUsername(session: IDocumentSession, username: string): Promise<string> {
  let valid = true;
  if (isUsernameExcluded(username)) {
    return `${username}-${new Date().getTime()}`;
  }

  const alreadyExists = await session
    .query<User>({ collection: 'Users' })
    .whereEquals('username', username)
    .waitForNonStaleResults()
    .any();

  if (alreadyExists) {
    return `${username}-${new Date().getTime()}`;
  }

  return username;
}

export async function isEmailTaken(session: IDocumentSession, userId: string, email: string): Promise<boolean> {
  return (await session
    .query<User>({ collection: 'Users' })
    .whereEquals('email', email)
    .andAlso()
    .whereNotEquals('id', userId)
    .waitForNonStaleResults()
    .count()) > 0
    ? true
    : false;
}

export async function anyEmailTaken(session: IDocumentSession, email: string): Promise<boolean> {
  return (await session
    .query<User>({ collection: 'Users' })
    .whereEquals('email', email)
    .waitForNonStaleResults()
    .count()) > 0
    ? true
    : false;
}

export function getNowUtc() {
  return DateTime.utc().toJSDate();
}

export function getUtcMomentByOffset() {
  return moment()
    .utc()
    .toISOString(true);
}

export class AuthError extends Error {
  constructor() {
    super('Not authorized');
  }
}

export function sendInvitation(prospect, certificate, user, ccUser = true) {
  try {
    let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
    sgMail.setApiKey(vars.SendgridApiKey);
    sgMail.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally
    const msg: MailData = {
      to: prospect.deliveryEndpoint,
      bcc: ['troy.zarger@tripvalet.com', 'lorrell@tripvalet.com'],
      from: {
        email: 'certificates@tripvaletincentives.com',
        name: 'TripValet Incentives',
      },
      subject: `${prospect.firstName}, A Gift for You: ${certificate.title}`,
      // text: 'Hello plain world!',
      html: certificate.defaultMessage,
      templateId: 'd496e982-bd05-43c5-aaf9-51de95f0df96',
      substitutions: {
        memberName: `${user.firstName} ${user.lastName}`,
        url: `https://incentives.tripvalet.com/gift/${prospect.uuid}`,
        year: new Date().getFullYear().toString(),
        title: certificate.title,
        destinations: certificate.destinations,
        certImageUrl: find(certificate.images, { type: 'Email', displayOrder: 1 }).url,
        message: prospect.personalizedMessage,
        expires: moment()
          .add(30, 'days')
          .format('MM/DD/YYYY'),
        photo:
          'https://marketing-image-production.s3.amazonaws.com/uploads/14080212826cb34f4a4eddc257c822db30a1696e19a266c82e301f5d76940e1486121e40c91ce160eaadc7c9a65aa6efde0d974b329befdf96217c0f828370b0.png',
        gravatarUrl,
      },
    };

    if (prospect.deliveryEndpoint !== user.email && ccUser) {
      msg.cc = user.email;
    }

    sgMail.send(msg);
    return { success: true };
  } catch (ex) {
    return { success: false };
  }
}

export function sendCertificateLink(prospect: IProspect, certificate: ICertificate, user: UserInterfaces.IUser) {
  try {
    let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
    sgMail.setApiKey(vars.SendgridApiKey);
    sgMail.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally
    const msg: MailData = {
      to: prospect.deliveryEndpoint,
      bcc: ['troy.zarger@tripvalet.com', 'lorrell@tripvalet.com'],
      from: {
        email: 'certificates@tripvaletincentives.com',
        name: 'TripValet Incentives',
      },
      subject: `${prospect.firstName}, A Gift for You: ${certificate.title}`,
      // text: 'Hello plain world!',
      html: certificate.defaultMessage,
      templateId: 'd-6820c2c4df44408fbf884525845b6788',
      substitutions: {
        memberName: `${user.firstName} ${user.lastName}`,
        url: certificate.assuredTravel.certificateTypeDescription, //<----------fix this
        year: new Date().getFullYear().toString(),
        title: certificate.title,
        destinations: certificate.destinations.toString(),
        certImageUrl: find(certificate.images, { type: 'Email', displayOrder: 1 }).url,
        message: prospect.personalizedMessage,
        expires: moment()
          .add(30, 'days')
          .format('MM/DD/YYYY'),
        photo:
          'https://marketing-image-production.s3.amazonaws.com/uploads/14080212826cb34f4a4eddc257c822db30a1696e19a266c82e301f5d76940e1486121e40c91ce160eaadc7c9a65aa6efde0d974b329befdf96217c0f828370b0.png',
        gravatarUrl,
      },
    };

    if (prospect.deliveryEndpoint !== user.email) {
      msg.cc = user.email;
    }

    sgMail.send(msg);
    return { success: true };
  } catch (ex) {
    return { success: false };
  }
}

export async function sendTripValetIncentivesWelcome(user, password, session: IDocumentSession) {
  const links = await generateAffiliateLinks(user.id, session);
  sgMail.setApiKey(vars.SendgridApiKey);
  // sgMail.setSubstitutionWrappers('{{', '}}');
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-9f916c862d804fbb80d6c8755dc8ae75',
    personalizations: [
      {
        to: user.email,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          {
            email: 'jimmy@tripvalet.com',
            name: 'Jimmy Ezzell',
          },
        ],
        dynamic_template_data: {
          firstName: user.firstName,
          email: user.email,
          password: password,
          affiliate_links: links,
        },
      },
    ],
  };

  sgMail.send(msg);
  return { success: true };
}

export async function sendTripValetWelcome(user, password, session: IDocumentSession) {
  const links = await generateAffiliateLinks(user.id, session);
  sgMail.setApiKey(vars.SendgridApiKey);
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvalet.com',
      name: 'TripValet',
    },
    templateId: 'd-ee529f366cbb4db3aea6ec9fe846bf1f',
    personalizations: [
      {
        to: user.email,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          {
            email: 'jimmy@tripvalet.com',
            name: 'Jimmy Ezzell',
          },
          {
            email: 'lorrell@tripvalet.com',
            name: 'Lorrell Winfield',
          },
        ],
        dynamic_template_data: {
          firstName: user.firstName,
          email: user.email,
          password: password,
          affiliate_links: links,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export function sendAssuredTravelCertificateLink(prospect: IProspect, user: UserInterfaces.IUser) {
  sgMail.setApiKey(vars.SendgridApiKey);
  // sgMail.setSubstitutionWrappers('{{', '}}');
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-6820c2c4df44408fbf884525845b6788',
    personalizations: [
      {
        to: prospect.deliveryEndpoint,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          // {
          //   email: 'lorrell@tripvalet.com',
          //   name: 'Lorrell Winfield',
          // },
        ],
        dynamic_template_data: {
          firstName: prospect.firstName,
          url: prospect.assuredTravel.registrationURL,
          trip: prospect.certificate.title,

          memberName: `${user.firstName} ${user.lastName}`,
          year: new Date().getFullYear().toString(),
          certImageUrl: find(prospect.certificate.images, { type: 'Email', displayOrder: 1 }).url,
          expires: moment()
            .add(30, 'days')
            .format('MM/DD/YYYY'),
          gravatarUrl,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export function sendSfxCertificateLink(prospect: IProspect, user: UserInterfaces.IUser, code: string) {
  sgMail.setApiKey(vars.SendgridApiKey);
  // sgMail.setSubstitutionWrappers('{{', '}}');
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-6820c2c4df44408fbf884525845b6788',
    personalizations: [
      {
        to: prospect.deliveryEndpoint,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          // {
          //   email: 'lorrell@tripvalet.com',
          //   name: 'Lorrell Winfield',
          // },
        ],
        dynamic_template_data: {
          subject: `Activate Your ${prospect.certificate.title} Trip`,
          firstName: prospect.firstName,
          url: vars.sfx.redeemUrl,
          trip: prospect.certificate.title,
          code,

          memberName: `${user.firstName} ${user.lastName}`,
          year: new Date().getFullYear().toString(),
          certImageUrl: find(prospect.certificate.images, { type: 'Email', displayOrder: 1 }).url,
          expires: moment()
            .add(30, 'days')
            .format('MM/DD/YYYY'),
          gravatarUrl,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export function sendLasVegasActivationOnlyReceipt(
  prospect: IProspect,
  user: UserInterfaces.IUser,
  invoiceNumber: string,
  transaction: Stripe.charges.ICharge,
) {
  const source = transaction.source as Card;

  sgMail.setApiKey(vars.SendgridApiKey);
  // sgMail.setSubstitutionWrappers('{{', '}}');
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
  let travelers: any[] = prospect.travelers.map(t => ({
    firstName: t.firstName,
    lastName: t.lastName,
    dateOfBirth: DateTime.fromJSDate(t.dateOfBirth)
      .toLocal()
      .toFormat('DD'),
    maritalStatus: t.maritalStatus,
  }));
  let preferredDates = {
    start: DateTime.fromJSDate(prospect.preferredDates[0])
      .toLocal()
      .toFormat('DD'),
    end: DateTime.fromJSDate(prospect.preferredDates[1])
      .toLocal()
      .toFormat('DD'),
  };
  let alternateDates = {
    start: DateTime.fromJSDate(prospect.alternateDates[0])
      .toLocal()
      .toFormat('DD'),
    end: DateTime.fromJSDate(prospect.alternateDates[1])
      .toLocal()
      .toFormat('DD'),
  };
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-a661aaaeb39d48af9b5626b896f79810',

    personalizations: [
      {
        to: prospect.deliveryEndpoint,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          {
            email: 'LVVbooking@yobovegas.com',
            name: 'Las Vegas Booking',
          },
          {
            email: 'operations@yobovegas.com',
            name: 'Operations',
          },
          {
            email: 'kristin@yobovegas.com',
            name: 'Kristin Tisnado',
          },
          {
            email: 'vegas@tripvaletincentives.com',
            name: 'Vegas Certificate Receipt',
          },
          {
            email: 'niki@tripvalet.com',
            name: 'Niki Ezzell',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          // {
          //   email: 'lorrell@tripvalet.com',
          //   name: 'Lorrell Winfield',
          // },
        ],
        dynamic_template_data: {
          subject: 'Las Vegas Trip Activation Receipt',
          firstName: prospect.firstName,
          url: vars.sfx.redeemUrl,
          trip: prospect.certificate.title,

          invoiceNumber,
          transId: transaction.id,
          authCode: transaction.receipt_number,
          cardType: source.brand,
          cardNumber: source.last4,
          travelers,
          preferredDates,
          alternateDates,
          name: `${user.firstName} ${user.lastName}`,
          email: prospect.deliveryEndpoint,
          phone: prospect.phone,
          year: new Date().getFullYear().toString(),
          certImageUrl: find(prospect.certificate.images, { type: 'Email', displayOrder: 1 }).url,
          expires: moment()
            .add(30, 'days')
            .format('MM/DD/YYYY'),
          gravatarUrl,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export function sendLasVegasActivationAndReservationReceipt(
  prospect: IProspect,
  user: UserInterfaces.IUser,
  invoiceNumber: string,
  transaction: Stripe.charges.ICharge,
) {
  const source = transaction.source as Card;

  sgMail.setApiKey(vars.SendgridApiKey);
  // sgMail.setSubstitutionWrappers('{{', '}}');
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
  let travelers: any[] = prospect.travelers.map(t => ({
    firstName: t.firstName,
    lastName: t.lastName,
    dateOfBirth: DateTime.fromJSDate(t.dateOfBirth)
      .toLocal()
      .toFormat('DD'),
    maritalStatus: t.maritalStatus,
  }));
  let preferredDates = {
    start: DateTime.fromJSDate(prospect.preferredDates[0])
      .toLocal()
      .toFormat('DD'),
    end: DateTime.fromJSDate(prospect.preferredDates[1])
      .toLocal()
      .toFormat('DD'),
  };
  let alternateDates = {
    start: DateTime.fromJSDate(prospect.alternateDates[0])
      .toLocal()
      .toFormat('DD'),
    end: DateTime.fromJSDate(prospect.alternateDates[1])
      .toLocal()
      .toFormat('DD'),
  };
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-53baf8c8c87d4f66b2b9fc1b02c2b7c7',
    personalizations: [
      {
        to: prospect.deliveryEndpoint,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          {
            email: 'LVVbooking@yobovegas.com',
            name: 'Las Vegas Booking',
          },
          {
            email: 'operations@yobovegas.com',
            name: 'Operations',
          },
          {
            email: 'kristin@yobovegas.com',
            name: 'Kristin Tisnado',
          },
          {
            email: 'niki@tripvalet.com',
            name: 'Niki Ezzell',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          // {
          //   email: 'lorrell@tripvalet.com',
          //   name: 'Lorrell Winfield',
          // },
        ],
        dynamic_template_data: {
          subject: 'Las Vegas Trip Activation and Reservation Receipt',
          firstName: prospect.firstName,
          url: vars.sfx.redeemUrl,
          trip: prospect.certificate.title,

          invoiceNumber,
          transId: transaction.id,
          authCode: transaction.receipt_number,
          cardType: source.brand,
          cardNumber: source.last4,
          travelers,
          preferredDates,
          alternateDates,
          name: `${user.firstName} ${user.lastName}`,
          email: prospect.deliveryEndpoint,
          phone: prospect.phone,
          year: new Date().getFullYear().toString(),
          certImageUrl: find(prospect.certificate.images, { type: 'Email', displayOrder: 1 }).url,
          expires: moment()
            .add(30, 'days')
            .format('MM/DD/YYYY'),
          gravatarUrl,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export function sendLasVegasReservationOnlyReceipt(
  prospect: IProspect,
  user: UserInterfaces.IUser,
  invoiceNumber: string,
  transaction: Stripe.charges.ICharge,
) {
  const source = transaction.source as Card;

  sgMail.setApiKey(vars.SendgridApiKey);
  // sgMail.setSubstitutionWrappers('{{', '}}');
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
  let msg: any;
  let travelers: any[] = prospect.travelers.map(t => ({
    firstName: t.firstName,
    lastName: t.lastName,
    dateOfBirth: DateTime.fromJSDate(t.dateOfBirth)
      .toLocal()
      .toFormat('DD'),
    maritalStatus: t.maritalStatus,
  }));
  let preferredDates = {
    start: DateTime.fromJSDate(prospect.preferredDates[0])
      .toLocal()
      .toFormat('DD'),
    end: DateTime.fromJSDate(prospect.preferredDates[1])
      .toLocal()
      .toFormat('DD'),
  };
  let alternateDates = {
    start: DateTime.fromJSDate(prospect.alternateDates[0])
      .toLocal()
      .toFormat('DD'),
    end: DateTime.fromJSDate(prospect.alternateDates[1])
      .toLocal()
      .toFormat('DD'),
  };
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-04e9fed8a7264b1cacf63f3281b75f07',
    personalizations: [
      {
        to: prospect.deliveryEndpoint,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          {
            email: 'LVVbooking@yobovegas.com',
            name: 'Las Vegas Booking',
          },
          {
            email: 'operations@yobovegas.com',
            name: 'Operations',
          },
          {
            email: 'kristin@yobovegas.com',
            name: 'Kristin Tisnado',
          },
          {
            email: 'niki@tripvalet.com',
            name: 'Niki Ezzell',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          // {
          //   email: 'lorrell@tripvalet.com',
          //   name: 'Lorrell Winfield',
          // },
        ],
        dynamic_template_data: {
          subject: 'Las Vegas Trip Reservation Receipt',
          firstName: prospect.firstName,
          url: vars.sfx.redeemUrl,
          trip: prospect.certificate.title,

          invoiceNumber,
          transId: transaction.id,
          authCode: transaction.receipt_number,
          cardType: source.brand,
          cardNumber: source.last4,
          travelers,
          preferredDates,
          alternateDates,
          name: `${user.firstName} ${user.lastName}`,
          email: prospect.deliveryEndpoint,
          phone: prospect.phone,
          year: new Date().getFullYear().toString(),
          certImageUrl: find(prospect.certificate.images, { type: 'Email', displayOrder: 1 }).url,
          expires: moment()
            .add(30, 'days')
            .format('MM/DD/YYYY'),
          gravatarUrl,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}
export function sendUnlimitedCertificatesLink(prospect: IProspect, user: UserInterfaces.IUser) {
  sgMail.setApiKey(vars.SendgridApiKey);
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);
  let msg: any;
  msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-5f563148cc1c4ababb6c3a31ece54fbf',
    personalizations: [
      {
        to: prospect.deliveryEndpoint,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          // {
          //   email: 'lorrell@tripvalet.com',
          //   name: 'Lorrell Winfield',
          // },
        ],
        dynamic_template_data: {
          firstName: prospect.firstName,
          url: prospect.certificate.unlimitedCertificates.url,
          trip: prospect.certificate.title,

          memberName: `${user.firstName} ${user.lastName}`,
          year: new Date().getFullYear().toString(),
          certImageUrl: find(prospect.certificate.images, { type: 'Email', displayOrder: 1 }).url,
          expires: moment()
            .add(30, 'days')
            .format('MM/DD/YYYY'),
          gravatarUrl,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export function sendBitcoinTransactionAlert(user: UserInterfaces.IUser, membershipLevel: string) {
  sgMail.setApiKey(vars.SendgridApiKey);
  let msg = {
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    templateId: 'd-9da8463b9557431eb0574a4590299f53',
    personalizations: [
      {
        to: user.email,
        bcc: [
          {
            email: 'troy.zarger@tripvalet.com',
            name: 'Troy Zarger',
          },
          // {
          //   email: 'jimmy@tripvalet.com',
          //   name: 'Jimmy Ezzell',
          // },
          {
            email: 'lorrell@tripvalet.com',
            name: 'Lorrell Winfield',
          },
        ],
        dynamic_template_data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          membership: membershipLevel,
          transactionId: user.crypto.transactionId,
        },
      },
    ],
  };
  sgMail.send(msg);
  return { success: true };
}

export async function sendCertificate(prospect: IProspect) {
  const apiKey = prospect.certificate.apiAccessToken; // 'ac87cfc08e28474f1605458a07abd920';
  const apiEmail = encodeURIComponent(prospect.deliveryEndpoint);
  const apiURL = `https://www.creativemarketingincentives.biz/certapi?apikey=${apiKey}&email=${apiEmail}`;
  try {
    const response = await axios.get(apiURL);
    if (response.data === 'SUCCESS') {
      return { sent: true };
    } else {
      return { sent: false, message: 'Failed to send Certificate', data: { response: response.data, apiURL, apiKey } };
    }
  } catch (ex) {
    return { sent: false, message: ex.message, data: { exception: ex, apiURL, apiKey } };
  }
}

export async function sendExceptionViaEmail(exception: IException) {
  try {
    sgMail.setApiKey(vars.SendgridApiKey);
    sgMail.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally
    const msg: MailData = {
      to: 'troy.zarger@tripvalet.com',
      from: {
        email: 'troy.zarger@tripvalet.com',
        name: '[EXCEPTION] TripValet Incentives',
      },
      subject: `[EXCEPTION] on TripValet Incentives`,
      // text: 'Hello plain world!',
      // html: certificate.defaultMessage,
      templateId: 'c6a982f1-96bd-4d8f-b372-b587c28e1ebf',
      substitutions: {
        errorMessage: exception.errorMessage,
        data: formatException(exception),
        location: htmlEncode(exception.location).replace(new RegExp('\n', 'g'), '<br/>'),
      },
    };
    sgMail.send(msg);
    return { success: true };
  } catch (ex) {
    return null;
  }
}

export async function sendPasswordReset(user: UserInterfaces.IUser, token: string) {
  sgMail.setApiKey(vars.SendgridApiKey);
  sgMail.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally
  const msg: MailData = {
    to: user.email,
    bcc: ['troy.zarger@tripvalet.com'], //, 'jimmy@tripvalet.com', 'lorrell@tripvalet.com'],
    from: {
      email: 'support@tripvaletincentives.com',
      name: 'TripValet Incentives',
    },
    subject: `${user.firstName}, Password Reset from TripValet Incentives`,
    // text: 'Hello plain world!',
    // html: certificate.defaultMessage,
    templateId: 'f249feb2-d29f-4247-89dd-db8a27c0d70e',
    substitutions: {
      firstName: user.firstName,
      resetUrl: `https://incentives.tripvalet.com/reset-password/${token}`,
    },
  };
  sgMail.send(msg);
  return { success: true };
}

// htmlEncode(JSON.stringify(data, null, 2))
//       .replace(new RegExp('\n', 'g'), '<br/>')
//       .replace(new RegExp('\\"', 'g'), '"')
// 			.replace(new RegExp(' ', 'g'), '&nbsp;')

export async function createAndSendException(
  anyId?: string,
  location?: string,
  message: string = '',
  data: any = { data: null },
  sendExceptionEmail: boolean = true,
): Promise<IException> {
  const exception = new Exception(null, anyId, location, message, data);
  if (sendExceptionEmail) await sendExceptionViaEmail(exception);
  return exception;
}

export async function sendException(exception: IException, sendExceptionEmail: boolean = true): Promise<IException> {
  if (sendExceptionEmail) await sendExceptionViaEmail(exception);
  return exception;
}

export function getIp(req: CustomRequest): string {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'][0];
}

export function convertToUrlSlug(str: string): string {
  try {
    return str.replace(/\(.+?\)/g, '').replace(/[^a-z0-9+]+/gi, '-');
  } catch (ex) {
    return str;
  }
}

export function capitalizeEachFirstLetter(str: string): string {
  try {
    return str
      .trim()
      .split(' ')
      .map(word => {
        return word.charAt(0).toUpperCase() + word.substring(1);
      })
      .join(' ');
  } catch (ex) {
    return str;
  }
}

export function formatSearchTerm(searchTerm: string[]): string {
  let aux = '';
  searchTerm.forEach(term => {
    aux += `*${term}*`;
  });
  return aux;
}

export function formatLuceneQueryForDate(filterValues: IDateFilter): string {
  let query: string;

  if (filterValues) {
    const { filter, value } = filterValues;
    let filterValue = filter.toLocaleLowerCase();
    if (filterValue === 'equals') {
      query = `${moment(value).format('YYYY-MM-DD')}*`;
    }
    if (filterValue === 'before') {
      query = `[* TO ${moment(value).format('YYYY-MM-DD')}]`;
    }
    if (filterValue === 'after') {
      query = `[${moment(value).format('YYYY-MM-DD')} TO NULL]`;
    }
    return query;
  } else {
    return '';
  }
}

const formatException = (exception: IException) => {
  let result = JSON.stringify(exception.data, null, 4)
    .replace(new RegExp('\n', 'g'), '<br/>')
    .replace(new RegExp('\\"', 'g'), '"')
    .replace(new RegExp(' ', 'g'), '&nbsp;');

  if (result.length > 10000) {
    return 'Data Length Exceeds 10,000 Characters';
  } else {
    return result;
  }
};

export const getAppSettings = async <T extends object>(session: IDocumentSession, whichAppSetting: string): Promise<T> => {
  return await (<T>(<unknown>session.load<T>(`AppSettings/${whichAppSetting}`)));
};
