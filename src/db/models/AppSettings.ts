import { IVideoTag } from '../../interfaces/videos';

export interface IMigration {
  executedOn: Date;
  migration: string;
}

export interface IAppSettingsData {
  data: any;
}

export interface ICountryListItem {
  name: string;
  code: string;
  phone_code: string;
}

export interface IAppSettingsCountryList {
  data: ICountryListItem[];
}

export interface IAppSettings {
  id?: string;
  categories: string[];
  tags: IVideoTag[];
  roles?: string[];
  sorAccount?: string[];
  plans?: string[];
  migrations?: IMigration[];
}

export class AppSettings implements IAppSettings {
  public roles?: string[];
  public sorAccount?: string[];
  public plans?: string[];
  public migrations?: IMigration[];

  constructor(public id?: string, public categories: string[] = [], public tags: IVideoTag[] = []) {}
}

export class AppSettingsCountryList implements IAppSettingsCountryList {
  constructor(public data: ICountryListItem[]) {}
}
