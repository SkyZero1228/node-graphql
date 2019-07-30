import * as Stripe from 'stripe';
import axios from 'axios';
import { v1 } from 'uuid';
import * as vars from '../../env/vars';
import { GetIndexingStatusOperation } from 'ravendb';
import {
  IAssuredTravelRevokeCertificateRequest,
  IAssuredTravelRequestsBase,
  IAssuredTravelGetProductsRequest,
  IAssuredTravelGetProductsResponse,
  IAssuredTravelRequestCertificateRequest,
  IAssuredTravelRequestCertificateResponse,
  IAssuredTravelGetCertificateActivityRequest,
  IAssuredTravelGetCertificateStatusRequest,
  IAssuredTravelCertificateActivityResponse,
  IAssuredTravelCertificateStatusResponse,
  ISfxCertificateRequest,
  ISfxCertificateOrderResponse,
  ISfxGetOffersResponse,
} from '../interfaces/certificates';
import * as https from 'https';
import { nonInputTypeOnVarMessage } from 'graphql/validation/rules/VariablesAreInputTypes';
import { DumpBucket } from '../db/models/DumpBucket';

export const stripe = new Stripe(vars.PaymentApiKey || 'sk_test_XTuTqy34lZdK2N1Hwo78Owv2');

const settings = {
  messageTypes: {
    test: 'test',
    getProducts: 'getProducts',
    requestCertificate: 'requestCertificate',
    getCertificateActivity: 'getCertificateActivity',
    getCertificateStatus: 'getCertificateStatus',
    revokeCertificate: 'revokeCertificate',
  },
};

export async function test(data: IAssuredTravelRequestsBase): Promise<any> {
  const response = await axios.get(
    `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.test}&UserID=${vars.assuredTravel.userId}&UserMessageReference=${
      data.userMessageReference
    }`
  );
  return response.data;
}

export async function getProducts(data: IAssuredTravelGetProductsRequest): Promise<IAssuredTravelGetProductsResponse> {
  const url = `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.getProducts}&UserID=${
    vars.assuredTravel.userId
  }&UserMessageReference=${data.userMessageReference}`;
  console.log('url', url);
  const response = await axios.get(
    `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.getProducts}&UserID=${vars.assuredTravel.userId}&UserMessageReference=${
      data.userMessageReference
    }`,
    {
      headers: { XATPARTNERTOKEN: vars.assuredTravel.partnerToken },
    }
  );
  console.log(response.data);
  return response.data;
}

export async function getOffers(): Promise<ISfxGetOffersResponse> {
  const response = await axios.get(vars.sfx.getOffers, {
    headers: { 'X-SFX-PARTNER-TOKEN': vars.assuredTravel.partnerToken },
  });
  return response.data;
}

export async function requestCertificate(data: IAssuredTravelRequestCertificateRequest): Promise<IAssuredTravelRequestCertificateResponse> {
  try {
    const url = encodeURI(
      `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.requestCertificate}&UserID=${
        vars.assuredTravel.userId
      }&certificateTypeID=${data.certificateTypeId}&prospectID=${data.prospectID}&memberID=${data.memberId}&prospectEmailAddress=${
        data.prospectEmailAddress
      }&UserMessageReference=${data.userMessageReference}`
    );
    const response = await axios.get(url, {
      headers: { XATPARTNERTOKEN: vars.assuredTravel.partnerToken },
    });
    return response.data;
  } catch (ex) {
    throw ex;
  }
}

export async function requestSfxCertificate(data: ISfxCertificateRequest): Promise<ISfxCertificateOrderResponse> {
  try {
    const payload = {
      qty: 1,
      third_party_id: data.prospectID,
      offer_id: data.offerId,
      expiration: '12 months',
    };
    const response = await axios.post(vars.sfx.placeCertOrder, payload, {
      headers: { 'X-SFX-PARTNER-TOKEN': vars.sfx.partnerToken },
    });
    return response.data;
  } catch (ex) {
    throw ex;
  }
}

export async function getCertificateActivity(
  data: IAssuredTravelGetCertificateActivityRequest
): Promise<IAssuredTravelCertificateActivityResponse> {
  const response = await axios.get(
    `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.getCertificateActivity}&UserID=${vars.assuredTravel.userId}&fromDate=${
      data.fromDate
    }&endDate=${data.endDate}&UserMessageReference=${data.userMessageReference}`
  );
  return response.data;
}

export async function getCertificateStatus(
  data: IAssuredTravelGetCertificateStatusRequest
): Promise<IAssuredTravelCertificateStatusResponse> {
  const response = await axios.get(
    `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.getCertificateStatus}&UserID=${
      vars.assuredTravel.userId
    }&certificateNumber=${data.certificateNumber}&prospectID=${data.prospectId}&UserMessageReference=${data.userMessageReference}`
  );
  return response.data;
}

export async function revokeCertificate(data: IAssuredTravelRevokeCertificateRequest): Promise<any> {
  const response = await axios.get(
    `${vars.assuredTravel.url}?messagetype=${settings.messageTypes.revokeCertificate}&UserID=${
      vars.assuredTravel.userId
    }&certificateNumber=${data.certificateNumber}&prospectID=${data.prospectId}&reason=${data.reason}&UserMessageReference=${
      data.userMessageReference
    }`
  );
  return response.data;
}
