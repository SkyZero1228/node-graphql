import { Context, convertToUrlSlug, verifyAccess, getNowUtc, sendException } from "../../utils";
import { Video } from "../../db/models/Video";
import * as ReservationInterfaces from "../../interfaces/reservations";
import * as moment from "moment";
import * as uuid from "uuid";
import { omit, cloneDeep } from "lodash";
import { createAndSendException } from "../../utils";
import * as stripe from "../../helpers/stripe";
import { Reservation } from "../../db/models/Reservation";
import { ISaleInfo, IChargeCustomerResult, IStripeChargeCustomerResult, SaleInfo } from "../../interfaces/stripe";
import { DateTime } from "luxon";
import { IBooleanResponse } from "../../interfaces/common";
import { ReservationDeposit } from "../../db/models/ReservationDeposit";
import { v1 } from "uuid";
import Roles from "../../roles";
import { DumpBucket } from "../../db/models/DumpBucket";
import { StripeData, User } from "../../db/models/User";
import * as Utils from "../../utils";
import { ITrip } from "../../interfaces/trips";
import { SessionBeforeDeleteEventArgs } from "ravendb";
import { PaymentAccountEnum } from "../../interfaces/product";

export default {
  async payReservation(
    _parent,
    args: ReservationInterfaces.IReservationInput,
    { session, req }: Context
  ): Promise<ReservationInterfaces.IReservation> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let reservation: ReservationInterfaces.IReservation;
    const orderId = uuid.v1();
    const { user, pricing, billingAndCard, paymentOption } = args.reservation;
    try {
      reservation = await session.load<Reservation>(args.reservation.id);
      reservation.pricing = pricing;
      reservation.createdAt = getNowUtc();
      reservation.updatedAt = getNowUtc();
      // reservation = new Reservation(null, trip, user, date, guests, excursionExtras, pricing, false, orderId, willingToRoom);
      // reservation = Object.assign(reservation, {
      //   paid: false,
      //   createdAt: moment()
      //     .utc()
      //     .toDate(),
      //   updatedAt: moment()
      //     .utc()
      //     .toDate(),
      // });

      // await session.store(reservation);
      await session.saveChanges();
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error("There was an error. Please try again. The Tech Team has been notified.");
    }

    const saleInfo: ISaleInfo = {
      firstNameOnCard: billingAndCard.firstNameOnCard,
      lastNameOnCard: billingAndCard.lastNameOnCard,
      ccExpMonth: billingAndCard.ccExpMonth,
      ccExpYear: billingAndCard.ccExpYear,
      card: billingAndCard.ccNumber,
      chargeAmount: paymentOption === "PaymentPlan" ? pricing.totalDownPayment * 100 : pricing.totalPrice * 100,
      cvc: billingAndCard.cvc,
      email: user.email,
      uuid: orderId
    };

    let chargeResult: IStripeChargeCustomerResult;
    chargeResult = await stripe.chargeCustomer(saleInfo, null);

    if (chargeResult.success) {
      reservation.paid = true;
      reservation.payment = chargeResult.payload;
      reservation.updatedAt = getNowUtc();
      await session.saveChanges();
      return reservation;
    } else {
      await session.store(
        await createAndSendException(null, new Error("Failed to Charge Customer").stack, chargeResult.exception.errorMessage, {
          args,
          charge: chargeResult
        })
      );
      await session.saveChanges();
      throw new Error(chargeResult.exception.errorMessage);
    }
  },

  async updateReservationGuests(
    _parent,
    args: ReservationInterfaces.IReservationGuestsUpdate,
    { session, req }: Context
  ): Promise<ReservationInterfaces.IReservation> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let reservation: ReservationInterfaces.IReservation;
    try {
      reservation = await session.load<Reservation>(args.id);
      reservation.guests = args.guests;
      reservation.willingToRoom = args.willingToRoom;
      reservation.updatedAt = getNowUtc();
      await session.saveChanges();
      return reservation;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error("There was an error. Please try again. The Tech Team has been notified.");
    }
  },

  async updateReservationDate(
    _parent,
    args: ReservationInterfaces.IReservationDateUpdate,
    { session, req }: Context
  ): Promise<ReservationInterfaces.IReservation> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let reservation: ReservationInterfaces.IReservation;
    try {
      reservation = await session.load<Reservation>(args.id);
      reservation.date = args.date;
      reservation.updatedAt = getNowUtc();
      await session.saveChanges();
      return reservation;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error("There was an error. Please try again. The Tech Team has been notified.");
    }
  },

  async updateReservationExcursionExtras(
    _parent,
    args: ReservationInterfaces.IReservationExcursionExtrasUpdate,
    { session, req }: Context
  ): Promise<ReservationInterfaces.IReservation> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let reservation: ReservationInterfaces.IReservation;
    try {
      reservation = await session.load<Reservation>(args.id);
      reservation.excursionExtras = args.excursionExtras;
      reservation.updatedAt = getNowUtc();
      await session.saveChanges();
      return reservation;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error("There was an error. Please try again. The Tech Team has been notified.");
    }
  },

  async payReservationDeposit(
    _parent,
    args: ReservationInterfaces.IReservationDeposit,
    { req, session }: Context
  ): Promise<IBooleanResponse> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let deposit;
    try {
      deposit = new ReservationDeposit(args.trip, args.user);
      deposit.createdAt = getNowUtc();
      deposit.updatedAt = getNowUtc();
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error("There was an error. Please try again. The Tech Team has been notified.");
    }

    let { billingAndCard, user } = args;

    const saleInfo: ISaleInfo = {
      firstNameOnCard: billingAndCard.firstNameOnCard,
      lastNameOnCard: billingAndCard.lastNameOnCard,
      ccExpMonth: billingAndCard.ccExpMonth,
      ccExpYear: billingAndCard.ccExpYear,
      card: billingAndCard.ccNumber,
      chargeAmount: 200 * 100,
      email: user.email,
      cvc: billingAndCard.cvc,
      uuid: v1()
    };

    let chargeResult: IStripeChargeCustomerResult;
    chargeResult = await stripe.chargeCustomer(saleInfo, null); //TODO We need to get the address
    

    if (chargeResult.success) {
      deposit.payment = omit(chargeResult.payload, "chargeInfo");
      deposit.updatedAt = getNowUtc();
      await session.store(deposit);
      await session.saveChanges();
      return { success: true };
    } else {
      await session.store(
        await createAndSendException(null, new Error("Failed to Charge Customer").stack, chargeResult.exception.errorMessage, {
          args,
          charge: chargeResult
        })
      );
      await session.saveChanges();
      throw new Error(chargeResult.exception.errorMessage);
    }
  },

  async reserveTrip(_parent, args: ReservationInterfaces.IReserveTrip, { session, req }: Utils.Context) {
    const argsMasked = cloneDeep(args);
    const regex = /\d(?=\d{4})/gm;
    argsMasked.values.card.number = argsMasked.values.card.number.replace(regex, "*");

    const inbound = new DumpBucket(null, "reserveTrip", {
      location: {
        message: "Inbound Reservation for Cruise to Greek Islands",
        function: "reservations.ts > reserveTrip()"
      },
      args: argsMasked
    });
    await session.store(inbound);
    await session.saveChanges();
    session.advanced.evict(inbound);

    const {
      values: { address, card },
      user
    } = args;

    let customer = await session
      .query<User>({ indexName: "Users" })
      .whereEquals("email", user.email)
      .firstOrNull();

    try {
      customer.address = address;
      await session.saveChanges();

      let token = await stripe.createToken(card, customer.address, customer, PaymentAccountEnum.TripValetGeneral);
      if (!token.success) {
        // customer.active = false;
        customer.updatedAt = getNowUtc();
        await session.store(await sendException(token.exception));
        await session.saveChanges();
        throw new Error(token.exception.errorMessage);
      }

      const chargeAmount = args.price;
      const stripeChargeAmount = chargeAmount * 100;
      let stripeCustomer = await stripe.createCustomer(
        customer.email,
        customer.firstName,
        customer.lastName,
        customer.phone,
        chargeAmount,
        token.payload.id,
        PaymentAccountEnum.TripValetGeneral
      );
      if (!stripeCustomer.success) {
        // customer.active = false;
        customer.updatedAt = getNowUtc();
        await session.store(await sendException(stripeCustomer.exception));
        await session.saveChanges();
        throw new Error(stripeCustomer.exception.errorMessage);
      } else if (stripeCustomer.success && stripeCustomer.exception) {
        await sendException(stripeCustomer.exception, true);
      }

      let stripeCharge = await stripe.createCharge(
        stripeCustomer.payload,
        new SaleInfo(
          customer.email,
          customer.firstName,
          customer.lastName,
          card.number,
          card.month,
          card.year,
          card.cvc,
          stripeChargeAmount,
          customer.uuid
        ),
        token.payload.card.id,
        "Cruise to Greek Islands Deposit",
        PaymentAccountEnum.TripValetGeneral
      );
      if (!stripeCharge.success) {
        // customer.active = false;
        customer.updatedAt = Utils.getNowUtc();
        await session.store(await sendException(stripeCharge.exception));
        await session.saveChanges();
        throw new Error(stripeCharge.exception.errorMessage);
      }

      customer.active = true;
      customer.updatedAt = getNowUtc();
      customer.stripe = new StripeData(null, stripeCustomer.payload.id);
      await session.saveChanges();

      const trip = await session
        .query<ITrip>({ collection: "Trips" })
        .whereIn("urlSlug", ["greece"])
        .firstOrNull();
      const tripDate = trip.dates[0];
      const reservation = new Reservation(
        null,
        { id: trip.id, title: trip.title },
        { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, roles: customer.roles },
        { days: tripDate.days, extraDaysAfter: 0, extraDaysBefore: 0, start: tripDate.start, end: tripDate.end },
        args.values.guests,
        [],
        null,
        true,
        v1(),
        false
      );
      await session.store(reservation);
      await session.saveChanges();

      return { success: true };
    } catch (ex) {
      const argsMasked = args;
      const regex = /\d(?=\d{4})/gm;
      argsMasked.values.card.number = argsMasked.values.card.number.replace(regex, "*");
      await session.store(
        await createAndSendException(null, null, new Error(ex.message).stack, { errorMessage: ex.message, user, argsMasked })
      );
      await session.saveChanges();
      throw ex;
    }
  }
};
