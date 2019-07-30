const node_xj = require('xls-to-json');
import * as path from 'path';
import { User } from '../db/models/User';
import { initializeStore } from '../db/config';
import { capitalizeEachFirstLetter, getNowUtc } from '../utils';
import { IUser } from '../interfaces/users';
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq, filter } from 'lodash';
import { PatchByQueryOperation } from 'ravendb';
import { getIdWithoutCollection, getAncestorsWithCollection, getAncestorsAsArray, appendUserIdToAncestors, getAncestorLevelsUp } from '../helpers/user';
import { UserSubscription } from '../db/models/UserSubscription';
import moment = require('moment');
import coinMd from '../resolvers/Mutations/coinMd';

var api_key = '...';
var example_list_id = '...';

// var mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');

function fixChildren(users, sponsor) {
  console.log('sponsor', sponsor.id, sponsor.firstName, sponsor.lastName);
  const children = filter(users, user => {
    return user.coinMD.sponsorMemberNumber === sponsor.coinMD.memberNumber;
  });
  console.log('children', children.length);
  for (let i = 0; i < children.length; i++) {
    const user = children[i];
    console.log('user, sponsor', user.id, sponsor.id);
    user.ancestry.ancestors = appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors);
    user.ancestry.depth = sponsor.ancestry.depth + 1;
    user.ancestry.parentUserId = sponsor.id;
    console.log('depth and ancestors: ', user.ancestry.depth, user.ancestry.ancestors);
    fixChildren(users, user);
  }
}

(async () => {
  try {
    const store = await initializeStore();
    const session = store.openSession();
    try {
      // create a query
      const query = session.query({ indexName: 'Users' });

      let users: IUser[] = [];
      let stats;
      // stream() returns a Readable
      // get query stats passing a stats callback to stream() method
      const queryStream = await session.advanced.stream(query, _ => (stats = _));

      queryStream.on('data', user => {
        // User { name: 'Anna', id: 'users/1-A' }
        if (!user.document.ancestry) {
          console.log(user.document.id);
          users.push(user.document);
        }
      });

      // get stats using an event listener
      queryStream.once('stats', stats => {
        console.log('stats', stats);
        // { resultEtag: 7464021133404493000,
        //   isStale: false,
        //   indexName: 'Auto/users/Byage',
        //   totalResults: 1,
        //   indexTimestamp: 2018-10-01T09:04:07.145Z }
      });

      queryStream.on('error', err => {
        // handle errors
        console.log('error', err);
      });

      queryStream.on('end', async err => {
        // handle errors
        console.log('end', users.length);

        for (let user of users) {
          user.ancestry = {
            depth: 1,
          };

          // fixChildren(users, user);

          // const sponsor = find(users, findUser => {
          //   return findUser.coinMD.memberNumber === user.coinMD.sponsorMemberNumber;
          // });
          // if (sponsor) {
          //   if (user.ancestry.depth !== sponsor.ancestry.depth + 1) {
          //     console.log('depth not right', user.id, user.ancestry.depth, sponsor.ancestry.depth, appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors));
          //     user.ancestry.ancestors = appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors);
          //     user.ancestry.depth = sponsor.ancestry.depth + 1;
          //     user.ancestry.parentUserId = sponsor.id;
          //   }
          // } else {
          //   console.log('sponsor not found', user);
          // }
        }

        console.log('for/of done');
        console.log('Starting to tryBulkUpdate', users.length);
        const tryBulkUpdate = store.bulkInsert();
        for (const user of users) {
          await tryBulkUpdate.store(user, user.id);
        }
        console.log('Wrapping Up tryBulkUpdate', users.length);
        await tryBulkUpdate.finish();
        process.exit(0);
      });
    } catch (ex) {
      console.log(ex.message);
    }
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
