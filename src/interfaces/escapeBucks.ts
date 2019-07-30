import { IUserReference } from './users';
import { IOrderReference } from './order';

export interface IEscapeBuck {
  id?: string;
  user: IUserReference;
  order: IOrderReference;
  bucks: number; // <----this is 5% of the total order amount
  updatedAt?: Date;
  createdAt?: Date;
}

export interface IGetAllEscapeBucks {
  escapeBucks: IEscapeBuck[];
  totalRows: number;
  bucks: number;
}

export interface ITotalEscapeBucksByUserID {
  userId: string;
  bucks: number;
}
