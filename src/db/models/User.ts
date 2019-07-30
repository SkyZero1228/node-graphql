import * as SorInterfaces from "../../interfaces/sor";
import * as UserInterfaces from "../../interfaces/users";
import { IDomainReference } from "../../interfaces/domains";
import * as gravatar from "gravatar";
import { v1 } from "uuid";
import moment = require("moment");
import { IStripeCustomerReference, IStripePlanSummary, IStripeProductReference } from "../../interfaces/stripe";
import { ISponsorAssignment } from "../../interfaces/users";
import { getNowUtc } from "../../utils";

export class StripeData implements UserInterfaces.IStripeData {
  constructor(
    public customerId: string,
    public subscriptionId?: string,
    public productId?: string,
    public planId?: string,
    public tokenId?: string,
    public status?: string
  ) {}
}

export class Address implements UserInterfaces.IAddress {
  constructor(public address: string, public city: string, public state: string, public zip: string, public country: string) {}
}

export class User implements UserInterfaces.IUser {
  public resetToken?: string;
  public domain?: IDomainReference;
  public coinMD?: UserInterfaces.ICoinMD;
  public sponsor?: UserInterfaces.ISponsor;
  public ancestry?: UserInterfaces.IAncestry;
  public crypto?: UserInterfaces.IUserCrypto;
  public createdAt?: Date;
  public updatedAt?: Date;
  public notes?: string;
  public paypalEmail?: string;

  constructor(
    public id?: string,
    public uuid: string = "",
    public firstName?: string,
    public lastName?: string,
    public username: string = "",
    public email?: string,
    public password?: string,
    public active: boolean = true,
    public affiliateLinks: UserInterfaces.IAffiliateLink[] = [],
    public clickFunnelsAffiliateUrls?: UserInterfaces.IClickFunnelsAffiliateUrl[],
    public remoteLoginId?: string,
    public isSubscribed?: boolean,
    public phone?: string,
    public roles?: string[],
    public threeForFreeUserIds?: string[],
    public stripe: UserInterfaces.IStripeData = null,
    public address: UserInterfaces.IAddress = null,
    public sorAccount: SorInterfaces.ISorAccountReference = null
  ) {
    this.createdAt = moment().toDate();
    this.updatedAt = this.createdAt;
  }
}

export class UserCrypto implements UserInterfaces.IUserCrypto {
  constructor(public coin: "Bitcoin" | "Ethereum", public coinConversion: number, public transactionId?: string, public wallet?: string) {}
}

export class UserReference implements UserInterfaces.IUserReference {
  constructor(public id: string, public email: string, public firstName: string, public lastName: string) {}
}

export class ClickFunnelsAffiliateUrl implements UserInterfaces.IClickFunnelsAffiliateUrl {
  constructor(public id: string = "", public path: string = "") {}
}

export class PasswordResetToken implements UserInterfaces.IPasswordResetToken {
  constructor(public id?: string, public userId: string = "") {}
}

export class UserBasics implements UserInterfaces.IUserBasics {
  static fromUser(data: UserInterfaces.IUser) {
    return new this(data.id, data.firstName, data.lastName, data.email, data.uuid);
  }

  constructor(public id: string, public firstName: string, public lastName: string, public email: string, public uuid: string) {}
}

export class GenealogyItem implements UserInterfaces.IGenealogyItem {
  constructor(
    public id: string,
    public person: UserInterfaces.IGenealogyItemPerson,
    public children: UserInterfaces.IGenealogyItem[] = null
  ) {
    this.person.name = `${this.person.firstName} ${this.person.lastName}`;
    this.person.avatar = gravatar.url(this.person.email, { s: "40", d: "mp" }, false);
    this.person.title = this.person.email.length < 50 ? this.person.email.padEnd(50, " ") : this.person.email;
  }
}

export class UserStripeSubscription implements UserInterfaces.IUserStripeSubscription {
  constructor(
    public subscriptionId: string,
    public customer: IStripeCustomerReference,
    public plan: IStripePlanSummary,
    public product: IStripeProductReference
  ) {}
}

export class GenealogyItemPerson implements UserInterfaces.IGenealogyItemPerson {
  constructor(
    public firstName: string,
    public lastName: string,
    public email: string,
    public name: string = "",
    public link: string = "",
    public avatar: string = "",
    public title: string = "",
    public totalReports: number = 0
  ) {}
}

export class Sponsor implements UserInterfaces.ISponsor {
  constructor(public id: string, public email: string, public firstName: string, public lastName: string) {}
}

export class Ancestry implements UserInterfaces.IAncestry {
  constructor(public depth: number, public parentUserId?: string, public ancestors?: string) {}
}

export class SponsorAssignment implements ISponsorAssignment {
  static fromObject(data: UserInterfaces.ISponsorAssignment) {
    return new this(data.requestor, data.affiliate, data.newSponsor, data.status, data.isNoSponsor);
  }
  public id?: string;
  public createdAt?: Date;
  public updatedAt?: Date;
  constructor(
    public requestor: UserInterfaces.IUserReference,
    public affiliate: UserInterfaces.IUserReference,
    public newSponsor: UserInterfaces.IUserReference,
    public status: "In Queue" | "In Progress" | "Done",
    public isNoSponsor: boolean
  ) {
    this.createdAt = getNowUtc();
    this.updatedAt = getNowUtc();
  }
}
