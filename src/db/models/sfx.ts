import { IAssuredTravelRequestsBase, IAssuredTravelTestRequest, IAssuredTravelGetProductsRequest, ISfxCertificateRequest, IAssuredTravelGetCertificateActivityRequest, IAssuredTravelGetCertificateStatusRequest, IAssuredTravelRevokeCertificateRequest, IAssuredTravelRequestCertificateRequest } from '../../interfaces/certificates';

export class AssuredTravelTest implements IAssuredTravelRequestsBase {
  constructor(public userMessageReference: string) {}
}

export class AssuredTravelTestRequest implements IAssuredTravelTestRequest {
  constructor(public userMessageReference: string) {}
}

export class AssuredTravelGetProductsRequest implements IAssuredTravelGetProductsRequest {
  constructor(public userMessageReference: string) {}
}

export class AssuredTravelRequestCertificateRequest implements IAssuredTravelRequestCertificateRequest {
  constructor(public certificateTypeId: number, public memberId: string, public prospectEmailAddress: string, public prospectID: string, public userMessageReference: string) {}
}

export class SfxCertificateOrderRequest {
  constructor(public offerId: number, public memberId: string, public prospectEmailAddress: string, public prospectID: string) {}
}

export class AssuredTravelGetCertificateActivityRequest implements IAssuredTravelGetCertificateActivityRequest {
  constructor(public activityType: 1 | 2 | 3 | 4 | 5, public fromDate: Date, public endDate: Date, public userMessageReference: string) {}
}

export class AssuredTravelGetCertificateStatusRequest implements IAssuredTravelGetCertificateStatusRequest {
  constructor(public certificateNumber: string, public prospectId: string, public userMessageReference: string) {}
}

export class AssuredTravelRevokeCertificateRequest implements IAssuredTravelRevokeCertificateRequest {
  constructor(public certificateNumber: string, public prospectId: string, public reason: string, public userMessageReference: string) {}
}
