import { initializeStore } from '../db/config';
import { IUser, IUserSubscription } from '../interfaces/users';
import { v4 } from 'uuid';
import { some, uniq, find } from 'lodash';
import Roles from '../roles';
import { UserSubscription } from '../db/models/UserSubscription';
import { User, UserReference } from '../db/models/User';

(async () => {
  try {
    const store = await initializeStore();
    const session = store.openSession();
    try {
      console.log('entering');
      let ids: string[] = [];
      let users: IUser[] = [];
      let usersToUpdate: IUser[] = [];
      let stats: any;

      let us = await session.query<UserSubscription>({ collection: 'UserSubscriptions' }).all();
      console.log(us.length);
      for (let sub of us) {
        const idParts = sub.id.split('/');
        const id = idParts[0] + '/' + idParts[1];
        ids.push(id);
      }

      console.log('ids', ids.length, uniq(ids).length);
      let subs = await session.load<User>(uniq(ids));
      const userIds = Object.keys(subs);
      console.log('subs', userIds.length);

      for (let uid of userIds) {
        const user: IUser = subs[uid];
        const subscription: IUserSubscription = find(us, (s: IUserSubscription) => {
          return s.user.id === user.id;
        });
        // console.log(subscription.id);
        if (!subscription.affiliate) {
          if (user.sponsor) {
            // console.log('we have sponsor');
            subscription.affiliate = user.sponsor;
          }
          // console.log(subscription.id);
        }
        // if (!user.sponsor) console.log(user.id, user.ancestry.depth);
      }

      console.log('Starting to tryBulkUpdate', us.length);
      const tryBulkUpdate = store.bulkInsert();
      for (let s of us) {
        console.log(s.affiliate ? s.affiliate.email : 'no affiliate');
        await tryBulkUpdate.store(s, s.id);
      }
      console.log('Wrapping Up tryBulkUpdate', us.length);
      await tryBulkUpdate.finish();

      process.exit(0);

      // const query = session.query({ indexName: 'Users' }).orderBy('createdAt');
      // const queryStream = await session.advanced.stream(query, _ => (stats = console.log('stats 1', stats)));

      // queryStream.on('data', user => {
      //   users.push(user.document);
      // });

      // queryStream.once('stats', stats => {
      //   console.log('stats 2', stats);
      // });

      // queryStream.on('error', err => {
      //   console.log('error', err);
      // });

      // queryStream.on('end', async () => {
      //   console.log('end');
      //   for (let user of users) {
      //     if (
      //       !some(user.roles, (role: string) => {
      //         return role === Roles.Affiliate;
      //       })
      //     ) {
      //       console.log(user.id);
      //       user.roles = uniq(user.roles.concat(Roles.Affiliate));
      //       usersToUpdate.push(user);
      //     }
      //   }
      //   console.log('Starting to tryBulkUpdate', usersToUpdate.length);
      //   const tryBulkUpdate = store.bulkInsert();
      //   for (const user of usersToUpdate) {
      //     await tryBulkUpdate.store(user, user.id);
      //   }
      //   console.log('Wrapping Up tryBulkUpdate', usersToUpdate.length);
      //   await tryBulkUpdate.finish();

      //   process.exit(0);
      // });
      // process.exit(0);
    } catch (ex) {
      console.log(ex.message);
      process.exit(1);
    }
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
