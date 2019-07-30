import { IMetadataDictionary } from "ravendb";
import { ISorAccountReference } from "./sor";
import { IDomainReference } from "./domains";
import { IStripeCustomerReference, IStripePlanSummary, IStripeProductReference } from "./stripe";
import { IFunnelReference, IFunnelStep } from "./funnel";
import { IProductReference } from "./product";
import { ISorCreateMemberRequest } from "../helpers/sor";
import { UserReference } from "../db/models/User";

export interface IMeQuery {
  id: string;
}

export interface IUsersQuery {
  skip: number;
  pageSize: number;
  searchText?: string;
}

export interface IUserBasics {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  uuid: string;
  shareType?: string;
}

export interface IUpdateAccount {
  id?: string;
  roles?: string[];
  firstName: string;
  lastName: string;
  email: string;
  paypalEmail?: string;
  username: string;
  address: IAddress;
  stripe: IStripeData;
  phone: string;
  password: string;
}

export interface IUpdatePassword {
  currentPassword: string;
  newPassword: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IResetPassword {
  resetToken: string;
  email: string;
  newPassword: string;
}

export interface ISaveBitcoinTransactionArguments {
  bitcoinTransactionInput: ISaveBitcoinTransactionArgumentsReference;
}

export interface ISaveBitcoinTransactionArgumentsReference {
  userUuid: string;
  coin: string;
  coinConversion: number;
  transactionId: string;
  wallet: string;
}

export interface IPasswordResetToken {
  id?: string;
  userId: string;
  "@metadata"?: IMetadataDictionary;
}

export interface IRavenMetadataExpires {
  "@expires": Date;
}

export interface IClickFunnelsAffiliateUrl {
  id: string;
  path: string;
}

export interface IEscapeLogin {
  tripId: string;
  email?: string;
  password?: string;
}

export interface IMemberTEKLoginResponse {
  success: boolean;
  message: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  loginId?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  telephone?: string;
  isVip: boolean;
}

export interface IMemberTEKPasswordResetResponse {
  success: boolean;
  message?: string;
}

export interface IAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface IAncestry {
  parentUserId?: string;
  ancestors?: string;
  depth: number;
}

export interface IUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  paypalEmail?: string;
  password?: string;
  active: boolean;
  clickFunnelsAffiliateUrls?: IClickFunnelsAffiliateUrl[];
  remoteLoginId?: string;
  isSubscribed?: boolean;
  phone?: string;
  roles?: string[];
  username: string;
  stripe: IStripeData;
  address: IAddress;
  sorAccount: ISorAccountReference;
  resetToken?: string;
  domain?: IDomainReference;
  sponsor?: ISponsor;
  coinMD?: ICoinMD;
  ancestry?: IAncestry;
  affiliateLinks: IAffiliateLink[];
  uuid: string;
  crypto?: IUserCrypto;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
  threeForFreeUserIds?: string[];
}

export interface IMe {
  user: IUser;
  threeForFreeCount: number;
  escapeBucks: number;
}

export interface IEscapeBucksByUserId {
  userId: string;
  bucks: number;
}
export interface IUserMembership {
  start: Date;
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
}

export interface IEscapeUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  tripId: string;
  userAgent?: string;
}

export interface IUserCount {
  user: IUser[];
  totalRows: number;
}

export interface ISponsor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ICoinMD {
  memberNumber: number;
  sponsorMemberNumber: number;
  sponsorEmail: string;
  sponsorFirstName?: string;
  sponsorLastName?: string;
  sponsorUsername: string;
}
export interface UserAndRoles {
  user: IUser;
  roles: string[];
}

// street: '123 Any Street',
// city: 'Any City',
// country: 'United States\n',
// telephone: '123-123-1234',
// state: 'GA',
// postalCode: '12345'

export interface IStripeData {
  customerId: string;
  subscriptionId?: string;
  productId?: string;
  planId?: string;
  tokenId?: string;
  status?: string;
}

export interface IUserStripeData {
  tokenId?: string;
  subscription?: string;
  planId?: string;
  customerId?: string;
}

export interface IUserStripeSubscription {
  subscriptionId: string;
  customer: IStripeCustomerReference;
  plan: IStripePlanSummary;
  product: IStripeProductReference;
}

export interface IMemberTEKRegisterRequest {
  FirstName: string;
  LastName: string;
  Street: string;
  City: string;
  State: string;
  PostalCode: string;
  Country: string;
  Telephone: string;
  Email: string;
  Password: string;
  OrderNumber: string;
  ContactPassword: string;
  Status: string;
  Product: string;
  Id: string;
  SubscriptionId: string;
  ContractNumber: string;
}

export interface IRolesAndMemberTEK {
  roles: string[];
  memberTEK: IMemberTEKRegisterRequest;
}

export interface ISignupWithSOR {
  signupWithSor: IRolesAndMemberTEK;
}

export interface IAddSORToUser {
  userId: string;
  roles: string[];
  sorData: ISorCreateMemberRequest;
}

export interface IUserReference {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface IAncestorsAsTiers {
  tier: number;
  userId: string;
}

export interface IUserSubscription {
  id?: string;
  type: "Stripe" | "Crypto";
  status: string;
  isRevenueShare?: boolean;
  user: IUserReference;
  affiliate?: IUserReference;
  start: Date;
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  subscriptionId: string;
  stripe?: IUserStripeSubscription;
  crypto?: IUserCrypto;

  referrerCode?: string;
  paymentAccountKey: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGetAllUserSubscriptions {
  userSubscriptions: IUserSubscription[];
  totalRows: number;
}

export interface IAffiliateLink {
  url: string;
  product: IProductReference;
  funnel: IFunnelReference;
}

export interface IGenealogyItem {
  id: string;
  person: IGenealogyItemPerson;
  children?: IGenealogyItem[];
}

export interface IGenealogyItemPerson {
  firstName: string;
  lastName: string;
  email: string;
  name: string;
  link: string;
  avatar: string;
  title: string;
  totalReports: number;
}

export interface IUserCrypto {
  coin: "Bitcoin" | "Ethereum";
  coinConversion: number;
  transactionId?: string;
  wallet?: string;
}

export interface ICreditCard {
  number: string;
  month: string;
  year: string;
  cvc: string;
}

export interface IUserWithPassword {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export interface IFunnelUserOrder {
  user: IUserWithPassword;
  address: IAddress;
  product: string; // ProductId
  card: ICreditCard;
  interests?: string[];
  certificate?: string;
  referralCode?: string;
  couponCode?: string;
}

export interface IRegisterAndSubscribeArgs {
  values: IFunnelUserOrder;
  fid: string;
  aid: string;
  step: number;
  luid: string;
  notes?: string;
}

export interface IAddressAndCreditCard {
  address: IAddress;
  card: ICreditCard;
}

export interface IReserveTrip {
  values: IAddressAndCreditCard;
  user: IUserBasics;
}

export interface IRegisterWithBitcoinArgs {
  user: IUserWithPassword;
  address: IAddress;
  fid: string;
  aid: string;
  step: number;
  luid: string;
}

export interface INewAffiliateUrl {
  redirectUrl: string;
}

export interface ISponsorAssignment {
  id?: string;
  requestor: IUserReference;
  affiliate: IUserReference;
  newSponsor?: IUserReference;
  isNoSponsor: boolean;
  status: "In Queue" | "In Progress" | "Done";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISponsorAssignmentReference {
  affiliate: IUserReference;
  newSponsor: IUserReference;
  isNoSponsor: boolean;
}

export interface ISponsorAssignmentArgs {
  values: ISponsorAssignmentReference;
}

export interface IAddEscapeBucksArgs {
  values: IAddEscapeBucksReference;
}

export interface IRegisterBitcoinResponse {
  success: boolean;
  user: IUserBasics;
  nextFunnelStepUrl: string;
}

export interface IAffiliateReference {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface IAddEscapeBucksReference {
  affiliate: IUserReference;
  valueToAdd: number;
  orderId: string;
}

export interface ITransferUserValue {
  values: ITransferUser;
}

export interface ITransferUser {
  email: string;
  fromRole: string;
  toRole: string;
}
