import { Context, verifyAccess } from "../../utils";
import {
  User,
  Sponsor,
  Ancestry,
  UserReference,
  StripeData,
  UserBasics,
  SponsorAssignment,
  UserStripeSubscription
} from "../../db/models/User";
import * as moment from "moment";
import * as Utils from "../../utils";
import * as UserInterfaces from "../../interfaces/users";
import Roles from "../../roles";
import { Product } from "../../db/models/Product";
import stripe from "../Queries/stripe";
import { v1 } from "uuid";
import { some, find, cloneDeep, pull } from "lodash";
import {
  createUserAndSubscription,
  chargeCustomer,
  createCustomer,
  createSubscription,
  getPlan,
  updateSubscription,
  createToken,
  setDefaultSource,
  createCharge
} from "../../helpers/stripe";
import {
  SaleInfo,
  IStripeChargeCustomerResult,
  StripeCustomerReference,
  StripeProductReference,
  StripePlanSummary,
  StripePlanReference
} from "../../interfaces/stripe";
import { Funnel } from "../../db/models/Funnel";
import { IFunnelStep, IActivateUSerResponse } from "../../interfaces/funnel";
import { Exception } from "../../db/models/Exception";
import { appendUserIdToAncestors, getIdWithoutCollection, registerAndSubscribe } from "../../helpers/user";
import { Lead } from "../../db/models/Lead";
import { DumpBucket } from "../../db/models/DumpBucket";
import { addListener } from "cluster";
import { moveAffiliate } from "../../helpers/sponsorAssignment";
import { updateMailChimpUser } from "../../helpers/mailchimp";
import { Result } from "../../interfaces/coinMd";
import { IEscapeBuck } from "../../interfaces/escapeBucks";
import { EscapeBuck } from "../../db/models/EscapeBuck";
import { IOrderReference, IOrder } from "../../interfaces/order";
import { PaymentAccountEnum } from "../../interfaces/product";
import { transferUser } from "../../helpers/userTransfer";

export default {
  async editUser(_parent, args: UserInterfaces.IUpdateAccount, { session, req }: Utils.Context) {
    verifyAccess(req, [Roles.TVIPlus, Roles.TVIPro, Roles.CoinMD, Roles.Administrator]);
    const { email, firstName, id, lastName, roles, username, address, stripe, phone } = args;

    if (await Utils.isUsernameTaken(session, id, username)) {
      throw new Error("Username not available");
    }

    if (await Utils.isEmailTaken(session, id, email)) {
      throw new Error("Email already exists");
    }

    let user = await session.load<User>(id);
    Object.assign(user, {
      ...args,
      updatedAt: Utils.getNowUtc()
    });
    await session.saveChanges();

    return user;
  },

  async registerAndSubscribe(_parent, args: UserInterfaces.IRegisterAndSubscribeArgs, { session, req }: Utils.Context) {
    return await registerAndSubscribe(session, args, PaymentAccountEnum.TripValetLLC);
  },

  async registerAndSubscribeMotivated(_parent, args: UserInterfaces.IRegisterAndSubscribeArgs, { session, req }: Utils.Context) {
    return await registerAndSubscribe(session, args, PaymentAccountEnum.GetMotivated);
  },

  async registerAndSubscribeIncentives(_parent, args: UserInterfaces.IRegisterAndSubscribeArgs, { session, req }: Utils.Context) {
    return await registerAndSubscribe(session, args, PaymentAccountEnum.TripValetIncentives);
  },

  async registerWithBitcoin(
    _parent,
    args: UserInterfaces.IRegisterWithBitcoinArgs,
    { session }: Utils.Context
  ): Promise<UserInterfaces.IRegisterBitcoinResponse> {
    // const password = await bcrypt.hash(args.password, 10);
    const { aid, fid, luid, step, user, address } = args;
    let customer = await session
      .query<User>({ indexName: "Users" })
      .whereEquals("email", user.email)
      .firstOrNull();

    if (!customer) {
      let sponsor: UserInterfaces.IUser;

      if (aid || aid !== "") {
        sponsor = await session
          .query<User>({ indexName: "Users" })
          .whereEquals("uuid", aid)
          .firstOrNull();
        session.advanced.evict(sponsor);
      }

      let username = `${user.firstName.trim()}${user.lastName.trim()}`.replace(/\s/g, "").toLowerCase();
      username = await Utils.getValidUsername(session, username);

      customer = new User(
        null,
        v1(),
        Utils.capitalizeEachFirstLetter(user.firstName),
        Utils.capitalizeEachFirstLetter(user.lastName),
        username,
        user.email.trim().toLowerCase(),
        user.password,
        false,
        [],
        [],
        null,
        true,
        user.phone.trim(),
        [Roles.Affiliate],
        [],
        null,
        address
      );
      await session.store(customer);
      if (sponsor) {
        customer.sponsor = new Sponsor(sponsor.id, sponsor.email, sponsor.firstName, sponsor.lastName);
        customer.ancestry = new Ancestry(
          sponsor.ancestry.depth + 1,
          sponsor.id,
          appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors)
        );
      } else {
        customer.ancestry = new Ancestry(1);
      }
      await session.saveChanges();
    } else {
      customer.address = address;
      customer.phone = user.phone.trim();
      await session.saveChanges();
    }

    let lead = await session
      .query<Lead>({ indexName: "Leads" })
      .whereEquals("uuid", luid)
      .firstOrNull();

    if (lead) {
      lead.user = new UserReference(customer.id, customer.email, customer.firstName, customer.lastName);
    }

    const funnel = await session.load<Funnel>(fid);
    const funnelStep = find(funnel.funnelSteps, (funnelStep: IFunnelStep) => {
      return funnelStep.stepOrder === step;
    });

    return { success: true, user: UserBasics.fromUser(customer), nextFunnelStepUrl: funnelStep.nextFunnelStepUrl };
  },

  async activateUser(_parent, args, ctx: Context): Promise<IActivateUSerResponse> {
    try {
      let user = await ctx.session.load<User>(args.id);
      user.active = !user.active;
      await ctx.session.saveChanges();
      return { message: "Status Changed", success: true };
    } catch (ex) {
      throw new Error(ex);
    }
  },

  async addSponsorAssignment(
    _parent,
    args: UserInterfaces.ISponsorAssignmentArgs,
    { session, req, store }: Utils.Context
  ): Promise<UserInterfaces.ISponsorAssignment> {
    const requestor = await session.load<User>(req.user.id);
    const affiliate = await session.load<User>(args.values.affiliate.id);
    const isNoSponsor = args.values.isNoSponsor;
    let newSponsor = null;
    if (isNoSponsor === false) newSponsor = await session.load<User>(args.values.newSponsor.id);
    let assignment: UserInterfaces.ISponsorAssignment = SponsorAssignment.fromObject({
      ...args.values,
      requestor: { id: requestor.id, firstName: requestor.firstName, lastName: requestor.lastName, email: requestor.email },
      status: "In Queue"
    });

    const query = await session
      .query<User>({ indexName: "Users" })
      .whereStartsWith("ancestors", affiliate.ancestry.ancestors || getIdWithoutCollection(affiliate.id))
      .orderBy("createdAt");
    let count = await query.count();
    //if (count <= 100) {
    const users = await query.all();
    await moveAffiliate(affiliate, newSponsor, users, store, assignment, isNoSponsor);
    //}
    await session.store(assignment);
    await session.saveChanges();
    return assignment;
  },

  async addEscapeBucks(_parent, args: UserInterfaces.IAddEscapeBucksArgs, { session, req, store }: Utils.Context): Promise<Result> {
    let orderReference: IOrderReference = null;
    try {
      if (args.values.orderId) {
        const order = await session.load<IOrder>(args.values.orderId);
        orderReference = {
          funnel: order.funnel,
          id: order.id,
          orderTotal: order.totalAmount,
          products: order.products
        };
      }
      const user = await session.load<User>(args.values.affiliate.id);
      let userReference: UserInterfaces.IUserReference = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        id: user.id
      };
      let escapeBucks: IEscapeBuck = new EscapeBuck(userReference, orderReference, args.values.valueToAdd);
      await session.store(escapeBucks);
      await session.saveChanges();
      return { message: "Added Successfully", success: true };
    } catch (ex) {
      throw new Error(ex);
    }
  },

  async userTransfer(_parent, args: UserInterfaces.ITransferUserValue, { session, req, store }: Utils.Context): Promise<Result> {
    try {
      const {
        values: { email, fromRole, toRole }
      } = args;
      let userToTransfer: UserInterfaces.ITransferUser;

      const user = await session
        .query<User>({ indexName: "Users" })
        .whereEquals("email", args.values.email)
        .firstOrNull();
      if (user) {
        userToTransfer = {
          fromRole,
          toRole,
          email: user.email
        };

        const userTransferred = await transferUser(userToTransfer);
        if (userTransferred) {
          pull(user.roles, fromRole);
          if (!user.roles.some(v => v === toRole)) {
            user.roles.push(toRole);
          }
          await session.store(user);
          await session.saveChanges();
        }
      } else {
        userToTransfer = {
          fromRole,
          toRole,
          email
        };
        await transferUser(userToTransfer);
      }
      return { success: true, message: "Success" };
    } catch (ex) {
      throw new Error(ex);
    }
  }
};
