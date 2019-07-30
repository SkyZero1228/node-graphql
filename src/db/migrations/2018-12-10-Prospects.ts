import { IDocumentStore } from 'ravendb';
import * as indexes from './indexes';

export default {
  name: '2018-12-10-Prospects',
  up: async (store: IDocumentStore) => {
    await store.executeIndex(new indexes.Prospects());
  },
  down: async (store: IDocumentStore) => {
    console.log('2018-12-10-Prospects > down');
  },
};
