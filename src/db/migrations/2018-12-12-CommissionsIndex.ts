import { IDocumentStore } from 'ravendb';
import * as indexes from './indexes';

export default {
  name: '2018-12-12-CommissionsIndex',
  up: async (store: IDocumentStore) => {
    await store.executeIndex(new indexes.Commissions());
  },
  down: async () => {
    console.log('2018-12-12-CommissionsIndex > down');
  },
};
