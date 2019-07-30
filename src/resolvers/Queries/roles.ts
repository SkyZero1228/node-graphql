import { Context, verifyAccess } from '../../utils';
import { IAppSettings, AppSettings } from '../../db/models/AppSettings';
import Roles from '../../roles';

export default {
  async getRoles(_parent, args, { session, req }: Context): Promise<string[]> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let appSettings = await session.query<AppSettings>({ collection: 'AppSettings' }).all();
    return appSettings[0].roles;
  },
};
