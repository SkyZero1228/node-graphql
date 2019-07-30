import { IImageContent } from './Certificate';

export interface IDocument {
  id?: string;
  type: string;
  url: string;
  images: IImageContent[];
  displayOrder: number;
  active: boolean;
}

export class Document implements IDocument {
  constructor(public id: string, public type: string = '', public url: string = '', public displayOrder: number = 1, public images: IImageContent[] = [], public active: boolean = false) {}
}
