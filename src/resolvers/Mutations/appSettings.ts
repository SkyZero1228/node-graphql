import { Context, verifyAccess } from '../../utils';
import { AppSettings, IAppSettings } from '../../db/models/AppSettings';
import Roles from '../../roles';

export default {
  async addAppSettings(_parent, args: IAppSettings, { session, req }: Context): Promise<IAppSettings> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const appSettings = new AppSettings(null, args.categories);
    await session.store(appSettings);
    await session.saveChanges();
    return appSettings;
  },

  async editAppSettings(_parent, args, { session, req }: Context) {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let appSettings = await session.query<AppSettings>({ collection: 'appSettings' }).firstOrNull();
    if (!appSettings) {
      return null;
    }

    Object.assign(appSettings, { ...args });
    await session.saveChanges();
    return appSettings;
  },
};
