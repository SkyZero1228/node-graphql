export default `
scalar Date
scalar EpochDate
scalar Upload

type Query {
  downloadCommissions: [DownloadCommissions]
  getAffiliate: UserBasics
  getAffiliateBySearchText(searchText: String!): [AffiliateReference]
  getAllCommissions(skip: Int, pageSize: Int, searchText: String, isAffiliate: Boolean, dateFilter: DateFilter): GetAllCommissions
  getAllCommissionsByUser(skip: Int, pageSize: Int, searchText: String, userEmail: String): GetAllCommissions
  getAllDomains(skip: Int, pageSize: Int, searchText: String): [Domain]
  getAllDomainsRolesAndSorAccount(skip: Int, pageSize: Int, searchText: String): DomainRoleSorAccount
  getAllFunnels(skip: Int, pageSize: Int, searchText: String): [Funnel]
  getAllFunnelsForAffiliateLinks(skip: Int, pageSize: Int, searchText: String): [Funnel]
  getAllLeads(skip: Int, pageSize: Int, searchText: String): [Lead]
  getAllOrders(skip: Int, pageSize: Int, searchText: String): GetAllOrders
  getAllProducts(skip: Int, pageSize: Int, searchText: String): AllProducts
  getAllSponsorAssignments: [SponsorAssignment]
  getAllUserSubscriptions(skip: Int, pageSize: Int, searchText: String): GetAllUserSubscriptions
  getAllVideos(skip: Int, pageSize: Int): VideosCount
  getAllVideoCategories: [String]
  getAllVideoTagsByCategory(category: String!): [String]
  getAppSettings: AppSettings
  getCertificateDocuments(type: String): [Certificate!]
  getCertificates(skip: Int, pageSize: Int, membershipLevel: String): [Certificate!]!
  getCertificatesForProspect(searchTerm: String): [Certificate!]!
  getClickFunnels(skip: Int, pageSize: Int): [ClickFunnel!]!
  getCategories: [String!]
  getCommissionById(id: ID!): Commission
  getDomainById(id: ID!): Domain
  getFrequentlyAskedQuestions: [FrequentlyAskedQuestion!]
  getFunnelById(id: ID!): Funnel
  getFunnelStepWithData(path: String!, luid: String, aid: String): FunnelStepWithData
  getGenealogy: GenealogyItem
  getLeadsByAffiliateUser: [Lead]
  getLeadById(id: ID!): Lead
  getLeadsVisitsById(id: ID!): [LeadVisit]
  getNewAffiliateUrl(path: String!, qs: String!): NewAffiliateUrl
  getOrderById(id: ID!): Order
  getOrdersForUser(skip: Int!, pageSize: Int!, searchText: String): GetAllOrders
  getPlans: [Plans]
  getProspectsByAffiliate(searchText: String, skip: Int, pageSize: Int): ProspectBasicsPagination
  getAllLinks: [Links]
  getProductById(id: ID!): DomainProductRolesSorAccount
  getProspectByUuid(uuid: String!): Prospect
  getReservationAndTripById(id: ID!): ReservationAndTrip
  getReservations(searchText: String): [Reservation!]
  getRoles: [String!]
  getStripeCustomer(customerId: String!): Stripe_Customer
  getStripeCustomerByEmail(email: String!): [Stripe_Customer!]
  getStripeCard(userId: String): Stripe_Card
  getStripePlan(userId: String): Stripe_Plan
  getStripSubscription(userId: String): Stripe_Subscription
  getStripeSubscriptionById(subscriptionId: String!): Stripe_Subscription
  getStripeToken(tokenId: String!): Stripe_Token
  getThreeForFreeCount: Int!
  getTrialByAffiliate: [UserSubscription]
  getTrip(id: String!): Trip
  getTripBySlug(urlSlug: [String!]!): Trip
  getTrips: [Trip!]
  getUserByEmail(email: String!): [UserBasics]
  getUserById(id: ID!): UserAndRoles
  getVideoById(id: ID!): Video
  getVideos(category: String!, tag: String!): [Video!]
  getVideoTags: [VideoTag!]
  me: User
  userByResetToken(resetToken: String): User
  users(skip: Int, pageSize: Int, searchText: String): UserCount!
  validatePasswordResetToken(resetToken: String!): User!
}

type Mutation {
  acceptProspectCertificate(uuid: String!, firstName: String!, lastName: String!, deliveryEndpoint: String!): Prospect
  activateUser(id: ID!): Result
  addAppSettings(categories: [String!]): AppSettings!
  addCertificate(title: String!, description: String!, membershipLevel: String!, apiAccessToken: String!, defaultMessage: String!, images: [ImageContentInput!]): Certificate!
  addClickFunnel(title: String!, description: String!, imageUrl: String!, membershipLevel: String!, apiAccessToken: String!): Certificate!
  addCertificateDocument(certificateId: String!, type: String!, url: String!, displayOrder: Int!, images: [ImageContentInput!], active: Boolean!): Document!
  addCommission(commission: CommissionInput): Commission
  addDomain(domain: DomainInput): Domain
  addEscapeUser(firstName: String!, lastName: String!, email: String!, password: String!, tripId: String!, userAgent: String): AuthEscapePayload!
  addFunnel(funnel: FunnelInput): Funnel
  addFrequentlyAskedQuestion(question: String!, answer: String!): FrequentlyAskedQuestion!
  addLead(lead: LeadInput): Lead
  addOrder(order: OrderInput): Order
  addProduct(product: ProductInput): Product
  addProspect(firstName: String!, lastName: String!, deliveryEndpoint: String!, certificateId: String!, personalizedMessage: String!): Prospect!
  addProspectVisit(uuid: String!): Prospect!
  addRevenueShare(revenueShare: RevenueShareInput!): RevenueShare!
  addSponsorAssignment(values: SponsorAssignmentInput): SponsorAssignment!
  addSORToUser(userId: String!, roles: [String!], sorData: SorCreateMemberRequestInput!): AuthPayload!
  addTrip(trip: TripInput!): Trip!
  addVideo(video: VideoInput!): Video!
  createSubscriptionCoinMd(invoice: CoinMdSubscriptionInput): Result!
  coinmdLogin(email: String!, password: String!): AuthPayload!
  editMe(firstName: String!, lastName: String!, email: String!, username: String!): User!
  editAppSettings(id: ID!, categories: [String!]): AppSettings!
  editCertificate(id: ID!, title: String!, description: String!, membershipLevel: String!, apiAccessToken: String!, defaultMessage: String!): Certificate!
  editClickFunnel(id: ID!, title: String!, description: String!, imageUrl: String!, membershipLevel: String!, apiAccessToken: String!): Certificate!
  editCommission(commission: CommissionInput): Commission
  editDomain(domain: DomainInput): Domain
  editFunnel(funnel: FunnelInput): Funnel
  editFrequentlyAskedQuestion(id: ID!, question: String!, answer: String!): FrequentlyAskedQuestion!
  editLead(lead: LeadInput): Lead
  editOrder(order: OrderInput): Order
  editProduct(product: ProductInput): Product
  editUser(id: ID!, firstName: String!, lastName: String!, email: String!, username: String!, phone: String, roles: [String!], address: AddressInput!, stripe: StripeInput, password: String): User!
  editVideo(id: ID, videoId: String, title: String!, description: String, category: String, lastUdate: Date, tag: String!, category: String!): Video!
  escapeLogin(email: String!, password: String!, tripId: String!, userAgent: String): AuthEscapePayload!
  forgotPassword(email: String!): BooleanResponse
  impersonate(id: String!): AuthImpersonation!
  login(email: String!, password: String!): AuthPayload!
  markCommissionAsPaid(id: [ID]!): BooleanResponse
  payReservation(reservation: ReservationInput!): Reservation!
  payReservationDeposit(trip: ReservationTripInput!, user: ReservationUserInput!, billingAndCard: BillingAndCardInput!): BooleanResponse!
  registerAndSubscribe(values: FunnelUserOrderInput!, aid: String, fid: String!, step: Int!, luid: String!, notes: String): RegisterAndSubscribeResult
  registerWithBitcoin(user: UserWithPasswordInput!, address: AddressInput!, aid: String, fid: String!, step: Int!, luid: String!): RegisterBitcoinResponse!
  resetPassword(resetToken: String!, newPassword: String!): BooleanResponse
  removeCommission(orderId: String): Result
  removeVideo(videoId: String!): Result
  restoreAuth: AuthPayload!
  reserveTrip(values: GreeceReservationInput!, user: UserBasicsInput!, price: Float!): ReserveTripResponse!
  saveBitcoinTransaction(bitcoinTransactionInput: BitcoinTransactionInput, aid: String, fid: String!, step: Int!, luid: String!): FunnelStepWithData
  sendCertificateLink(uuid: String!, firstName: String!, lastName: String!, email: String!): Prospect
  signup(email: String!, password: String!, firstName: String!, lastName: String!, roles: [String!]): AuthPayload!
  signupWithSOR(signupWithSor: SignupWithSORInput!): AuthPayload!
  updateLead(aid: String!, fid: String!, luid: String!, step: Int!, email: String!): UpdateLeadResponse!
  updatePassword(currentPassword: String!, newPassword: String!): User
  updateReservationGuests(id: ID!, guests: [ReservationGuestInput!], willingToRoom: Boolean!): Reservation
  updateReservationDate(id: ID!, date: ReservationDateInput!): Reservation
  updateReservationExcursionExtras(id: ID!, excursionExtras: [ReservationExcursionExtraInput!]): Reservation
  uploadMexicoCerts(file: Upload!): BooleanResponse
}

type AffiliateReference {
  id: String
  firstName: String
  lastName: String
  email: String
}

type SponsorAssignment {
  id: ID
  requestor: UserReference!
  affiliate: UserReference!
  newSponsor: UserReference
  status: String!
  isNoSponsor: Boolean
  createdAt: Date
  updatedAt: Date
}

type ProspectBasicsPagination {
  prospects: [ProspectBasics]
  totalRows: Int
}

type ProspectBasics {
  firstName: String
  lastName: String
  deliveryEndpoint: String
  deliveryMethod: String
  redeemed: Boolean
  certificate: Certificate
}

type AuthImpersonation {
  user: User!
  token: String!
  adminToken: String!
}

type NewAffiliateUrl {
  redirectUrl: String!
}

type LeadVisit {
  id: String
  leadId: String
  affiliateUserId: String
  ip: String
  funnel: FunnelReference
  funnelStep: FunnelStepReference
  domain: DomainReference
  createdAt: Date
}

type RegisterAndSubscribeResult {
  success: Boolean!
  message: String
  nextFunnelStepUrl: String
}

type ReserveTripResponse {
  success: Boolean!
  message: String
}

type UpdateLeadResponse {
  next: String!
  nextFunnelStep: FunnelStep!
}

type Links {
  title: String!
  url: String!
}

type GenealogyItem {
  id: String!
  person: GenealogyItemPerson!
  children: [GenealogyItem!]
}

type GenealogyItemPerson {
  firstName: String!
  lastName: String!
  email: String!
  name: String
  link: String
  avatar: String
  title: String
  totalReports: Int
}

type FunnelStepWithData {
  fid: String!
  funnelStep: FunnelStep!
  affiliate: UserBasics
  luid: String!
}

type UserBasics {
  id: String!
  firstName: String!
  lastName: String!
  email: String!
  uuid: String!
  phone: String
}

type RegisterBitcoinResponse {
  success: Boolean!
  user: UserBasics!
  nextFunnelStepUrl: String!
}

type DownloadCommissions {
  firstName: String
  lastName: String
  email: String
  payCommissionOn: String
  commissionAmount: Float
  count: Int
}

type GetAllOrders {
  orders: [Order]
  totalRows: Int
}

type GetAllUserSubscriptions {
  userSubscriptions: [UserSubscription]
  totalRows: Int
}

type UserSubscription {
  id: String
  user: UserReference!
  subscriptionId: String!
  status: String!
  isRevenueShare: Boolean
  start: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  customer: StripeCustomerReference
  plan: StripePlanReference
  product: StripeProductReference
  affiliate: UserReference
  stripe: UserStripeSubscription
}

type UserStripeSubscription {
  subscriptionId: String
  customer: StripeCustomerReference
  plan: StripePlanSummary
  product: StripeProductReference
}

type StripePlanSummary {
  amount: Float
  id: String
  product: String
  interval: String
  intervalCount: Int
  nickname: String
}

type StripeProductReference {
  id: String
  name: String
}

type Plans {
  name: String!
  id: String!
  price: Float!
}

type AllProducts {
  product: [Product]
  totalRows: Int
}

type Sponsor {
  id: String!
  email: String!
  firstName: String!
  lastName: String!
}

type DomainRoleSorAccount {
  domain: [Domain]
  role: [String]
  sorAccount: [String]
}

type CustomerInvoice {
  customerId: String!
  chargeId: String!
  invoiceId: String!
}

type DomainProductRolesSorAccount {
  domain: [DomainReference]
  product: Product
  role: [String]
  sorAccount: [String]
}

type Domain {
  id: String
  tld: String!
  enabled: Boolean
  createdAt: Date
  updatedAt: Date
}

type CommissionRevenueShare {
  isRevenueShare: Boolean!
  revenueShareId: String
}

type Commission {
  id: String
  affiliate: UserReference
  tier: TierLevel
  payCommissionOn: Date!
  commissionAmount: Float!
  status: String!
  revenueShare: CommissionRevenueShare
  customer: UserReference
  order: OrderReference
  createdAt: Date
  updatedAt: Date
}

type OrderReference {
  id: String
  funnel: FunnelReference
  products: [ProductReference]
  createdAt: Date
  updatedAt: Date
}

type GetAllCommissions {
  commissions: [Commission]
  totalRows: Int
}

type CommissionOrderReference {
  orderId: String
  productNames: [String]
  totalAmount: Float
}

type Funnel {
  id: String
  title: String!
  active: Boolean
  hidden: Boolean
  funnelSteps: [FunnelStep!]
  createdAt: Date
  domain: DomainReference
}

type FunnelStep {
  stepOrder: Int!
  url: String!
  products: [FunnelStepProduct]
  nextFunnelStepUrl: String!
}

type FunnelStepProduct {
  id: String
  displayName: String
  amount: Float
  interval: String
  setup: ProductSetup
  promoCodes: [PromoCode!]
}

type PromoCode {
  code: String!
  discountType: String!
  discountAmount: Float!
  maxUse: Int!
  currentUse: Int!
  startDate: Date
  endDate: Date
  product: ProductReference
}

type FunnelReference {
  id: String
  title: String
}

type StripePlanReference {
  amount: Float!
  id: String!
  product: String!
  interval: String!
  intervalCount: Int!
  nickname: String
}

type StripeSubscriptionReference {
  id: String!
  userSubscriptionId: String
  start: EpochDate!
  plan: StripePlanReference
}

type StripeCustomerInvoiceReference {
  eventId: String!
  customerId: String!
  chargeId: String!
  invoiceId: String!
  subscription: StripeSubscriptionReference
}

type StripeCustomerReference {
  id: String!
  email: String!
}

type StripeSourceReference {
  id: String!
  brand: String!
  country: String
  last4: String!
  expMonth: Int!
  expYear: Int!
}

type StripeChargeReference {
  id: String!
  amount: Float!
  created: Date!
  customer: StripeCustomerReference!
  description: String
  paid: Boolean
  source: StripeSourceReference
  status: String
}

type Order {
  id: String
  leadId: String
  customer: UserReference!
  funnel: FunnelReference
  products: [Product!]
  invoice: StripeCustomerInvoiceReference!
  domain: DomainReference!
  payment: StripeChargeReference!
  commissions: [Commission!]!
  totalAmount: Int!
  isRevenueShare: Boolean!
  createdAt: Date
  updatedAt: Date
}

type OrderDataRow {
  id: String
  leadId: String
  customer: UserReference
  funnel: FunnelReference
  products: [Product!]
  commissions: [Commission!]!
  totalAmount: Float
  totalCommissions: Float
  payOn: Date
}

type Product {
  id: String
  amount: Float
  tierPayouts: [TierLevel]
  name: String
  displayName: String
  createdAt: Date
  updatedAt: Date
  domain: Domain
  sorAccount: String
  roles: [String]
  setup: ProductSetup
}

type TierLevel {
  id: String
  level: Int!
  commissionType: String
  value: Int
  daysToPayCommission: Int!
  domain: DomainReference
}

type DomainReference {
  id: String
  tld: String!
}

type ProductReference {
  id: String
  name: String
  displayName: String
  amount: Float
  interval: String
  setup: ProductSetup
}

type ProductSetup {
  fee: Float!
  description: String!
}

type UserReference {
  id: String!
  firstName: String!
  lastName: String!
  email: String!
}

type Lead {
  id: String
  ip: String
  uuid: String
  userId: String
  funnel: FunnelReference
  createdAt: Date
  visitedTime: Int
  email: String
  phone: String
  name: String
  funnelStep: FunnelStepReference
  domain: DomainReference
  user: UserReference
  order: OrderReference
  subscription: StripeSubscriptionReference
}

type FunnelStepReference {
  stepOrder: Int
  url: String
}

type VideosCount {
  videos: [Video]
  totalRows: Int
}

type UserAndRoles {
  user: User
  roles: [String]
}

type UserCount {
  user: [User]
  totalRows: Int
}
type ReservationAndTrip {
  reservation: Reservation
  trip: Trip
}

type Video {
  id: ID
  videoId: String!
  title: String!
  description: String
  tag: String!
  category: String!
}

type VideoTag {
  tag: String!
  children: [String!]
}

type BooleanResponse {
  success: Boolean
}

type AppSettings {
  id: ID
  categories: [String!]
}

type FrequentlyAskedQuestion {
  id: ID
  question: String!
  answer: String!
}

type AuthPayload {
  user: User!
  token: String!
}

type AuthEscapePayload {
  user: User!
  reservation: Reservation!
  token: String!
}

type ClickFunnelsAffiliateUrl {
  id: String
  path: String
}

type AffiliateLink {
  url: String!
  product: ProductReference!
  funnel: FunnelReference
}

type User {
  id: ID
  firstName: String!
  lastName: String!
  email: String!
  password: String
  clickFunnelsAffiliateUrls: [ClickFunnelsAffiliateUrl!]
  remoteLoginId: String
  isSubscribed: Boolean
  phone: String
  roles: [String!]
  username: String!
  profile: UserProfile
  address: Address
  stripe: Stripe
  coinMD: CoinMD
  sponsor: Sponsor
  ancestry: Ancestry
  affiliateLinks: [AffiliateLink!]
  uuid: String!
  createdAt: Date
  updatedAt: Date
  active: Boolean
}

type CoinMD {
  memberNumber: Int!
  sponsorMemberNumber: Int
  sponsorEmail: String
  sponsorFirstName: String
  sponsorLastName: String
  sponsorUsername: String
}

type Ancestry {
  parentUserId: String!
  ancestors: String!
  depth: Int!
}

type Stripe {
  tokenId: String
  subscriptionId: String
  planId: String
  customerId: String
}

type Address {
  address: String
  city: String
  state: String
  zip: String
  country: String
}

type UserProfile {
  username: String
  gravatarEmail: String
  email: String
  phone: String
  messages: [String!]
  timezone: String
}

type Prospect {
  id: ID
  firstName: String
  lastName: String
  email: String
  deliveryEndpoint: String
  deliveryMethod: String
  visits: [Visit!]
  certificate: Certificate!
  personalizedMessage: String!
  redeemed: Boolean
  createdAt: Date
  updatedAt: Date
}

input BitcoinTransactionInput {
  userUuid: String!
  coinConversion: Float!
  transactionId: String!
  wallet: String!
  product: String!
}

input ProspectInput {
  id: ID
  firstName: String
  lastName: String
  email: String
  visits: [VisitInput!]
  certificateId: String!
  personalizedMessage: String!
  createdAt: Date
  updatedAt: Date
}

type Visit {
  visitDate: Date
  ip: String
  url: String
}

input VisitInput {
  visitDate: Date
  ip: String
  url: String
}

type Conversion {
  certificate: Certificate
  conversionDate: Date
  ip: String
}

type Certificate {
  id: ID
  title: String
  description: String
  membershipLevel: [String!]
  apiAccessToken: String
  active: Boolean
  defaultMessage: String
  destinations: Int
  images: [ImageContent!]
  documents: [Document!]
}

input CertificateInput {
  id: ID
  title: String
  description: String
  membershipLevel: [String!]
  apiAccessToken: String
  active: Boolean
  defaultMessage: String
  destinations: Int
  images: [ImageContentInput!]
  documents: [DocumentInput!]
}

type Document {
  id: String
  type: String
  url: String
  active: Boolean
  images: [ImageContent!]
  displayOrder: Int
}

input DocumentInput {
  id: String
  type: String
  url: String
  active: Boolean
  images: [ImageContentInput!]
  displayOrder: Int
}

type ImageContent {
  type: String
  url: String
  displayOrder: Int
}

input SorCreateMemberRequestInput {
  Email: String!
  ContractNumber: String!
  Address: String!
  City: String!
  State: String!
  PostalCode: String!
  TwoLetterCountryCode: String!
  Phone: String!
  Password: String!
  FirstName: String!
  LastName: String!
  UserAccountTypeID: Int
}
input ImageContentInput {
  type: String
  url: String
  displayOrder: Int
}

type ClickFunnel {
  id: ID
  title: String
  url: String
  active: Boolean
}

type Profile {
  phone: String
  email: String
  message: String
}

type MemberTEK {
  loginId: Int
  email: String!
  name: String!
}

type Image {
  url: String
}

type Stripe_Card {
  id: String
  object: String
  address_city: String
  address_country: String
  address_line1: String
  address_line1_check: String
  address_line2: String
  address_state: String
  address_zip: String
  address_zip_check: String
  brand: String
  country: String
  cvc_check: String
  dynamic_last4: String
  exp_month: Int
  exp_year: Int
  fingerprint: String
  funding: String
  last4: String
  metadata: Stripe_Metadata
  name: String
  tokenization_method: String
}

type Stripe_Token {
  id: String
  object: String
  card: Stripe_Card
  client_ip: String
  created: Int
  livemode: Boolean
  type: String
  used: Boolean
}

type Stripe_Customer {
  id: String
  object: String
  account_balance: Int
  created: Int
  currency: String
  default_source: String
  delinquent: Boolean
  description: String
  discount: Stripe_Discount
  email: String
  invoice_prefix: String
  livemode: Boolean
  metadata: Stripe_CustomerMetadata
  shipping: [Stripe_Shipping!]
  sources: Stripe_CustomerSourceItem
  subscriptions: Stripe_CustomerSubscriptionItem
}

type Stripe_CustomerMetadata {
  name: String
  first_name: String
  last_name: String
  phone: String
}

type Stripe_CustomerSourceItem {
  object: String
  data: [Stripe_Card!]
  has_more: Boolean
  total_count: Int
  url: String
}

type Stripe_CustomerSubscriptionItem {
  object: String
  data: [Stripe_Subscription!]
  has_more: Boolean
  total_count: Int
  url: String
}

type Stripe_AchCreditTransfer {
  account_number: String
  routing_number: String
  fingerprint: String
  bank_name: String
  swift_code: String
}

type Stripe_Owner {
  address: Stripe_Address
  email: String
  name: String
  phone: String
  verified_address: Stripe_Address
  verified_email: String
  verified_name: String
  verified_phone: String
}

type Stripe_Receiver {
  address: Stripe_Address
  amount_charged: Int
  amount_received: Int
  amount_returned: Int
}

type Stripe_Source {
  id: String
  object: String
  ach_credit_transfer: Stripe_AchCreditTransfer
  amount: Int
  client_secret: String
  created: Int
  currency: String
  flow: String
  livemode: Boolean
  metadata: Stripe_Metadata
  owner: Stripe_Owner
  receiver: Stripe_Receiver
  statement_descriptor: String
  status: String
  type: String
  usage: String
}

type Stripe_Plan {
  id: String
  object: String
  active: Boolean
  aggregate_usage: String
  amount: Int
  billing_scheme: String
  created: EpochDate
  currency: String
  interval: String
  interval_count: Int
  livemode: Boolean
  metadata: Stripe_Metadata
  nickname: String
  product: String
  tiers: [Stripe_PricingTier!]
  tiers_mode: String
  transform_usage: Stripe_TransformUsage
  trial_period_days: Int
  usage_type: String
}

type Stripe_PricingTier {
  amount: Int
  up_to: Int
  tiers_mode: String
  transform_usage: Stripe_TransformUsage
}

type Stripe_TransformUsage {
  divide_by: Int
  round: String
}

type Stripe_Datum {
  id: String
  object: String
  created: EpochDate
  metadata: Stripe_Metadata
  plan: Stripe_Plan
  quantity: Int
  subscription: String
}

type Stripe_Item {
  object: String
  data: [Stripe_Datum!]
  has_more: Boolean
  total_count: Int
  url: String
}

type Stripe_Metadata {
  charset: String
  content: String
}

type Stripe_Subscription {
  id: String
  object: String
  application_fee_percent: Float
  billing: String
  billing_cycle_anchor: EpochDate
  cancel_at_period_end: Boolean
  canceled_at: EpochDate
  created: EpochDate
  current_period_end: EpochDate
  current_period_start: EpochDate
  customer: String
  days_until_due: Int
  discount: Stripe_Discount
  ended_at: Int
  items: Stripe_Item
  livemode: Boolean
  metadata: Stripe_Metadata
  plan: Stripe_Plan
  quantity: Int
  start: EpochDate
  status: String
  tax_percent: Float
  trial_end: EpochDate
  trial_start: EpochDate
}

type Stripe_Coupon {
  id: String
  object: String
  amount_off: Int
  created: Int
  currency: String
  duration: String
  duration_in_months: Int
  livemode: Boolean
  max_redemptions: Int
  metadata: Stripe_Metadata
  name: String
  percent_off: Int
  redeem_by: Date
  times_redeemed: Int
  valid: Boolean
}

type Stripe_Discount {
  object: String
  coupon: Stripe_Coupon
  customer: String
  end: Int
  start: Int
  subscription: Stripe_Subscription
}

type Stripe_Address {
  city: String
  country: String
  line1: String
  line2: String
  postal_code: String
  state: String
}

type Stripe_Shipping {
  address: Stripe_Address
  carrier: String
  name: String
  phone: String
  tracking_number: String
}

type Result {
  success: Boolean!
  message: String
}

type MemberTEKRegisterRequest {
  FirstName: String!
  LastName: String!
  Street: String!
  City: String!
  State: String!
  PostalCode: String!
  Country: String!
  Telephone: String!
  Email: String!
  Password: String!
  OrderNumber: String!
  ContactPassword: String!
  Status: String!
  Product: String!
  Id: String!
  SubscriptionId: String!
}
input MemberTEKRegisterRequestInput {
  FirstName: String!
  LastName: String!
  Street: String!
  City: String!
  State: String!
  PostalCode: String!
  Country: String!
  Telephone: String!
  Email: String!
  Password: String!
  OrderNumber: String!
  ContactPassword: String!
  Status: String!
  Product: String!
  Id: String!
  SubscriptionId: String!
}

type Stripe_FraudDetails {
  user_report: String
  stripe_report: String
}

type Stripe_Outcome {
  network_status: String!
  reason: String!
  risk_level: String
  risk_score: Int
  rule: String
  seller_message: String!
  type: String!
}

type Stripe_Refund {
  id: String!
  object: String!
  amount: Int!
  balance_transaction: String!
  charge: String!
  created: Date
  currency: String!
  failure_balance_transaction: String
  failure_reason: String
  metadata: Stripe_Metadata
  reason: String!
  receipt_number: String!
  status: String!
}
type Stripe_Refunds {
  object: String!
  data: [Stripe_Refund!]!
  has_more: Boolean!
  url: String
}

type Stripe_Charge {
  id: String!
  object: String!
  amount: Int!
  amount_refunded: Int!
  application: String
  application_fee: String
  balance_transaction: String!
  captured: Boolean!
  created: Int!
  currency: String!
  customer: String!
  description: String!
  destination: String
  dispute: String
  failure_code: String
  failure_message: String
  fraud_details: Stripe_FraudDetails
  invoice: String
  livemode: Boolean!
  metadata: Stripe_Metadata
  on_behalf_of: String
  order: String
  outcome: Stripe_Outcome
  paid: Boolean!
  receipt_email: String!
  receipt_number: String
  refunded: Boolean!
  refunds: [Stripe_Refunds!]!
  review: String
  shipping: Stripe_Shipping
  source: Stripe_Card
  source_transfer: String!
  statement_descriptor: String!
  status: String!
  transfer_group: String
}

type ChargeCustomerResult {
  success: Boolean!
  customerId: String!
  sourceId: String!
  chargeInfo: Stripe_Charge!
}

type TripRoomPrice {
  id: String!
  role: String!
  pricePerRoom: Float!
  pricePerRoomPerPerson: Float!
  downPayment: Float!
  downPaymentPerPerson: Float!
  extraPricePerNight: Float!
  extraPricePerNightPerPerson: Float!
}
input TripRoomPriceInput {
  id: String!
  role: String!
  pricePerRoom: Float!
  pricePerRoomPerPerson: Float!
  downPayment: Float!
  downPaymentPerPerson: Float!
  extraPricePerNight: Float!
  extraPricePerNightPerPerson: Float!
}

type CouponCode {
  id: String!
  code: String!
  discountType: String!
  discountAmount: Float!
  appliesToNumberOfGuests: Int!
  appliesToExcursions: Boolean!
}
input CouponCodeInput {
  id: String!
  code: String!
  discountType: String!
  discountAmount: Float!
  appliesToNumberOfGuests: Int!
  appliesToExcursions: Boolean!
}

type DailyTripAgenda {
  day: Int!
  dayTitle: String!
  imageUrl: String!
  agenda: [String!]!
}
input DailyTripAgendaInput {
  day: Int!
  dayTitle: String!
  imageUrl: String!
  agenda: [String!]!
}

type TripExcursion {
  id: String!
  description: String!
  dates: [TripExcursionDate!]!
  imageUrl: String!
  included: String
  price: String
  restrictions: String
  times: String!
  what: String!
  whatType: String!
  when: String!
}
input TripExcursionInput {
  id: String!
  description: String!
  dates: [TripExcursionDateInput!]!
  imageUrl: String!
  included: String
  price: String
  restrictions: String
  times: String!
  what: String!
  whatType: String!
  when: String!
}

type TripImage {
  type: String!
  url: String!
  displayOrder: Int
}
input TripImageInput {
  type: String!
  url: String!
  displayOrder: Int
}

type TripLocation {
  cityOrRegion: String!
  country: String!
  description: String
  images: [TripImage!]
}
input TripLocationInput {
  cityOrRegion: String!
  country: String!
  description: String
  images: [TripImageInput!]
}

type TripRoomClass {
  id: String!
  description: String!
  rooms: Int!
  roomsRemaining: Int!
  images: [TripImage!]!
  roomPriceBasis: String!
  pricing: [TripRoomPrice!]!
}
input TripRoomClassInput {
  id: String!
  description: String!
  rooms: Int!
  roomsRemaining: Int!
  images: [TripImageInput!]!
  roomPriceBasis: String!
  pricing: [TripRoomPriceInput!]!
}

type TripHotel {
  description: String!
  images: [TripImage!]!
  rooms: [TripRoomClass!]!
  property: String!
  totalRooms: Int!
  totalRoomsRemaining: Int!
}
input TripHotelInput {
  description: String!
  images: [TripImageInput!]!
  rooms: [TripRoomClassInput!]!
  property: String!
  totalRooms: Int!
  totalRoomsRemaining: Int!
}

type TripDate {
  id: String!
  days: Int!
  end: Date!
  start: Date!
  status: String!
}
input TripDateInput {
  id: String!
  days: Int!
  end: Date!
  start: Date!
  status: String!
}

type DateRange {
  start: Date
  end: Date
}

input DateRangeInput {
  start: Date
  end: Date
}

type TripExcursionTime {
  id: String!
  start: Date!
  end: Date!
  price: Float!
  cost: Float
}
input TripExcursionTimeInput {
  id: String!
  start: Date!
  end: Date!
  price: Float!
  cost: Float
}

type TripExcursionDate {
  id: String!
  tripDateId: String!
  day: Date!
  times: [TripExcursionTime!]!
}
input TripExcursionDateInput {
  id: String!
  tripDateId: String!
  day: Date!
  times: [TripExcursionTimeInput!]!
}

type Trip {
  agenda: [DailyTripAgenda!]!
  couponCodes: [CouponCode!]
  createdAt: Date
  dates: [TripDate!]!
  description: String
  excursions: [TripExcursion!]
  id: String
  location: TripLocation!
  hotel: TripHotel!
  includes: [String!]!
  images: [TripImage!]!
  title: String!
  updatedAt: Date
  urlSlug: [String!]
  videoUrl: String
}
input TripInput {
  agenda: [DailyTripAgendaInput!]!
  couponCodes: [CouponCodeInput!]
  createdAt: Date
  dates: [TripDateInput!]!
  description: String
  excursions: [TripExcursionInput!]
  id: String
  location: TripLocationInput!
  hotel: TripHotelInput!
  includes: [String!]!
  images: [TripImageInput!]!
  title: String!
  updatedAt: Date
  urlSlug: [String!]
  videoUrl: String
}

# type Payment {
#   code: String!
#   createdAt: Date!
#   id: ID! @isUnique
#   isApproved: Boolean! @defaultValue(value: false)
#   jsonResponse: Json
#   reservation: Reservation @relation(name: "PaymentOnReservation")
#   transactionId: String!
#   eventAttendee: EventAttendee @relation(name: "PaymentOnEventAttendee")
#   cardMasked: String! @defaultValue(value: "")
#   couponCode: CouponCode @relation(name: "PaymentOnCouponCode")
#   event: Event @relation(name: "PaymentOnEvent")
#   gatewayMessage: String! @defaultValue(value: "")
#   jsonRequest: Json
#   merchant: Merchant! @defaultValue(value: PriorityPay)
#   orderId: String! @defaultValue(value: "")
#   paymentAmount: Float
#   paymentType: PaymentType @defaultValue(value: Escape)
#   scheduledPayment: ScheduledPayment @relation(name: "ScheduledPaymentOnPayment")
#   trip: Trip @relation(name: "PaymentOnTrip")
# }

type ReservationUser {
  id: String!
  firstName: String!
  lastName: String!
  email: String!
  roles: [String!]!
}

type ReservationDatePricing {
  id: String!
  role: String!
  pricePerRoom: Int!
  pricePerRoomPerPerson: Int!
  downPayment: Int!
  downPaymentPerPerson: Int!
  extraPricePerNight: Int!
  extraPricePerNightPerPerson: Int!
}

type ReservationPricing {
  willingToRoom: Boolean!
  futurePayments: [ReservationFuturePayment!]

  pricePerRoom: Float!
  pricePerRoomPerPerson: Float!

  extraDays: Float!
  extraDaysPrice: Float!
  extraDaysTotalPrice: Float!
  extraDaysTotalPriceByDay: Float!
  extraDaysPricePerPerson: Float!
  extraPricePerNight: Float!
  extraPricePerNightPerPerson: Float!
  extraDaysDownPayment: Float!

  excursionExtrasTotalPrice: Float!
  excursionExtrasDownPayment: Float!

  downPayment: Float!
  downPaymentPerPerson: Float!
  totalDownPayment: Float!
  futurePayment: Float!

  price: Float!
  pricePerPerson: Float!
  totalRoomPrice: Float!
  totalPrice: Float!
}

type ReservationDate {
  days: Int!
  end: Date
  extraDaysAfter: Int!
  extraDaysBefore: Int!
  id: String
  start: Date
  pricing: ReservationDatePricing
}

type ReservationGuest {
  firstName: String!
  lastName: String!
  email: String
  phone: String
  dob: Date
  address: String
  address2: String
  city: String
  state: String
  postalCode: String
}

type ReservationExcursion {
  id: String!
  imageUrl: String!
  included: String!
  price: String!
  what: String!
  whatType: String!
  when: String!
}

type ReservationExcursionDate {
  id: String!
  tripDateId: String!
  day: Date
}

type ReservationTime {
  id: String!
  start: Date
  end: Date
  price: Int!
}

type ReservationExcursionExtra {
  excursion: ReservationExcursion
  excursionDate: ReservationExcursionDate
  time: ReservationTime
}

type ReservationFuturePayment {
  amount: Float!
  date: Date
}

type ReservationPaymentDetails {
  dueToday: Int!
  balanceDue: Int!
  futurePayments: [ReservationFuturePayment!]
}

type ReservationTrip {
  id: String!
  title: String!
}

type Reservation {
  id: ID!
  trip: ReservationTrip!
  paid: Boolean!
  uuid: String!
  user: ReservationUser
  date: ReservationDate
  guests: [ReservationGuest!]
  excursionExtras: [ReservationExcursionExtra!]
  pricing: ReservationPricing
  payment: ChargeCustomerResult
  willingToRoom: Boolean!
  notes: String
  updatedAt: Date
  createdAt: Date
}

input ReservationGuestsUpdate {
  id: ID!
  guests: [ReservationGuestInput!]!
}

input ReservationDateUpdate {
  id: ID!
  date: ReservationDateInput!
}

input ReservationExcursionExtrasUpdate {
  id: ID!
  excursionExtras: [ReservationExcursionExtraInput!]!
}

input ReservationUserInput {
  id: String!
  firstName: String!
  lastName: String!
  email: String!
  roles: [String!]!
}

input ReservationDatePricingInput {
  id: String!
  role: String!
  pricePerRoom: Int!
  pricePerRoomPerPerson: Int!
  downPayment: Int!
  downPaymentPerPerson: Int!
  extraPricePerNight: Int!
  extraPricePerNightPerPerson: Int!
}

input ReservationPricingInput {
  willingToRoom: Boolean!
  futurePayments: [ReservationFuturePaymentInput!]

  pricePerRoom: Float!
  pricePerRoomPerPerson: Float!

  extraDays: Float!
  extraDaysPrice: Float!
  extraDaysTotalPrice: Float!
  extraDaysTotalPriceByDay: Float!
  extraDaysPricePerPerson: Float!
  extraPricePerNight: Float!
  extraPricePerNightPerPerson: Float!
  extraDaysDownPayment: Float!

  excursionExtrasTotalPrice: Float!
  excursionExtrasDownPayment: Float!

  downPayment: Float!
  downPaymentPerPerson: Float!
  totalDownPayment: Float!
  futurePayment: Float!

  price: Float!
  pricePerPerson: Float!
  totalRoomPrice: Float!
  totalPrice: Float!
}

input ReservationDateInput {
  days: Int!
  end: Date
  extraDaysAfter: Int!
  extraDaysBefore: Int!
  id: String!
  start: Date
  pricing: ReservationDatePricingInput
}

input CoinMdSubscriptionInput {
  billingInfo: BillingAndCardSubscriptionInput!
  user: CoinMdUserReferenceInput!
  planId: String!
}

input BillingAndCardSubscriptionInput {
  firstNameOnCard: String!
  lastNameOnCard: String!
  agreement: Boolean
  ccAddress1: String!
  ccAddress2: String
  ccCity: String!
  ccExpMonth: String!
  ccExpYear: String!
  card: String!
  ccPostalCode: String!
  ccState: String!
  cvc: String!
}

input CoinMdUserReferenceInput {
  email: String!
  firstName: String!
  lastName: String!
  roles: [String]
  password: String!
}

input ReservationGuestInput {
  firstName: String!
  lastName: String!
  email: String
  phone: String
  dob: Date
  address: String
  address2: String
  city: String
  state: String
  postalCode: String
}

input ReservationExcursionInput {
  id: String!
  imageUrl: String!
  price: String!
  what: String!
  whatType: String!
  when: String!
}

input ReservationExcursionDateInput {
  id: String!
  tripDateId: String!
  day: Date
}

input ReservationTimeInput {
  id: String!
  start: Date
  end: Date
  price: Int!
}

input ReservationExcursionExtraInput {
  excursion: ReservationExcursionInput
  excursionDate: ReservationExcursionDateInput
  time: ReservationTimeInput
}

input ReservationFuturePaymentInput {
  amount: Float!
  date: Date
}

input ReservationPaymentDetailsInput {
  dueToday: Int!
  balanceDue: Int!
  futurePayments: [ReservationFuturePaymentInput!]
}

input BillingAndCardInput {
  firstNameOnCard: String!
  lastNameOnCard: String!
  agreement: Boolean
  ccAddress1: String!
  ccAddress2: String
  ccCity: String!
  ccExpMonth: String!
  ccExpYear: String!
  ccNumber: String!
  ccPostalCode: String!
  ccState: String!
  cvc: String!
}

input CardInput {
  card: String!
  expMonth: String!
  expYear: String!
  cvc: String!
}

input ReservationTripInput {
  id: String!
  title: String!
}

input ReservationInput {
  id: String!
  trip: ReservationTripInput!
  user: ReservationUserInput!
  date: ReservationDateInput
  guests: [ReservationGuestInput!]
  excursionExtras: [ReservationExcursionExtraInput!]
  pricing: ReservationPricingInput
  billingAndCard: BillingAndCardInput
  updatedAt: Date
  createdAt: Date
  paymentOption: String
  willingToRoom: Boolean
  paid: Boolean
  uuid: String
  notes: String
}

input AddressInput {
  address: String
  city: String
  state: String
  zip: String
  country: String
}

input StripeInput {
  tokenId: String
  subscriptionId: String
  planId: String
  customerId: String
}

input VideoInput {
  id: ID
  videoId: String
  title: String!
  description: String
  displayOrder: Int
  tag: String!
  category: String!
}

input SignupWithSORInput {
  roles: [String!]
  memberTEK: MemberTEKRegisterRequestInput!
}
input CommissionInput {
  id: String
  user: UserReferenceInput!
  orderId: String!
  funnel: FunnelReferenceInput!
  payCommissionOn: Date!
  commissionAmount: Int!
  status: String!
  createdAt: Date
}

input UserReferenceInput {
  id: String!
  firstName: String!
  lastName: String!
  email: String!
}

input FunnelReferenceInput {
  id: String!
  title: String!
}

input FunnelInput {
  id: String
  title: String!
  active: Boolean!
  hidden: Boolean!
  funnelSteps: [FunnelStepInput]!
  domain: String!
  createdAt: Date
}

input FunnelStepInput {
  stepOrder: Int!
  url: String!
  products: [FunnelStepProductInput!]
  nextFunnelStepUrl: String!
}

input FunnelStepProductInput {
  product: String!
  promoCodes: [PromoCodeInput!]
}

input PromoCodeInput {
  code: String!
  discountType: String!
  discountAmount: Float
  maxUse: Int
  currentUse: Int
  startDate: Date
  endDate: Date
  product: String
}

input LeadInput {
  id: String
  ip: String!
  uuid: String!
  userId: String
  funnel: FunnelReferenceInput!
  createdAt: Date
  visitedTime: Int!
  email: String!
  phone: String
  name: String!
}

input OrderInput {
  id: String
  leadId: String!
  user: UserReferenceInput!
  funnel: FunnelReferenceInput!
  product: [ProductInput]!
  totalAmount: Int!
  payment: ChargeCustomerResultInput
  createdAt: Date
}

input ProductInput {
  id: String
  amount: Float!
  tierPayouts: [TierLevelInput]!
  name: String!
  domain: DomainReferenceInput!
  sorAccount: String
  roles: [String]
  setup: ProductSetupInput
  promoCodes: [ProductPromoCodeInput!]
  createdAt: Date
}

input ProductSetupInput {
  fee: Float!
  description: String
}

input TierLevelInput {
  id: String!
  level: Int!
  commissionType: String
  value: Int!
  daysToPayCommission: Int!
}

input RevenueShareInput {
  id: String
  funnel: FunnelReferenceInput
  user: UserReferenceInput!
  userRole: String
  daysToPayCommission: Int!
  commissionType: String!
  commissionAmount: Float!
}

type RevenueShare {
  id: String!
  funnel: FunnelReference
  user: UserReference!
  userRole: String
  daysToPayCommission: Int!
  commissionType: String!
  commissionAmount: Float!
}

input DomainReferenceInput {
  id: String
  tld: String!
}

input ChargeCustomerResultInput {
  success: Boolean!
  customerId: String!
  sourceId: String!
  chargeInfo: Stripe_Charge_Input
}

input Stripe_Charge_Input {
  id: String!
  object: String!
  amount: Int!
  amount_refunded: Int!
  application: String
  application_fee: String
  balance_transaction: String!
  captured: Boolean!
  created: Int!
  currency: String!
  customer: String!
  description: String!
  destination: String
  dispute: String
  failure_code: String
  failure_message: String
  fraud_details: Stripe_FraudDetailsInput
  invoice: String
  livemode: Boolean!
  metadata: Stripe_Metadata_Input
  on_behalf_of: String
  order: String
  outcome: Stripe_Outcome_Input
  paid: Boolean!
  receipt_email: String!
  receipt_number: String
  refunded: Boolean!
  refunds: [Stripe_Refunds_Input!]!
  review: String
  shipping: Stripe_Shipping_Input
  source: Stripe_Card_Input
  source_transfer: String!
  statement_descriptor: String!
  status: String!
  transfer_group: String
}

input Stripe_FraudDetailsInput {
  user_report: String
  stripe_report: String
}

input Stripe_Metadata_Input {
  charset: String
  content: String
}

input Stripe_Outcome_Input {
  network_status: String!
  reason: String!
  risk_level: String
  risk_score: Int
  rule: String
  seller_message: String!
  type: String!
}

input Stripe_Refunds_Input {
  object: String!
  data: [Stripe_Refund_Input!]!
  has_more: Boolean!
  url: String
}

input Stripe_Shipping_Input {
  address: Stripe_Address_Input
  carrier: String
  name: String
  phone: String
  tracking_number: String
}

input Stripe_Card_Input {
  id: String
  object: String
  address_city: String
  address_country: String
  address_line1: String
  address_line1_check: String
  address_line2: String
  address_state: String
  address_zip: String
  address_zip_check: String
  brand: String
  country: String
  cvc_check: String
  dynamic_last4: String
  exp_month: Int
  exp_year: Int
  fingerprint: String
  funding: String
  last4: String
  metadata: Stripe_Metadata_Input
  name: String
  tokenization_method: String
}

input Stripe_Refund_Input {
  id: String!
  object: String!
  amount: Int!
  balance_transaction: String!
  charge: String!
  created: Date
  currency: String!
  failure_balance_transaction: String
  failure_reason: String
  metadata: Stripe_Metadata_Input
  reason: String!
  receipt_number: String!
  status: String!
}

input Stripe_Address_Input {
  city: String
  country: String
  line1: String
  line2: String
  postal_code: String
  state: String
}

input DomainInput {
  id: String
  tld: String!
  enabled: Boolean!
  createdAt: Date
  updatedAt: Date
}

input FunnelUserOrderInput {
  user: UserWithPasswordInput!
  address: AddressInput!
  product: String!
  card: CreditCardInput!
}

input RegisterAndSubscribeInput {
  values: FunnelUserOrderInput!
  fid: String!
  aid: String!
  step: Int!
}

input UserWithPasswordInput {
  email: String!
  firstName: String!
  lastName: String!
  password: String!
  phone: String!
  confirmPassword: String!
}

input CreditCardInput {
  number: String!
  month: String!
  year: String!
  cvc: String!
}

input ProductPromoCodeInput {
  code: String!
  discountType: String!
  discountAmount: Float!
}

input UserInput {
  firstName: String!
  lastName: String!
  username: String
  email: String!
  password: String
  phone: String
  roles: [String!]
  address: AddressInput
  active: Boolean
}

input DateFilter {
  value: Date
  filter: String
}

input SponsorAssignmentInput {
  affiliate: UserReferenceInput!
  newSponsor: UserReferenceInput
  isNoSponsor:Boolean
}

input AddressAndCreditCardInput {
  address: AddressInput!
  card: CreditCardInput!
}

input GreeceReservationInput {
  guests: [ReservationGuestInput!]
  address: AddressInput!
  card: CreditCardInput!
}

input UserBasicsInput {
  id: String!
  firstName: String!
  lastName: String!
  email: String!
  uuid: String!
  phone: String
}`;
