import * as moment from 'moment';

export interface IHealthCheck {
  id?: string;
  createdAt?: Date;
  payload: any;
}

export class HealthCheck implements IHealthCheck {
  constructor(
    public id?: string,
    public createdAt: Date = moment()
      .utc()
      .toDate(),
    public payload: any = {}
  ) { }
}
