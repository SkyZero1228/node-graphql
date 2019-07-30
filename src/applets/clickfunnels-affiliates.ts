const node_xj = require('xls-to-json');
import * as path from 'path';
import { User, Sponsor, Ancestry } from '../db/models/User';
import { initializeStore } from '../db/config';
import { capitalizeEachFirstLetter, getNowUtc } from '../utils';
import { IUser } from '../interfaces/users';
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq } from 'lodash';
import { PatchByQueryOperation, AwaitableMaintenanceOperation, IDocumentStore } from 'ravendb';
import { getIdWithoutCollection, getAncestorsWithCollection, getAncestorsAsArray, appendUserIdToAncestors, getAncestorLevelsUp } from '../helpers/user';
import { v4 } from 'uuid';

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

var processTier1And2 = async function(store: IDocumentStore, tier1: any, tier2: any): Promise<any> {
  for (let row of tier2) {
    if (row.Email) {
      const level1Customer = row.Email;
      const level1Affiliate = row['Referring Affiliates Email'].toLowerCase();
      const level2AffiliateRow = find(tier1, row => {
        return row.Email === level1Customer;
      });
      const level2Affiliate = level2AffiliateRow['Referring Affiliates Email'].toLowerCase();
      const level2Customer = level2AffiliateRow.Email.toLowerCase();

      console.log(level1Customer, level1Affiliate, level2Customer, level2Affiliate);
      const session = store.openSession();

      const level1 = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('email', level1Affiliate)
        .firstOrNull();

      console.log('************** LEVEL 1 ****************', level1.email, row['%']);

      const sponsor = new Sponsor(level1.id, level1.email, level1.firstName, level1.lastName);
      const ancestry = new Ancestry(level1.ancestry.depth + 1, level1.id, appendUserIdToAncestors(level1.id, level1.ancestry.ancestors));

      // console.log(sponsor);
      // console.log(ancestry);

      const level2 = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('email', level2Affiliate)
        .firstOrNull();

      console.log('************** LEVEL 2 ****************', level2.email, level2AffiliateRow['%']);

      level2.sponsor = sponsor;
      level2.ancestry = ancestry;
      await session.saveChanges();
    }
  }
};

const processTier1 = async (store: IDocumentStore, tier1: any): Promise<any> => {
  for (let row of tier1) {
    if (row.Email) {
      const level1Customer = row.Email.toLowerCase();
      const level1Affiliate = row['Referring Affiliates Email'].toLowerCase();

      if (level1Customer && level1Affiliate) {
        console.log(level1Customer, level1Affiliate);
        const session = store.openSession();

        const level1 = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('email', level1Affiliate)
          .firstOrNull();

        const level2 = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('email', level1Customer)
          .firstOrNull();

        if (level1 && level2) {
          console.log('************** LEVEL 1 ****************', level1.email, row['%']);

          const sponsor = new Sponsor(level1.id, level1.email, level1.firstName, level1.lastName);
          const ancestry = new Ancestry(level1.ancestry.depth + 1, level1.id, appendUserIdToAncestors(level1.id, level1.ancestry.ancestors));

          // console.log(sponsor);
          // console.log(ancestry);

          console.log('************** LEVEL 2 ****************', level1Customer);

          level2.sponsor = sponsor;
          level2.ancestry = ancestry;
          // await session.saveChanges();
        } else {
          if (!level1) {
            console.log('?????????????????????????????????????????????????????????????????? level1 >>>>>>>', level1Affiliate);
          }
          if (!level2) {
            console.log('?????????????????????????????????????????????????????????????????? level2 >>>>>>>', level1Customer);
          }
        }
      }
    }
  }
};

(async () => {
  try {
    const store = await initializeStore();

    try {
      let tier1 = await getUserFromExcel('Affiliate Tier 1', 'TV-Master-Tracking-Sheet-Latest.xlsx');
      console.log('Part 1', tier1.length);

      let tier2 = await getUserFromExcel('Affiliate Tier 2', 'TV-Master-Tracking-Sheet-Latest.xlsx');
      console.log('Part 2', tier2.length);

      // console.log('Removing Duplicate Emails', usersFromExcel.length);
      // usersFromExcel = uniqBy(usersFromExcel, 'Referring Affiliates Email'); //.filter((user, index, self) => self.findIndex(item => item.email === user.email) === index)
      // console.log('Removing Duplicate Emails - Done', usersFromExcel.length);

      // await processTier1And2(store, tier1, tier2);
      await processTier1(store, tier2);

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
