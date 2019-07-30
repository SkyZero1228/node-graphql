import { Context, verifyAccess, getAppSettings } from '../../utils';
import Roles from '../../roles';
import { IAppSettings, AppSettings, AppSettingsCountryList, ICountryListItem, IAppSettingsCountryList } from '../../db/models/AppSettings';
import { IVideoTag } from '../../interfaces/videos';

export default {
  async getAppSettings(_parent, _args, { session, req }: Context): Promise<IAppSettings> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    return await session.load<AppSettings>('appSettings/1-A');
  },

  async getCategories(_parent, _args, { session, req }: Context): Promise<string[]> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const appSettings = await session.load<AppSettings>('appSettings/1-A');
    return appSettings.categories;
  },

  async getVideoTags(_parent, _args, { session, req }: Context): Promise<IVideoTag[]> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const appSettings = await session.load<AppSettings>('appSettings/1-A');
    return appSettings.tags;
  },

  async getPlans(_parent, _args, { session, req }: Context): Promise<string[]> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const appSettings = await session.load<AppSettings>('appSettings/1-A');
    // console.log('appSettings.plans', appSettings.plans);
    return appSettings.plans;
  },

  async getCountries(_parent, args, { session, req }: Context): Promise<ICountryListItem[]> {
    return (await getAppSettings<AppSettingsCountryList>(session, 'CountryList')).data;
  },
};
