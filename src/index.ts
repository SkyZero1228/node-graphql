// require('dotenv').config();

import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import { graphqlExpress } from 'apollo-server-express';
import * as jwt from 'express-jwt';
import { registerRestfulRoutes } from './routes';
import * as vars from '../env/vars';
import { apolloUploadExpress } from 'apollo-upload-server';
import { makeExecutableSchema } from 'graphql-tools';
import { initializeStore } from './db';
import expressPlayground from 'graphql-playground-middleware-express';
import resolvers from './resolvers';
import { CustomRequest } from './utils';
import typeDefs from './schema';

(async () => {
  const store = await initializeStore();

  const app: express.Application = express();
  app.set('trust proxy', 1); // trust first proxy
  app.use(cookieParser());
  app.use(bodyParser.json());

  // CORS only in development
  app.use(cors());
  //   cors({
  //     credentials: true,
  //     origin: '*'
  //     // origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '*',
  //   })
  // );

  app.use(
    jwt({
      credentialsRequired: false,
      secret: vars.JwtSecretKey,
      getToken: function fromHeaderOrQuerystring(req) {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
          return req.headers.authorization.split(' ')[1];
        }
        return null;
      }
    })
  );

  // swallow the JWT Expired Exception
  app.use((err, req, res, next) => {
    next();
  });

  // Construct a schema, using GraphQL schema language
  const typeDefs = fs.readFileSync(path.join(__dirname, '../schema.graphql')).toString();
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // Build per-request context
  // and attach Raven session so
  // resolvers can access it
  const context = (req: CustomRequest, res: express.Response) => {
    const session = store.openSession();

    return {
      store,
      session,
      req,
      res
    };
  };

  app.use(
    '/graphql',
    bodyParser.json(),
    apolloUploadExpress({ uploadDir: './upload/' }),
    graphqlExpress(async (req: CustomRequest, res) => ({
      schema,
      context: context(req, res),
      tracing: process.env.NODE_ENV === 'development',
      cacheControl: process.env.NODE_ENV === 'development'
    }))
  );

  // app.use((req: CustomRequest, res, next) => {
  //   req.session.nowInMinutes = Math.floor(Date.now() / 60e3); // Updated once every 1 minute
  //   next();
  // });

  app.use('*', (req: CustomRequest, res: any, next) => {
    req.db = store;
    next();
  });

  registerRestfulRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    app.get('/playground', expressPlayground({ endpoint: '/graphql' }));
  }

  const port = vars.ServerPort || 5000;

  app.listen(port, async () => {
    console.log(`Listening on port ${port}...`);
    console.log('All set, query away!');
  });
})();
