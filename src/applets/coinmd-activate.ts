const node_xj = require('xls-to-json');
import * as path from 'path';
import { User } from '../db/models/User';
import { initializeStore } from '../db/config';
import { capitalizeEachFirstLetter, getNowUtc } from '../utils';
import { IUser } from '../interfaces/users';
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq } from 'lodash';
import { PatchByQueryOperation } from 'ravendb';
import { getIdWithoutCollection, getAncestorsWithCollection, getAncestorsAsArray, appendUserIdToAncestors, getAncestorLevelsUp } from '../helpers/user';
import { UserSubscription } from '../db/models/UserSubscription';
import moment = require('moment');

var api_key = '...';
var example_list_id = '...';

// var mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');

(async () => {
  try {
    const store = await initializeStore();

    try {
      const session = store.openSession();
      const subscriptions = await session.query<UserSubscription>({ collection: 'UserSubscriptions' }).all();
      const userIds = subscriptions.map(us => us.user.id);
      const users = await session.load<User>(userIds);
      subscriptions.map(sub => {
        const user = users[sub.user.id];
        if (user.active === false) console.log(user.id);
        user.active = true;
        user.updatedAt = moment().toDate();
      });
      await session.saveChanges();
      process.exit(0);
    } catch (ex) {
      console.log(ex.message);
      process.exit(1);
    }
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
