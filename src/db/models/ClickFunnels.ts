import * as moment from 'moment';

export interface IClickFunnel {
  id?: string;
  title: string;
  url: string;
  active: boolean;
}

export class ClickFunnel implements IClickFunnel {
  constructor(public id?: string, public title: string = '', public url: string = '', public active: boolean = true) {}
}
