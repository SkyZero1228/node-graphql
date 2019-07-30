import Roles from '../../roles';
import { Context, verifyAccess } from '../../utils';
import { Document, IDocument } from '../../db/models/Document';

export default {
  async addDocument(_parent, args: IDocument, { session, req }: Context): Promise<IDocument> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);

    const document = new Document(null, args.type, args.url, args.displayOrder, args.images, args.active);
    await session.store(document);
    await session.saveChanges();
    return document;
  },
};
