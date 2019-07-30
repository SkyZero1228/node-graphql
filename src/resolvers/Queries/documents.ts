import { Context, verifyAccess } from '../../utils';
import * as DocumentInterfaces from '../../interfaces/documents';
import Roles from '../../roles';
import { Document, IDocument } from '../../db/models/Document';

export default {
  async getDocuments(_parent, { type, skip = 0, pageSize = 100 }: DocumentInterfaces.IGetDocuments, { session, req }: Context): Promise<Array<IDocument>> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);

    let query = session
      .query<Document>({ collection: 'Documents' })
      .skip(skip ? skip : 0)
      .take(pageSize ? pageSize : 25);

    if (type) query.whereEquals('type', type);

    return await query.all();
  },
};
