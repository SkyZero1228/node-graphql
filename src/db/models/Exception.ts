export interface IException {
  id?: string;
  anyId?: string;
  location?: string;
  errorMessage: string;
  data: any;
}

export class Exception implements IException {
  constructor(public id: string, public anyId?: string, public location?: string, public errorMessage: string = '', public data: any = {}) {}
}
