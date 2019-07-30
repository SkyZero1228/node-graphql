import { Context, verifyAccess } from '../../utils';
import { IFrequentlyAskedQuestion, FrequentlyAskedQuestion } from '../../db/models/FrequentlyAskedQuestion';
import Roles from '../../roles';

export default {
  async getFrequentlyAskedQuestions(_parent, _args, { session, req }: Context): Promise<IFrequentlyAskedQuestion[]> {
    verifyAccess(req, [Roles.TVIPlus, Roles.TVIPro, Roles.Administrator]);
    return await session
      .query<FrequentlyAskedQuestion>({ collection: 'FrequentlyAskedQuestions' })
      .whereEquals('active', true)
      .all();
  },
};
