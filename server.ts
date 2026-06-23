import app from "./app";
import { createServer } from 'http';
// import type { Request } from 'express';
import type { Request } from 'express';
// import type { Request } from 'graphql-http';
import { createHandler } from 'graphql-http/lib/use/http';
import { graphqlHTTP } from 'express-graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import schema from './graphql/schema/schema';

const PORT = 4002;

// Mount graphQLHTTP server as a middleware to intercept and handle requests on the graphql route/endpoint
app.use(
  '/graphql',
  graphqlHTTP((req: any) => {
    const isDev = process.env.NODE_ENV === 'development';
    const protocol = isDev ? 'ws' : 'wss';
    const host = isDev ? 'localhost:4002' : 'localhost:4002'; //req.headers.host;
    return {
      schema,
      graphiql: {
        subscriptionEndpoint: `${protocol}://${host}/graphql`
      } as any,
      context: { port: PORT, user: req.user }
    };
  })
);
const server = createServer(app);

// Upgrade the httpServer to persistent websocket transport layer on /graphql route
const wsServer = new WebSocketServer({
  server,
  path: '/graphql'
  // clientTracking: true
});

// Connect the ws server to schema subscription realtime event emission and response
useServer({ schema }, wsServer);

server.listen(4002, () => {console.log('GraphQL Server is listening at PORT 4002')})

