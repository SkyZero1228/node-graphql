const node_xj = require('xls-to-json');
import * as path from 'path';
import { User, Address } from '../db/models/User';
import { initializeStore } from '../db/config';
import { capitalizeEachFirstLetter, getNowUtc } from '../utils';
import { IUser } from '../interfaces/users';
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq, take, some, filter } from 'lodash';
import { v4 } from 'uuid';
import Roles from '../roles';
import { PatchByQueryOperation } from 'ravendb';
import {
  getIdWithoutCollection,
  getAncestorsWithCollection,
  getAncestorsAsArray,
  appendUserIdToAncestors,
  getAncestorLevelsUp,
} from '../helpers/user';
import { sorGetMemberByEmail, SorClubs } from '../helpers/sor';

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

var getMemberTekUsers = function(filename: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const fs = require('fs');

    let rawData = fs.readFileSync(path.resolve(`./env/${filename}`));
    let users = JSON.parse(rawData);

    resolve(users);
  });
};

(async () => {
  try {
    const store = await initializeStore();

    try {
      let memberTekUsers = await getMemberTekUsers('MemberTEKExport.json');
      console.log('Part 1', memberTekUsers.length); //, memberTekUsers[0], JSON.parse(JSON.stringify(memberTekUsers[0])));

      // usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('Part 2', 'TripValet-CoinMD.xlsx')));
      // console.log('Part 2', usersFromExcel.length);

      // usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('Part 3', 'TripValet-CoinMD.xlsx')));
      // console.log('Part 3', usersFromExcel.length);

      // usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('New Members since Oct 16', 'TripValet-CoinMD-Enrollments-Since-10-16.xlsx')));
      // console.log('Part 4', usersFromExcel.length);

      // usersFromExcel = usersFromExcel.concat(...(await getUserFromExcel('TripValet Data Dump', 'TripValet-CoinMD-Enrollments-10-19.xlsx')));
      // console.log('Part 5', usersFromExcel.length);

      // let usersFromExcel = await getUserFromExcel('TripValet Data File', 'TripValet-CoinMD-Enrollments-Oct-20-21.xlsx');
      // console.log('Part 1', usersFromExcel.length);

      // console.log('Removing Duplicate Emails', usersFromExcel.length);
      // usersFromExcel = uniqBy(usersFromExcel, 'Email Address'); //.filter((user, index, self) => self.findIndex(item => item.email === user.email) === index)
      // console.log('Removing Duplicate Emails - Done', usersFromExcel.length);

      let users: IUser[] = [];

      for (let memberTekUser of memberTekUsers) {
        const session = store.openSession();
        const user = await session
          .query<IUser>({ indexName: 'Users' })
          .whereEquals('email', memberTekUser.Email)
          .waitForNonStaleResults()
          .firstOrNull();
        // console.log(memberTekUser.Email);

        // const vip = await sorGetMemberByEmail(SorClubs.TripValetVip.apiCredentials, memberTekUser.Email);
        // console.log(vip.success && vip.sorMember ? vip.sorMember.Status : 'not');
        // const plus = await sorGetMemberByEmail(SorClubs.TripValetPlus.apiCredentials, memberTekUser.Email);
        // console.log(plus.success && plus.sorMember ? plus.sorMember.Status : 'not');

        // if (vip.success && vip.sorMember && vip.sorMember.Status === 'Active') {
        //   console.log('pushing VIP');
        //   roles.push(Roles.TVVip);
        // } else if (plus.success && plus.sorMember && plus.sorMember.Status === 'Active') {
        //   console.log('pushing PLUS');
        //   roles.push(Roles.TVPlus);
        // }
        // console.log(roles);

        if (!user) {
          const username = `${memberTekUser.FirstName}${memberTekUser.LastName}-${memberTekUser.MemberId}`;

          let roles = ['Affiliate'];
          if (memberTekUser.PropertyId === 13 || memberTekUser.PropertyId === 16) {
            roles.push(Roles.TVPlus);
          } else if (memberTekUser.PropertyId === 15 || memberTekUser.PropertyId === 17) {
            roles.push(Roles.TVVip);
          }

          let newUser = new User(
            null,
            v4(),
            memberTekUser.FirstName,
            memberTekUser.LastName,
            username,
            memberTekUser.Email,
            memberTekUser.Password,
            true,
            [],
            [],
            '',
            true,
            memberTekUser.Telephone,
            roles,
            [],
            null,
            new Address(
              memberTekUser.Street,
              memberTekUser.City,
              memberTekUser.State,
              memberTekUser.PostalCode,
              memberTekUser.Country.replace(/\r?\n/g, '')
            ),
            { userId: memberTekUser.SaveOnMemberID, contractNumber: memberTekUser.LoginId }
          );
          await session.store(newUser);
          await session.saveChanges();
          console.log(newUser.email, newUser.roles);
          session.dispose();
        } else {
          console.log('USER FOUND', user.email);
          console.log('Roles Before', user.roles);

          if (memberTekUser.PropertyId === 13 || memberTekUser.PropertyId === 16) {
            if (
              !some(user.roles, role => {
                return role === Roles.TVVip;
              })
            ) {
              user.roles = uniq(user.roles.concat(Roles.TVPlus));
            }
          } else if (memberTekUser.PropertyId === 15 || memberTekUser.PropertyId === 17) {
            user.roles = uniq(user.roles.concat(Roles.TVVip));
            if (
              some(user.roles, role => {
                return role === Roles.TVPlus;
              })
            ) {
              user.roles = filter(user.roles, role => {
                return role !== Roles.TVPlus;
              });
            }
          }
          console.log('Roles After', user.roles);
          await session.saveChanges();
          session.dispose();
        }
      }

      console.log('for/of done');
      // console.log('Starting to tryBulkUpdate', users.length);
      // const tryBulkUpdate = store.bulkInsert();
      // for (const user of users) {
      //   await tryBulkUpdate.store(user);
      // }
      // console.log('Wrapping Up tryBulkUpdate', users.length);
      // await tryBulkUpdate.finish();
      // });

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
      //   const session = store.openSession();
      //   const rawUsers = await session.advanced.rawQuery<User>(`from index Users where true and exists("coinMDMemberNumber") and not exists("ancestors")`, User).all();
      //   console.log('rawUsers', rawUsers.length);
      //   // console.log('user[1000]', rawUsers[1000]);
      //   const userChunks = chunk(rawUsers, 1024);

      //   for (let chunk of userChunks) {
      //     const memberNumbers = [];
      //     for (let chunkUser of chunk) {
      //       memberNumbers.push(chunkUser.coinMD.sponsorMemberNumber);
      //     }

      //     const dedupedMemberNumbers = uniq(memberNumbers); //.filter((user, index, self) => self.findIndex(item => item.email === user.email) === index)
      //     const badSponsorIndex = dedupedMemberNumbers.indexOf(16052601);
      //     if (badSponsorIndex >= 0) {
      //       dedupedMemberNumbers[badSponsorIndex] = 15062701;
      //     }
      //     // const rootIndex = dedupedMemberNumbers.indexOf(0);
      //     // if (rootIndex >= 0) {
      //     //   dedupedMemberNumbers[rootIndex] = 813245;
      //     // }

      //     const sponsorUsers = await session.advanced.rawQuery<User>(`from index Users where coinMDMemberNumber in (${dedupedMemberNumbers})`, User).all();
      //     console.log('sponsorUsers', memberNumbers.length, dedupedMemberNumbers.length, sponsorUsers.length);

      //     for (let chunkUser of chunk) {
      //       // console.log('chunkUser not have sponsorMemberNumber?', chunkUser);

      //       let sponsor = find(sponsorUsers, sponsor => sponsor.coinMD.memberNumber == (chunkUser.coinMD.sponsorMemberNumber == 16052601 ? 15062701 : chunkUser.coinMD.sponsorMemberNumber));
      //       if (!sponsor) {
      //         sponsor = find(rawUsers, sponsor => sponsor.coinMD.memberNumber == (chunkUser.coinMD.sponsorMemberNumber == 16052601 ? 15062701 : chunkUser.coinMD.sponsorMemberNumber));
      //         console.log('trying to find sponsor in recent import', chunkUser.coinMD.sponsorMemberNumber, chunkUser.coinMD.sponsorMemberNumber == 16052601 ? 15062701 : chunkUser.coinMD.sponsorMemberNumber);
      //       }
      //       if (sponsor) {
      //         // console.log('found sponsor', chunkUser, sponsor, userChunks.length, chunk.length);
      //         chunkUser.ancestry.parentUserId = sponsor.id;
      //         chunkUser.ancestry.depth = sponsor.ancestry.depth + 1;
      //         chunkUser.ancestry.ancestors = appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors);
      //         chunkUser.sponsor = {
      //           id: sponsor.id,
      //           email: sponsor.email,
      //           firstName: sponsor.firstName,
      //           lastName: sponsor.lastName,
      //         };
      //         if (chunkUser.coinMD.sponsorMemberNumber == 16052601) {
      //           chunkUser.coinMD.sponsorMemberNumber = sponsor.coinMD.memberNumber;
      //           chunkUser.coinMD.sponsorEmail = sponsor.email;
      //           chunkUser.coinMD.sponsorUsername = sponsor.username;
      //           // console.log('sponsor changed', chunkUser);
      //         }
      //       } else {
      //         console.log('chunkUser and Sponsor not found', chunkUser, sponsor);
      //       }
      //     }
      //   }

      //   // console.log('rawUsers[5300]', rawUsers[5300]);

      //   // const rawAlreadyUsers = await session.advanced.rawQuery<User>(`from index Users where true and exists("coinMDMemberNumber") and exists("ancestors")`, User).all();
      //   // console.log('rawAlreadyUsers', rawAlreadyUsers.length);
      //   // console.log('rawAlreadyUsers[1000]', rawAlreadyUsers[1000]);
      //   // console.log('user.length', users.length, invalidSponsors.length, invalidSponsors);

      //   console.log('Starting to tryBulkUpdate', rawUsers.length);
      //   const tryBulkUpdate = store.bulkInsert();
      //   for (const user of rawUsers) {
      //     await tryBulkUpdate.store(user, user.id);
      //   }
      //   console.log('Wrapping Up tryBulkUpdate', rawUsers.length);
      //   await tryBulkUpdate.finish();
      //   process.exit(0);
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
