import { IEscapeBuck } from '../../interfaces/escapeBucks';
import { IOrderReference } from '../../interfaces/order';
import { IUserReference } from '../../interfaces/users';
import * as moment from 'moment';

export class EscapeBuck implements IEscapeBuck {
  public id?: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(public user: IUserReference = null, public order: IOrderReference = null, public bucks: number = 0) {
    this.createdAt =  moment().toDate();
    this.updatedAt = moment().toDate();
  }
}
