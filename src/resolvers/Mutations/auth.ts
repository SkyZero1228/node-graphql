import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
// import * as jwt from 'express-jwt';
import * as querystring from 'querystring';
import axios from 'axios';
import { v4 as uuidV4, v1 as uuidV1 } from 'uuid';
import * as Utils from '../../utils';
import { User, PasswordResetToken, Address } from '../../db/models/User';
import * as UserInterfaces from '../../interfaces/users';
import config from '../../config';
import Roles from '../../roles';
import { IBooleanResponse, IBooleanMessageResponse } from '../../interfaces/common';
import { Exception } from '../../db/models/Exception';
import { IReservation } from '../../interfaces/reservations';
import { Reservation } from '../../db/models/Reservation';
import { ITrip } from '../../interfaces/trips';
import { DateTime } from 'luxon';
import { verifyAccess } from '../../utils';
import { HealthCheck } from '../../db/models/HealthCheck';
import moment = require('moment');
import { uniq, find, some } from 'lodash';
import { sorCreateMember, SorClubs, sorGetMemberByEmail, sorCreateMemberIfNeeded, sorGetApiCredentials } from '../../helpers/sor';
import { SorCreateMemberRequest } from '../../db/models/SaveOnResorts';
import { AppSettings, IAppSettingsCountryList } from '../../db/models/AppSettings';

export default {
  async signup(_parent, args: UserInterfaces.IUser, { session }: Utils.Context) {
    // const password = await bcrypt.hash(args.password, 10);
    const roles = args.roles && args.roles.length ? args.roles : ['TVI PRO'];
    let user = new User(
      null,
      uuidV1(),
      Utils.capitalizeEachFirstLetter(args.firstName.trim()),
      Utils.capitalizeEachFirstLetter(args.lastName.trim()),
      await Utils.getValidUsername(session, args.username.trim().toLowerCase()),
      args.email.toLowerCase(),
      args.password,
      true,
      [],
      [],
      null,
      false,
      null,
      roles.concat('Affiliate'),
      null,
      null,
      null
    );

    await session.store(user);
    await session.saveChanges();

    await Utils.sendTripValetIncentivesWelcome(user, args.password, session);

    return {
      token: jwt.sign({ id: user.id, roles: user.roles, domain: user.domain }, config.secretKey, { expiresIn: '18h' }),
      user,
    };
  },

  async addEscapeUser(_parent, args: UserInterfaces.IEscapeUser, { session }: Utils.Context) {
    // const password = await bcrypt.hash(args.password, 10);
    let user = await session
      .query<User>({ collection: 'Users' })
      .whereEquals('email', args.email)
      .waitForNonStaleResults()
      .singleOrNull();

    let valid = false;
    if (user) {
      valid = await bcrypt.compare(args.password, user.password);
      if (!valid && user.password != args.password) {
        throw new Error('Your email already exists and your password does not match. Please log instead.');
      }
    } else {
      user = new User(
        null,
        uuidV1(),
        Utils.capitalizeEachFirstLetter(args.firstName.trim()),
        Utils.capitalizeEachFirstLetter(args.lastName.trim()),
        `${Utils.capitalizeEachFirstLetter(args.firstName.trim())}${Utils.capitalizeEachFirstLetter(args.lastName.trim())}`,
        args.email.toLowerCase(),
        args.password,
        true,
        [],
        [],
        null,
        false,
        null,
        ['TV ESCAPES', 'Non-Member']
      );
      await session.store(user);
      await session.saveChanges();
    }

    let reservation = await session
      .query<Reservation>({ collection: 'Reservations' })
      .whereEquals('user.id', user.id)
      .firstOrNull();

    if (!reservation) {
      const trip = await session.load<ITrip>(args.tripId);
      reservation = new Reservation(
        null,
        {
          id: trip.id,
          title: trip.title,
        },
        {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          roles: user.roles,
        },
        null,
        [
          {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dob: null,
            address: '',
            address2: '',
            city: '',
            state: '',
            postalCode: '',
          },
        ],
        [],
        null,
        false,
        uuidV4(),
        false
      );
      reservation.createdAt = Utils.getNowUtc();
      reservation.updatedAt = Utils.getNowUtc();
      reservation.userAgent = args.userAgent;
      session.advanced.evict(trip);
      await session.store<Reservation>(reservation);
      await session.saveChanges();
    }

    const result = {
      token: jwt.sign({ id: user.id, roles: user.roles, domain: user.domain }, config.secretKey, { expiresIn: '18h' }),
      user,
      reservation,
    };
    console.log('result', result);
    return result;
  },

  async signupWithSOR(_parent, args: UserInterfaces.ISignupWithSOR, { session }: Utils.Context) {
    const { roles: signUpRoles, memberTEK } = args.signupWithSor;

    // const password = await bcrypt.hash(memberTEK.Password, 10);
    const roles = signUpRoles && signUpRoles.length ? signUpRoles : ['TVI PRO'];
    let user = new User(
      null,
      uuidV1(),
      Utils.capitalizeEachFirstLetter(memberTEK.FirstName.trim()),
      Utils.capitalizeEachFirstLetter(memberTEK.LastName.trim()),
      `${Utils.capitalizeEachFirstLetter(memberTEK.FirstName.trim())}${Utils.capitalizeEachFirstLetter(memberTEK.LastName.trim())}`,
      memberTEK.Email.toLowerCase(),
      memberTEK.Password,
      true,
      [],
      [],
      null,
      false,
      null,
      roles
    );

    await session.store(user);
    await session.saveChanges();

    await Utils.sendTripValetIncentivesWelcome(user, memberTEK.Password, session);

    // const user = await session
    //   .query<User>({ collection: 'Users' })
    //   .whereEquals('email', memberTEK.Email)
    //   .singleOrNull();
    try {
      const result = await axios.post(
        'https://api.tripvalet.com/valetregister-v2.php',
        querystring.stringify({
          FirstName: memberTEK.FirstName,
          LastName: memberTEK.LastName,
          Street: memberTEK.Street,
          City: memberTEK.City,
          State: memberTEK.State,
          PostalCode: memberTEK.PostalCode,
          Country: memberTEK.Country,
          Telephone: memberTEK.Telephone,
          Email: memberTEK.Email,
          Password: memberTEK.Password,
          OrderNumber: memberTEK.OrderNumber,
          ContactPassword: memberTEK.Password,
          Status: memberTEK.Status,
          Product: memberTEK.Product,
          Id: memberTEK.Id,
          SubscriptionId: memberTEK.SubscriptionId,
        })
      );
    } catch (ex) {
      const error = new Exception(null, null, new Error(ex.message).stack, ex.message, { user, memberTEK });
      await session.store(error);
    }

    return {
      token: jwt.sign({ id: user.id, roles: user.roles, domain: user.domain }, config.secretKey, { expiresIn: '18h' }),
      user,
    };
  },

  async addSORToUser(_parent, args: UserInterfaces.IAddSORToUser, { session }: Utils.Context) {
    const { userId, roles: signUpRoles, sorData } = args;

    const user = await session.load<User>(userId);
    if (user) {
      const roles = signUpRoles && signUpRoles.length ? signUpRoles : [Roles.TVIPro, Roles.TVVip];
      user.roles = uniq(user.roles.concat(roles));

      await session.store(user);
      await session.saveChanges();

      // Utils.sendTripValetWelcome(user, sorData.Password);

      try {
        const response = await sorCreateMember(session, sorGetApiCredentials(user.roles), user);
        console.log(response);
        // const result = await axios.post(
        //   'https://api.tripvalet.com/valetregister-v2.php',
        //   querystring.stringify({
        //     FirstName: sorData.FirstName,
        //     LastName: sorData.LastName,
        //     Street: sorData.Street,
        //     City: sorData.City,
        //     State: sorData.State,
        //     PostalCode: sorData.PostalCode,
        //     Country: sorData.Country,
        //     Telephone: sorData.Telephone,
        //     Email: sorData.Email,
        //     Password: sorData.Password,
        //     OrderNumber: sorData.OrderNumber,
        //     ContactPassword: sorData.Password,
        //     Status: sorData.Status,
        //     Product: sorData.Product,
        //     Id: sorData.Id,
        //     SubscriptionId: sorData.SubscriptionId,
        //   })
        // );
      } catch (ex) {
        const error = new Exception(null, null, new Error(ex.message).stack, ex.message, { user, sorData });
        await session.store(error);
        await session.saveChanges();
      }
    }

    return {
      token: jwt.sign({ id: user.id, roles: user.roles, domain: user.domain }, config.secretKey, { expiresIn: '18h' }),
      user,
    };
  },

  async editMe(_parent, args: UserInterfaces.IUpdateAccount, { session, req }: Utils.Context) {
    verifyAccess(req, [
      Roles.TVIPro,
      Roles.TVIPlus,
      Roles.TVIBasic,
      Roles.Corporate,
      Roles.Administrator,
      Roles.Developer,
      Roles.TVPlus,
      Roles.TVVip,
      Roles.Affiliate,
      Roles.CoinMD,
    ]);

    const username = args.username.replace(/\s/g, '');
    if (Utils.isUsernameExcluded(username) || (await Utils.isUsernameTaken(session, req.user.id, username))) {
      throw new Error('Username not available');
    }

    if (await Utils.isEmailTaken(session, req.user.id, args.email)) {
      throw new Error('Email already exists');
    }

    let me = await session.load<User>(req.user.id);
    Object.assign(me, { ...args }, { username, updatedAt: Utils.getNowUtc() });

    await session.saveChanges();

    return me;
  },

  async updatePassword(_parent, args: UserInterfaces.IUpdatePassword, { session, req }: Utils.Context) {
    verifyAccess(req, [
      Roles.TVPlus,
      Roles.TVVip,
      Roles.TVIPlus,
      Roles.TVIPro,
      Roles.TVIBasic,
      Roles.CoinMD,
      Roles.Administrator,
      Roles.Corporate,
      Roles.Developer,
      Roles.Affiliate,
      Roles.CoinMD,
    ]);
    const { currentPassword, newPassword } = args;

    let me = await session.load<User>(req.user.id);

    const valid = await bcrypt.compare(currentPassword, me.password);
    if (!valid && currentPassword != me.password) {
      throw new Error('Current Password is Incorrect.');
    }

    // const cryptPassword = await bcrypt.hash(newPassword, 10);
    me.password = newPassword;
    me.updatedAt = Utils.getNowUtc();
    await session.saveChanges();
    return me;
  },

  async login(_parent, { email, password }, { session, res, req }: Utils.Context) {
    const healthCheck = new HealthCheck(null, null, { headers: req.headers, body: req.body });
    await session.store(healthCheck);
    await session.saveChanges();

    let user = await session
      .query<User>(User)
      .whereEquals('email', email)
      .whereEquals('active', true)
      .firstOrNull();

    if (!user) {
      throw new Error('Email and/or Password is invalid');
    }

    user.updatedAt = Utils.getNowUtc();

    // if (!user) {
    //   const loginResult = await axios.get<IMemberTEKLoginResponse>(`https://api.tripvalet.com/api-tripvalet-v2.php?Command=VALET_RESERVATION_LOGIN&Email=${encodeURIComponent(email)}&Password=${encodeURIComponent(password)}`, {});
    //   const { data } = loginResult;
    //   if (data.success) {
    //     const cryptPassword = await bcrypt.hash(password, 10);
    //     const roles = data.isVip ? ['TVI PRO', 'TV VIP'] : ['TVI PLUS', 'TV PLUS'];
    //     user = new User(null, data.firstName, data.lastName, `${data.firstName}${data.lastName}`.toLowerCase(), email, cryptPassword, [], data.loginId, true, data.telephone, getNowUtc(), roles);

    //     // Let's send the welcome email
    //     sendWelcome(user, password);
    //     await session.store(user);
    //     await session.saveChanges();
    //   } else {
    //     throw new Error(`No such user found for email: ${email}`);
    //   }
    // }

    const valid = await bcrypt.compare(password, user.password);
    // console.log('valid', valid, user.password, password);
    if (!valid && password != user.password) {
      throw new Error('Email and/or Password is invalid');
    }

    user.password = password;
    // await sorCreateMemberIfNeeded(sorGetApiCredentials(user.roles), session, user);
    await session.saveChanges();

    const token = jwt.sign({ id: user.id, roles: user.roles, domain: user.domain, userName: user.username }, config.secretKey, {
      expiresIn: '18h',
    });

    req['user'] = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      token,
    };

    return {
      user,
      token,
    };
  },

  async impersonate(_parent, { id }, { session, res, req }: Utils.Context) {
    verifyAccess(req, [Roles.Administrator, Roles.Developer]);
    let user = await session.load<User>(id);

    if (!user) {
      throw new Error('Email and/or Password is invalid');
    }

    user.updatedAt = Utils.getNowUtc();
    await session.saveChanges();

    const token = jwt.sign({ id: user.id, roles: user.roles, domain: user.domain, userName: user.username }, config.secretKey, {
      expiresIn: '18h',
    });

    req['user'] = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      username: user.username,
      token,
    };

    if (!user.address) {
      user.address = new Address('', '', '', '', 'United States');
      await session.saveChanges();
    }

    return {
      user,
      adminToken: req.headers.authorization.split(' ')[1],
      token,
    };
  },

  async coinmdLogin(_parent, { email, password }, { session, res, req }: Utils.Context) {
    const healthCheck = new HealthCheck(null, null, { headers: req.headers, body: req.body });
    await session.store(healthCheck);
    await session.saveChanges();

    let user = await session
      .query<User>(User)
      .whereEquals('email', email)
      .whereEquals('active', true)
      .firstOrNull();

    if (!user) {
      throw new Error('Email and/or Password is invalid');
    }

    user.updatedAt = moment().toDate();
    await session.saveChanges();

    if (user.roles.indexOf('CoinMD Member') < 0) {
      throw new Error('Not Authorized');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid && password != user.password) {
      throw new Error('Email and/or Password is invalid');
    }

    user.password = password;
    await session.saveChanges();

    const token = jwt.sign({ id: user.id, roles: user.roles, domain: user.domain, userName: user.username }, config.secretKey, {
      expiresIn: '18h',
    });

    req['user'] = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      username: user.username,
      token,
    };

    return {
      user,
      token,
    };
  },

  async escapeLogin(_parent, { email, password, tripId, userAgent }, { session, res, req }: Utils.Context) {
    const healthCheck = new HealthCheck(null, null, { headers: req.headers, body: req.body });
    await session.store(healthCheck);
    await session.saveChanges();

    let user = await session
      .query<User>(User)
      .whereEquals('email', email)
      .firstOrNull();

    // if (!user) {
    //   throw new Error('Email and/or Password is invalid');
    // }

    if (!user) {
      const loginResult = await axios.get<UserInterfaces.IMemberTEKLoginResponse>(
        `https://api.tripvalet.com/api-tripvalet-v2.php?Command=VALET_RESERVATION_LOGIN&Email=${encodeURIComponent(
          email
        )}&Password=${encodeURIComponent(password)}`,
        {}
      );
      const { data } = loginResult;
      if (data.success) {
        // const cryptPassword = await bcrypt.hash(password, 10);
        const roles = data.isVip ? ['TV VIP', 'TV ESCAPES'] : ['TV PLUS', 'TV ESCAPES'];
        user = new User(
          null,
          uuidV1(),
          data.firstName,
          data.lastName,
          `${data.firstName}${data.lastName}`.toLowerCase(),
          email,
          password,
          true,
          [],
          [],
          data.loginId,
          true,
          data.telephone,
          roles
        );
        user.createdAt = Utils.getNowUtc();

        // Let's send the welcome email
        // sendWelcome(user, password);
        await session.store(user);
        await session.saveChanges();
      } else {
        throw new Error('Email and/or Password is invalid');
      }
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid && password != user.password) {
      throw new Error('Email and/or Password is invalid');
    }

    let reservation = await session
      .query<Reservation>({ collection: 'Reservations' })
      .whereEquals('user.id', user.id)
      .firstOrNull();

    if (!reservation) {
      const trip = await session.load<ITrip>(tripId);
      reservation = new Reservation(
        null,
        {
          id: trip.id,
          title: trip.title,
        },
        {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          roles: user.roles,
        },
        null,
        [
          {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dob: null,
            address: '',
            address2: '',
            city: '',
            state: '',
            postalCode: '',
          },
        ],
        [],
        null,
        false,
        uuidV4(),
        false
      );
      reservation.createdAt = DateTime.utc().toJSDate();
      reservation.updatedAt = DateTime.utc().toJSDate();
      reservation.userAgent = userAgent;
      session.advanced.evict(trip);
      await session.store<Reservation>(reservation);
      await session.saveChanges();
    }

    user.password = password;
    user.updatedAt = Utils.getNowUtc();
    await session.saveChanges();

    const token = jwt.sign({ id: user.id, roles: user.roles, domain: user.domain, userName: user.username }, config.secretKey, {
      expiresIn: '18h',
    });

    req['user'] = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      username: user.username,
      token,
    };

    return {
      user,
      reservation,
      token,
    };
  },

  // 	forgotPassword(email: string!): Boolean
  async forgotPassword(_parent, args: UserInterfaces.IForgotPassword, { session, req }: Utils.Context): Promise<IBooleanResponse> {
    try {
      const { email } = args;

      let user = await session
        .query<User>({ collection: 'Users' })
        .whereEquals('email', email)
        .singleOrNull();

      if (!user) throw new Error('Unable to locate account by the email you entered.');

      const token = uuidV4();
      user.resetToken = token;

      const expiresAt: Date = new Date(new Date().getTime() + 10 * 60000);
      const passwordResetTokenId: string = token;
      let passwordResetToken = new PasswordResetToken(passwordResetTokenId, user.id);
      await session.store(passwordResetToken);
      const metadata = session.advanced.getMetadataFor(passwordResetToken);
      metadata['@expires'] = expiresAt.toISOString();

      user.updatedAt = Utils.getNowUtc();
      await session.saveChanges();

      Utils.sendPasswordReset(user, token);

      // let passwordResetToken = <PasswordResetToken>{
      //   userId: user.id,
      //   '@metadata': {
      //     'Raven-Node-Type': 'PasswordResetToken',
      //     '@expires': expiresAt.toISOString(),
      //   },
      // };
      // await session.store(passwordResetToken);
      // console.log('after store', passwordResetToken);
      // await session.saveChanges();
      // console.log('after save', passwordResetToken);
      // const loadedUser = await session.load<PasswordResetToken>(passwordResetTokenId);
      // console.log('after loaded', loadedUser);

      // const testDocumentId: string = 'TestExpirationDocument';

      // await session.store(
      //   {
      //     firstName: 'Delete',
      //     lastName: 'Me',
      //     email: 'delete.me@test.com',
      //     password: 'TestPassword',
      //     seeIsoFormatTemp: expiresAt.toISOString(),
      //     '@metadata': {
      //       '@expires': expiresAt.toISOString(),
      //     },
      //   },
      //   testDocumentId
      // );

      // await session.saveChanges();
      // const document = await session.load(testDocumentId);
      // const documentMetaData = document['@metadata'];
      // console.log('documentMetaData', documentMetaData);
      // expect(documentMetaData['@expires']).to.not.be.undefined;
      // expect(documentMetaData['@expires']).to.equal(expiresAt.toISOString());

      return { success: true };
    } catch (ex) {
      await session.store(await Utils.createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('Unable to locate account by email entered.');
    }
  },

  // resetPassword(email: string!, password: string!): Boolean
  async resetPassword(_parent, args: UserInterfaces.IResetPassword, { session, req }: Utils.Context): Promise<IBooleanResponse> {
    const healthCheck = new HealthCheck(null, null, { headers: req.headers, body: req.body });
    await session.store(healthCheck);
    await session.saveChanges();

    const { resetToken, newPassword } = args;
    let user: UserInterfaces.IUser = null;
    try {
      // let prt = await session.load<PasswordResetToken>(`PasswordResetTokens/${resetToken}`);
      // if (prt) {
      //   user = await session.load<User>(prt.userId);
      //   const cryptPassword = await bcrypt.hash(newPassword, 10);
      //   user.password = cryptPassword;
      //   await session.saveChanges();
      // }
      // return { success: true };
      user = await session
        .query<User>({ collection: 'Users' })
        .whereEquals('resetToken', resetToken)
        .singleOrNull();
      // const cryptPassword = await bcrypt.hash(newPassword, 10);
      user.password = newPassword;
      user.updatedAt = Utils.getNowUtc();
      await session.saveChanges();

      // We need to updated MemberTEK
      // const passwordChangeResult = await axios.get<UserInterfaces.IMemberTEKPasswordResetResponse>(`https://api.tripvalet.com/api-tripvalet-v2.php?Command=VALET_RESET_PASSWORD&Email=${encodeURIComponent(user.email)}&Password=${encodeURIComponent(newPassword)}`, {});
      // const { data } = passwordChangeResult;
      // console.log('MemberTEK Response', data);
      // if (!data.success) {
      //   await session.store(await Utils.createAndSendException(null, new Error(data.message).stack, 'Attempt to Update Password in MemberTEK due to Password Reset in TVI', { args, user }));
      //   await session.saveChanges();
      // }

      return { success: true };
    } catch (ex) {
      await session.store(await Utils.createAndSendException(null, new Error(ex.message).stack, ex.message, { args, user }));
      await session.saveChanges();
      throw new Error('Unable to locate account by Reset Token.');
    }
  },

  async saveBitcoinTransaction(
    _parent,
    args: UserInterfaces.ISaveBitcoinTransactionArguments,
    { session, req }: Utils.Context
  ): Promise<IBooleanMessageResponse> {
    try {
      const { bitcoinTransactionInput } = args;
      const user = await session
        .query<User>({ collection: 'Users' })
        .whereEquals('uuid', bitcoinTransactionInput.userUuid)
        .singleOrNull();

      if (user) {
        user.crypto = {
          coinConversion: bitcoinTransactionInput.coinConversion,
          transactionId: bitcoinTransactionInput.transactionId,
          wallet: bitcoinTransactionInput.wallet,
          coin: 'Bitcoin',
        };
        await session.saveChanges();
        return { message: 'Transaction Inserted', success: true };
      } else {
        throw new Error('User Not Found');
      }
    } catch (ex) {
      console.error(ex);
      throw new Error(ex);
    }
  },
  async restoreAuth(_parent, _args, { session, req }: Utils.Context) {
    verifyAccess(req, [Roles.Administrator, Roles.Developer]);
    let user = await session.load<User>(req.user.id);

    if (!user) {
      throw new Error('Invalid Token');
    }

    user.updatedAt = Utils.getNowUtc();
    await session.saveChanges();

    req['user'] = {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };

    return {
      user,
      token: req.headers.authorization.split(' ')[1],
    };
  },
};
