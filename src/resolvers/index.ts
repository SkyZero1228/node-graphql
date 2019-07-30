import { queries } from '../resolvers/Queries';
import { mutations } from '../resolvers/Mutations';
import { dateResolver } from './Scalars/date';

export default {
  Query: queries,
  Mutation: mutations,
  Date: dateResolver.Date,
  EpochDate: dateResolver.EpochDate,
};
