const node_xj = require('xls-to-json');
import * as path from 'path';
import { User } from '../db/models/User';
import { initializeStore } from '../db/config';
import { capitalizeEachFirstLetter, getNowUtc } from '../utils';
import { IUser } from '../interfaces/users';
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq } from 'lodash';
import { PatchByQueryOperation, AwaitableMaintenanceOperation } from 'ravendb';
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

(async () => {
  try {
    const store = await initializeStore();

    try {
      let usersFromExcel = await getUserFromExcel('New Members since Oct 16', 'TripValet-CoinMD-Enrollments-Since-10-16.xlsx');
      console.log('Part 1', usersFromExcel.length);

      usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('TripValet Data Dump', 'TripValet-CoinMD-Enrollments-10-19.xlsx')));
      console.log('Part 2', usersFromExcel.length);

      usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('TripValet Data File', 'TripValet-CoinMD-Enrollments-Oct-20-21.xlsx')));
      console.log('Part 3', usersFromExcel.length);

      usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('xData File - TripValet', '01-TripValet-CoinMD-Enrollments-Oct26-Nov14.xlsx')));
      console.log('Part 4', usersFromExcel.length);

      usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('TripValet', '02-TripValet-CoinMD-Enrollments-Nov15-Nov19.xlsx')));
      console.log('Part 5', usersFromExcel.length);

      usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('TripValet', '03-TripValet-CoinMD-Enrollments-Nov20-Nov25.xlsx')));
      console.log('Part 6', usersFromExcel.length);

      console.log('Removing Duplicate Emails', usersFromExcel.length);
      usersFromExcel = uniqBy(usersFromExcel, 'Email Address'); //.filter((user, index, self) => self.findIndex(item => item.email === user.email) === index)
      console.log('Removing Duplicate Emails - Done', usersFromExcel.length);

      let users: IUser[] = [];
      let invalidSponsors: IUser[] = [];

      for (let coinMdUser of usersFromExcel) {
        const session = store.openSession();

        const sponsor = await session
          .query<User>({ indexName: 'Users' })
          .whereEquals('email', coinMdUser['Sponsor Email'].toLowerCase())
          .firstOrNull();

        if (!sponsor) {
          console.log('Sponsor Not Found', coinMdUser['Email Address']);
          invalidSponsors.push(coinMdUser);
        } else {
          const existingUser = await session
            .query<User>({ indexName: 'Users' })
            .whereEquals('email', coinMdUser['Email Address'].toLowerCase())
            .firstOrNull();
          if (!existingUser) {
            const newUser = new User(null, v4(), capitalizeEachFirstLetter(coinMdUser.FirstName.trim()), capitalizeEachFirstLetter(coinMdUser.LastName.trim()), coinMdUser.Username.toLowerCase(), coinMdUser['Email Address'].toLowerCase(), coinMdUser.Username.toLowerCase(), false, [], null, null, false, coinMdUser['Phone Number'].trim(), ['CoinMD Member', 'Affiliate'], null, null, null);
            newUser.coinMD = {
              memberNumber: +coinMdUser['Member Number'],
              sponsorMemberNumber: +coinMdUser['Sponsor Number'],
              sponsorEmail: coinMdUser['Sponsor Email'],
              sponsorUsername: coinMdUser['Sponsor Username'],
            };
            newUser.ancestry = {
              ancestors: appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors),
              depth: sponsor.ancestry.depth + 1,
              parentUserId: sponsor.id,
            };
            newUser.sponsor = {
              id: sponsor.id,
              firstName: sponsor.firstName,
              lastName: sponsor.lastName,
              email: sponsor.email,
            };
            await session.store(newUser);
            await session.saveChanges();
            console.log('.');
            users.push(newUser);
          } else {
            existingUser.sponsor = {
              id: sponsor.id,
              firstName: sponsor.firstName,
              lastName: sponsor.lastName,
              email: sponsor.email,
            };
            await session.saveChanges();
            console.log('user already exists', coinMdUser['Email Address'].toLowerCase());
          }
        }
        session.dispose();
      }

      // return true;

      // console.log('getIdWithoutCollection("users/23-A")', getIdWithoutCollection('users/23-A'));
      // console.log('getAncestorsWithCollection("23-A,355-A,1223-A,14332-A")', getAncestorsWithCollection('23-A,355-A,1223-A,14332-A'));
      // console.log('getAncestorsAsArray("23-A,355-A,1223-A,14332-A")', getAncestorsAsArray('23-A,355-A,1223-A,14332-A'));
      // console.log('appendUserIdToAncestors("users/44256-A", "23-A,355-A,1223-A,14332-A")', appendUserIdToAncestors('users/44256-A', '23-A,355-A,1223-A,14332-A'));
      // console.log('getAncestorsLevelsUp("23-A,355-A,1223-A,14332-A")', getAncestorsLevelsUp('23-A,355-A,1223-A,14332-A'));
      // console.log('getAncestorsLevelsUp("23-A,355-A,1223-A")', getAncestorsLevelsUp('23-A,355-A,1223-A'));
      // console.log('getAncestorsLevelsUp("23-A,355-A")', getAncestorsLevelsUp('23-A,355-A'));
      // console.log('getAncestorsLevelsUp("23-A")', getAncestorsLevelsUp('23-A'));
      // console.log('getAncestorsLevelsUp("")', getAncestorsLevelsUp(''));

      // console.log(usersFromExcel.length, usersFromExcel[0]);
      // for (let coinMdUser of usersFromExcel) {
      //   const newUser = new User(null, capitalizeEachFirstLetter(coinMdUser.FirstName.trim()), capitalizeEachFirstLetter(coinMdUser.LastName.trim()), coinMdUser.Username, coinMdUser['Email Address'].toLowerCase(), coinMdUser.Username.toLowerCase(), false, [], null, true, coinMdUser['Phone Number'].trim(), ['CoinMD Member'], null, null, null);
      //   newUser.coinMD = {
      //     memberNumber: +coinMdUser['Member Number'],
      //     sponsorMemberNumber: +coinMdUser['Sponsor Number'],
      //     sponsorEmail: coinMdUser['Sponsor Email'],
      //     sponsorUsername: coinMdUser['Sponsor Username'],
      //   };
      //   newUser.ancestry = {
      //     depth: 1,
      //   };
      //   newUser.createdAt = getNowUtc();
      //   newUser.updatedAt = getNowUtc();
      //   users.push(newUser);
      // }

      // console.log('About To Patch');
      // const patchOperation = new PatchByQueryOperation(`from Users as u where startsWith(u.firstName, "${'test'}) update { var u.firstName = u.firstName + " | Patched" }`);
      // const op = await store.operations.send(patchOperation);
      // await op.waitForCompletion();
      // console.log('Patch Completed');

      // console.log('Starting to Bulk Insert', users.length);
      // const bulkInsert = store.bulkInsert();
      // for (const user of users) {
      //   await bulkInsert.store(user);
      // }
      // console.log('Wrapping Up', users.length);
      // await bulkInsert.finish();

      // for (let loadedUser of users) {
      //   loadedUser.ancestry = {
      //     depth: 1,
      //   };

      //   if (loadedUser.coinMD.sponsorMemberNumber !== 0) {
      //     const sponsor = find(users, u => {
      //       return u.coinMD.memberNumber === loadedUser.coinMD.sponsorMemberNumber;
      //     });

      //     if (!sponsor) {
      //       invalidSponsors.push(loadedUser);
      //     } else {
      //       loadedUser.sponsor = {
      //         id: sponsor.id,
      //         email: sponsor.email,
      //         firstName: sponsor.firstName,
      //         lastName: sponsor.lastName,
      //       };
      //       loadedUser.ancestry = {
      //         parentUserId: sponsor.id,
      //         ancestors: appendUserIdToAncestors(sponsor.id, sponsor.ancestry ? sponsor.ancestry.ancestors : ''),
      //         depth: sponsor.ancestry ? sponsor.ancestry.depth + 1 : 1,
      //       };
      //       loadedUser.updatedAt = getNowUtc();
      //     }
      //   }
      // }
      // const session = store.openSession();
      // const rawUsers = await session.advanced.rawQuery<User>(`from index Users where true and exists("coinMDMemberNumber") and not exists("ancestors")`, User).all();
      // console.log('rawUsers', rawUsers.length);
      // // console.log('user[1000]', rawUsers[1000]);
      // const userChunks = chunk(rawUsers, 1024);

      // for (let chunk of userChunks) {
      //   const memberNumbers = [];
      //   for (let chunkUser of chunk) {
      //     memberNumbers.push(chunkUser.coinMD.sponsorMemberNumber);
      //   }

      //   const dedupedMemberNumbers = uniq(memberNumbers); //.filter((user, index, self) => self.findIndex(item => item.email === user.email) === index)
      //   const badSponsorIndex = dedupedMemberNumbers.indexOf(16052601);
      //   if (badSponsorIndex >= 0) {
      //     dedupedMemberNumbers[badSponsorIndex] = 15062701;
      //   }
      //   // const rootIndex = dedupedMemberNumbers.indexOf(0);
      //   // if (rootIndex >= 0) {
      //   //   dedupedMemberNumbers[rootIndex] = 813245;
      //   // }

      //   const sponsorUsers = await session.advanced.rawQuery<User>(`from index Users where coinMDMemberNumber in (${dedupedMemberNumbers})`, User).all();
      //   console.log('sponsorUsers', memberNumbers.length, dedupedMemberNumbers.length, sponsorUsers.length);

      //   for (let chunkUser of chunk) {
      //     // console.log('chunkUser not have sponsorMemberNumber?', chunkUser);

      //     let sponsor = find(sponsorUsers, sponsor => sponsor.coinMD.memberNumber == (chunkUser.coinMD.sponsorMemberNumber == 16052601 ? 15062701 : chunkUser.coinMD.sponsorMemberNumber));
      //     if (!sponsor) {
      //       sponsor = find(rawUsers, sponsor => sponsor.coinMD.memberNumber == (chunkUser.coinMD.sponsorMemberNumber == 16052601 ? 15062701 : chunkUser.coinMD.sponsorMemberNumber));
      //       console.log('trying to find sponsor in recent import', chunkUser.coinMD.sponsorMemberNumber, chunkUser.coinMD.sponsorMemberNumber == 16052601 ? 15062701 : chunkUser.coinMD.sponsorMemberNumber);
      //     }
      //     if (sponsor) {
      //       // console.log('found sponsor', chunkUser, sponsor, userChunks.length, chunk.length);
      //       chunkUser.ancestry.parentUserId = sponsor.id;
      //       chunkUser.ancestry.depth = sponsor.ancestry.depth + 1;
      //       chunkUser.ancestry.ancestors = appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors);
      //       chunkUser.sponsor = {
      //         id: sponsor.id,
      //         email: sponsor.email,
      //         firstName: sponsor.firstName,
      //         lastName: sponsor.lastName,
      //       };
      //       if (chunkUser.coinMD.sponsorMemberNumber == 16052601) {
      //         chunkUser.coinMD.sponsorMemberNumber = sponsor.coinMD.memberNumber;
      //         chunkUser.coinMD.sponsorEmail = sponsor.email;
      //         chunkUser.coinMD.sponsorUsername = sponsor.username;
      //         // console.log('sponsor changed', chunkUser);
      //       }
      //     } else {
      //       console.log('chunkUser and Sponsor not found', chunkUser, sponsor);
      //     }
      //   }
      // }

      // // console.log('rawUsers[5300]', rawUsers[5300]);

      // // const rawAlreadyUsers = await session.advanced.rawQuery<User>(`from index Users where true and exists("coinMDMemberNumber") and exists("ancestors")`, User).all();
      // // console.log('rawAlreadyUsers', rawAlreadyUsers.length);
      // // console.log('rawAlreadyUsers[1000]', rawAlreadyUsers[1000]);
      // // console.log('user.length', users.length, invalidSponsors.length, invalidSponsors);

      // console.log('Starting to tryBulkUpdate', users.length);
      // const tryBulkUpdate = store.bulkInsert();
      // for (const user of users) {
      //   await tryBulkUpdate.store(user, user.id);
      // }
      // console.log('Wrapping Up tryBulkUpdate', users.length);
      // await tryBulkUpdate.finish();
      console.log('invalid sponsors', invalidSponsors.length);
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
