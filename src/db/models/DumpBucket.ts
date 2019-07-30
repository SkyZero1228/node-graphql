export interface IDumpBucket {
  id?: string;
  userId?: string;
  payload: any;
}

export class DumpBucket implements IDumpBucket {
  constructor(public id?: string, public userId?: string, public payload: any = {}) {}
}
