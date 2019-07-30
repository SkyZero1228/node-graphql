export interface ISubscription {
  invoice: ICoinMdInvoice;
}

export interface ICoinMdInvoice {
  billingInfo: IBillingAndCardInput;
  user: ICoinMdUserReference;
  totalAmount: number;
  planId: string;
}

export interface ICoinMdUserReference {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  password: string;
}

export interface IBillingAndCardInput {
  firstNameOnCard: string;
  lastNameOnCard: string;
  agreement: boolean;
  ccAddress1: string;
  ccAddress2: string;
  ccCity: string;
  ccExpMonth: string;
  ccExpYear: string;
  card: string;
  ccPostalCode: string;
  ccState: string;
  cvc: string;
}

export interface Result {
  success: boolean;
  message?: string;
}
