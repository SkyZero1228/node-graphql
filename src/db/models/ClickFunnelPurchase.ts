export interface IClickFunnelPurchase {
  id?: string;
  userId?: string;
  payload: any;
}

export class ClickFunnelPurchase implements IClickFunnelPurchase {
  constructor(public id?: string, public userId?: string, public payload: any = {}) {}
}
