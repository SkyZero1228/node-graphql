import { initializeStore } from '../db/config';
import { IUser } from '../interfaces/users';
import { v4 } from 'uuid';
import { some, uniq } from 'lodash';
import Roles from '../roles';

(async () => {
  try {
    const store = await initializeStore();
    const session = store.openSession();
    try {
      console.log('entering');
      let users: IUser[] = [];
      let usersToUpdate: IUser[] = [];
      let stats: any;

      const query = session.query({ indexName: 'Users' }).orderBy('createdAt');
      const queryStream = await session.advanced.stream(query, _ => (stats = console.log('stats 1', stats)));

      queryStream.on('data', user => {
        users.push(user.document);
      });

      queryStream.once('stats', stats => {
        console.log('stats 2', stats);
      });

      queryStream.on('error', err => {
        console.log('error', err);
      });

      queryStream.on('end', async () => {
        console.log('end');
        for (let user of users) {
          if (
            !some(user.roles, (role: string) => {
              return role === Roles.Affiliate;
            })
          ) {
            console.log(user.id);
            user.roles = uniq(user.roles.concat(Roles.Affiliate));
            usersToUpdate.push(user);
          }
        }
        console.log('Starting to tryBulkUpdate', usersToUpdate.length);
        const tryBulkUpdate = store.bulkInsert();
        for (const user of usersToUpdate) {
          await tryBulkUpdate.store(user, user.id);
        }
        console.log('Wrapping Up tryBulkUpdate', usersToUpdate.length);
        await tryBulkUpdate.finish();

        process.exit(0);
      });
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
