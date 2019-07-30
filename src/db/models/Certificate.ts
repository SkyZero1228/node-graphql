import * as moment from 'moment';
import { IDocument } from './Document';
import { ICertificate, IAssuredTravelProduct, IUnlimitedCertificatesProduct, ISfxOffer } from '../../interfaces/certificates';

export class Certificate implements ICertificate {
  public assuredTravel?: IAssuredTravelProduct;
  public sfx?: ISfxOffer;
  public unlimitedCertificates?: IUnlimitedCertificatesProduct;
  public destinations?: number;

  constructor(public id?: string, public title: string = '', public description: string = '', public imageUrl: string = '', public membershipLevel: ('TVI BASIC' | 'TVI PLUS' | 'TVI PRO')[] = ['TVI PLUS'], public apiAccessToken: string = '', public active: boolean = true, public defaultMessage: string = '', public displayOrder: number = 0, public images: IImageContent[] = [], public documents: IDocument[] = [], public vendor: string = 'CMI') {}
}

export interface IImageContent {
  type: string;
  url: string;
  displayOrder: number;
}

export class ImageContent implements IImageContent {
  constructor(public type: string = '', public url: string = '', public displayOrder: number = 1) {}
}
