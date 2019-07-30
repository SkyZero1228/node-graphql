import { Context, verifyAccess } from '../../utils';
import { FrequentlyAskedQuestion, IFrequentlyAskedQuestion } from '../../db/models/FrequentlyAskedQuestion';
import Roles from '../../roles';

export default {
  async addFrequentlyAskedQuestion(_parent, args: IFrequentlyAskedQuestion, { session, req }: Context): Promise<IFrequentlyAskedQuestion> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    const frequentlyAskedQuestion = new FrequentlyAskedQuestion(null, args.question, args.answer);
    await session.store(frequentlyAskedQuestion);
    await session.saveChanges();
    return frequentlyAskedQuestion;
  },

  async editFrequentlyAskedQuestion(_parent, args: IFrequentlyAskedQuestion, { session, req }: Context) {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let frequentlyAskedQuestion = await session.load<FrequentlyAskedQuestion>(args.id);
    if (!frequentlyAskedQuestion) {
      return null;
    }

    Object.assign(frequentlyAskedQuestion, { ...args });
    await session.saveChanges();
    return frequentlyAskedQuestion;
  },
};
