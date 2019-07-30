import { IImageContent } from '../db/models/Certificate';
import { IDocument } from '../db/models/Document';

export interface IGetCertificates {
  skip: number;
  pageSize: number;
  membershipLevel?: ('TVI PLUS' | 'TVI PRO' | 'TVI BASIC')[];
}

export interface IGetCertificatesForProspect {
  searchTerm: string;
}

export interface IAddDocumentToCertificate {
  certificateId?: string;
  type: string;
  url: string;
  images: IImageContent[];
  displayOrder: number;
  active: boolean;
}

export interface ICertificateReference {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface IGetDocuments {
  type: string;
  skip: number;
  pageSize: number;
}

export interface ICertificate {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  membershipLevel: ('TVI PLUS' | 'TVI PRO' | 'TVI BASIC')[];
  apiAccessToken: string;
  active: boolean;
  destinations?: number;
  defaultMessage: string;
  displayOrder: number;
  images: IImageContent[];
  documents: IDocument[];
  createdAt?: Date;
  vendor: string;
  assuredTravel?: IAssuredTravelProduct;
  sfx?: ISfxOffer;
  unlimitedCertificates?: IUnlimitedCertificatesProduct;
  pdfContent?: ICertificatePdfContent;
}

export interface ICertificatePdfContent {
  title: string;
  description: string;
  base64: string;
}

export interface IAssuredTravelProduct {
  certificateTypeID: number;
  certificateTypeDescription: string;
  certificateRegistrationFee: number;
  maxDaysToRegister: number;
}

export interface IUnlimitedCertificatesProduct {
  url: string;
  maxDaysToRegister?: number;
}

export interface IAssuredTravelRequestCertificate {
  certificateTypeID: number;
  prospectID: string;
  memberID: string;
  prospectEmailAddress: string;
  userMessageReference?: string;
}

export interface IAssuredTravelActivity {
  activityType: 1 | 2 | 3 | 4 | 5; // - 1=Issued 2=Registered 3=Redeemed 4=Voided 5=Declined
  fromDate: string; //'MM/DD/YYYY'
  endDate: string; //'MM/DD/YYYY'
  userMessageReference?: string;
}

export interface IAssuredTravelStatus {
  certificateNumber: string;
  prospectID: string;
  userMessageReference?: string;
}

export interface IAssuredTravelRequestsBase {
  userMessageReference: string;
}

export interface IAssuredTravelTestRequest extends IAssuredTravelRequestsBase {}

export interface IAssuredTravelGetProductsRequest extends IAssuredTravelRequestsBase {}

export interface IAssuredTravelRequestCertificateRequest extends IAssuredTravelRequestsBase {
  certificateTypeId: number;
  memberId: string;
  prospectEmailAddress: string;
  prospectID: string;
}

export interface ISfxCertificateRequest {
  offerId: number;
  memberId: string;
  prospectEmailAddress: string;
  prospectID: string;
}

export interface IAssuredTravelGetCertificateActivityRequest extends IAssuredTravelRequestsBase {
  activityType: 1 | 2 | 3 | 4 | 5; // - 1=Issued 2=Registered 3=Redeemed 4=Voided 5=Declined
  fromDate: Date; //'MM/DD/YYYY'
  endDate: Date; //'MM/DD/YYYY'
}

export interface IAssuredTravelGetCertificateStatusRequest extends IAssuredTravelRequestsBase {
  certificateNumber: string;
  prospectId: string;
}

export interface IAssuredTravelRevokeCertificateRequest extends IAssuredTravelRequestsBase {
  certificateNumber: string;
  prospectId: string;
  reason: string;
}

export interface IAssureTravelResponseBase extends IAssuredTravelRequestsBase {
  status: number;
  error?: string;
}

export interface IAssuredTravelGetProductsResponse extends IAssureTravelResponseBase {
  certificateTypeID: number;
  certificateTypeDescription: string;
  certificateRegistrationFee: number;
  maxDaysToRegister: number;
}

export interface IAssuredTravelRequestCertificateResponse extends IAssureTravelResponseBase {
  certificateNumber: string;
  certificatePIN: number;
  certificateActivationCode: string;
  certificateRegistrationFee: number;
  maxDaysToRegister: number;
  registrationURL: string;
}

export interface ISfxGetOffersResponse {
  status: number;
  offers: ISfxOffer[];
  // {
  //   "status": 1,
  //   "offers": [
  //       {
  //           "offer_id": 239,
  //           "name": "Resort Vacation - 7 Nights - Studio",
  //           "description": "A Seven Night Stay for up to Two Adults and Two Children Ages 11 and Younger in a Resort Studio.                                      ",
  //           "comments": "Copy of offer #104",
  //           "length_of_stay": "7",
  //           "room_type": "S",
  //           "retail_value": "2793",
  //           "retail_price": "0",
  //           "price_adjust": {
  //               "type": "=",
  //               "amount": "350"
  //           },
  //           "price": "Set price to $350"
  //       },
  //       {
  //           "offer_id": 238,
  //           "name": "Resort Vacation - 4 Nights - Studio",
  //           "description": "A Four Night Stay for up to Two Adults and Two Children Ages 11 and Younger in a Resort Studio.                                                                          ",
  //           "comments": "Copy of offer #103",
  //           "length_of_stay": "4",
  //           "room_type": "S",
  //           "retail_value": "1596",
  //           "retail_price": "0",
  //           "price_adjust": {
  //               "type": "=",
  //               "amount": "200"
  //           },
  //           "price": "Set price to $200"
  //       }
  //   ]
  // }
}

export interface ISfxOffer {
  offer_id: number;
  name: string;
  description: string;
  comments: string;
  length_of_stay: string;
  room_type: string;
  retail_value: string;
  retail_price: string;
  price_adjust: ISfxPriceAdjust;
  price: string;
}

export interface ISfxPriceAdjust {
  type: string;
  amount: string;
}

export interface ISfxCertificateOrderResponse {
  error?: string;
  status: number;
  order: ISfxCertificateOrderResponse;
  certs: ISfxCertificate[];
  // {
  //   "status": 1,
  //   "order": {
  //       "id": "1067",
  //       "third_party_id": "prospects/123-A",
  //       "qty": 1,
  //       "offer_id": 239,
  //       "price_each": null,
  //       "expiration": "12 months"
  //   },
  //   "certs": [
  //       {
  //           "code": "TRPV-0239-EV26-XE75",
  //           "request_id": 558391,
  //           "expires": "2020-03-27 04:59:21",
  //           "status": "new"
  //       }
  //   ]
  // }
}

export interface ISfxCertificate {
  code: string;
  request_id: number;
  expires: Date;
  status: string;
}
export interface ISfxCertificateOrderResponse {
  id: string;
  third_party_id: string;
  qty: number;
  offer_id: number;
  price_each: number;
  expiration: string;
}

export interface IAssuredTravelCertificateActivityResponse {
  status: number;
  error?: string;
  userMessageReference?: string;
  items: string[];
  activityType: 'issued' | 'registered' | 'redeemed' | 'voided' | 'declined';
  Note: string;
  activityDateStamp: Date;
  certificateNumber: string;
  prospectID: string;
}

export interface IAssuredTravelCertificateStatusResponse {
  status: number;
  error?: string;
  userMessageReference?: string;
  certificateNumber: string;
  currentCertificateStatus: 'new' | 'activated' | 'redeemed' | 'deactivated';
}

export interface IAssuredTravelRevokeCertificateResponse {
  certificateNumber: string;
  currentCertificateStatus: string; // should always be "deactivated"
}
