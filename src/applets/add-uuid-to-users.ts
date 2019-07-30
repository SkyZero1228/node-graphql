import { initializeStore } from '../db/config';
import { IUser } from '../interfaces/users';
import { v4 } from 'uuid';

(async () => {
  try {
    const store = await initializeStore();
    const session = store.openSession();
    try {
      let users: IUser[] = [];
      let stats;

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
          user.uuid = v4();
        }
        console.log('Starting to tryBulkUpdate', users.length);
        const tryBulkUpdate = store.bulkInsert();
        for (const user of users) {
          await tryBulkUpdate.store(user, user.id);
        }
        console.log('Wrapping Up tryBulkUpdate', users.length);
        await tryBulkUpdate.finish();

        process.exit();
      });
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
