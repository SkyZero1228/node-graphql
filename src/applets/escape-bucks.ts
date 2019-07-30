const node_xj = require('xls-to-json');
import * as path from 'path';
import { User } from '../db/models/User';
import { initializeStore } from '../db/config';
import { capitalizeEachFirstLetter, getNowUtc } from '../utils';
import { IUser } from '../interfaces/users';
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq } from 'lodash';
import { PatchByQueryOperation, AwaitableMaintenanceOperation } from 'ravendb';
import {
  getIdWithoutCollection,
  getAncestorsWithCollection,
  getAncestorsAsArray,
  appendUserIdToAncestors,
  getAncestorLevelsUp,
} from '../helpers/user';
import { v4 } from 'uuid';
import { EscapeBuck } from '../db/models/EscapeBuck';

var api_key = '...';
var example_list_id = '...';

// var mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');

var getUserFromExcel = function(sheet: string, filename: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    node_xj(
      {
        input: path.resolve(`./env/${filename}`),
        output: null,
        sheet: sheet,
      },
      async function(err, result: any[]) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
};

(async () => {
  try {
    const store = await initializeStore();

    try {
      let usersFromExcel = await getUserFromExcel('5 % ESCAPE BUCKS EARNED PER REP', 'Escapes.xlsx');
      console.log('Starting...', usersFromExcel.length);

      for (let escapeBucksUser of usersFromExcel) {
        const session = store.openSession();

        let memberEmail = escapeBucksUser['Email'];
        if (memberEmail) {
          const user = await session
            .query<User>({ indexName: 'Users' })
            .whereEquals('email', memberEmail.toLowerCase())
            .firstOrNull();
          if (user) {
            const userReference = { email: user.email, firstName: user.firstName, id: user.id, lastName: user.lastName };
            const value = parseInt(escapeBucksUser['Value'].replace('$', ''));
            const orderReference = { funnel: null, id: null, products: [], orderTotal: value * 100 };
            const escapeBucks = new EscapeBuck(userReference, orderReference, parseFloat((value * 0.05).toFixed(2)));

            await session.store(escapeBucks);
            await session.saveChanges();
          } else {
            console.log('User Not Found', escapeBucksUser);
          }
        } else {
          console.log('No Email Found on the xls', escapeBucksUser);
        }
        session.dispose();
      }

      console.log('Finished!');
      process.exit(0);
    } catch (ex) {
      console.log(ex.message);
      process.exit(1);
    }
    process.exit(0);
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
