export interface IClickFunnelsWebHook {
  id?: string;
  payload: any;
}

export class ClickFunnelsWebHook implements IClickFunnelsWebHook {
  constructor(public id?: string, public payload: any = {}) {}
}
