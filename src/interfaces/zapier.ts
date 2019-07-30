export interface Purchase {
  stripe_customer_token: string;
  taxamo_transaction_key: string;
  product_ids: string;
  payment_method_nonce: string;
  order_saas_url: string;
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
  disambiguate_symbol: string;
  smallest_denomination: string;
  iso_code: string;
  subunit: string;
  id: string;
}

export interface Index {
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

export interface Store {
  index: Index;
  in_transaction: string;
}

export interface Bank {
  currency_string: string;
  rates_updated_at: Date;
  last_updated: Date;
  store: Store;
  rounding_method: string;
}

export interface OriginalAmount {
  currency: Currency;
  bank: Bank;
  fractional: string;
}

export interface Currency2 {
  priority: number;
  html_entity: string;
  name: string;
  alternate_symbols: string[];
  subunit_to_unit: number;
  symbol_first: boolean;
  symbol: string;
  thousands_separator: string;
  decimal_mark: string;
  iso_numeric: string;
  disambiguate_symbol: string;
  smallest_denomination: number;
  iso_code: string;
  subunit: string;
  id: string;
}

export interface Index2 {
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
  EUR_TO_EUR: number;
  EUR_TO_CNY: string;
}

export interface Mutex {}

export interface Options {}

export interface Store2 {
  index: Index2;
  mutex: Mutex;
  options: Options;
  in_transaction: boolean;
}

export interface Bank2 {
  currency_string: string;
  rates_updated_at: Date;
  last_updated: Date;
  store: Store2;
  rounding_method: string;
}

export interface Amount {
  currency: Currency2;
  bank: Bank2;
  fractional: string;
}

export interface Product {
  billing_integration: string;
  ontraport_invoice_id: string;
  name: string;
  bump: boolean;
  updated_at: Date;
  braintree_cancel_after_payments: string;
  ontraport_product_id: string;
  ontraport_unit: string;
  braintree_plan: string;
  thank_you_page_id: number;
  statement_descriptor: string;
  ontraport_payment_type: string;
  subject: string;
  commissionable: boolean;
  ontraport_payment_count: string;
  cart_product_id: string;
  created_at: Date;
  ontraport_gateway_id: string;
  id: number;
  infusionsoft_subscription_id: string;
  amount: Amount;
  stripe_plan: string;
  amount_currency: string;
  stripe_cancel_after_payments: number;
  infusionsoft_product_id: string;
  html_body: string;
}

export interface IClickFunnelsRootZapierObject {
  stripe_customer_token: string;
  updated_at: Date;
  oap_customer_id: string;
  ctransreceipt: string;
  fulfillment_id: string;
  taxamo_amount: string;
  event: string;
  nmi_customer_vault_id: string;
  original_amount_currency: string;
  id: string;
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
  products: Product[];
  member_id: string;
}
