import app from './app';
import { createServer } from 'http';

import { graphqlHTTP } from 'express-graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

import { producer } from './kafka/producer';
import { consumer } from './kafka/consumer';
import { Topics } from './kafka/topics';
import { emitter } from './kafka/emitter';
import schema from './graphql/schema/schema';
import { newChatBus } from './chatbus';

const PORT = 4002;

producer
  .connect()
  .then(() => console.log('Kafka Producer connected'))
  .catch((err) => console.error(err instanceof Error ? err.message : err));

// Mount graphQLHTTP server as a middleware to intercept and handle requests on the graphql route/endpoint
app.use(
  '/graphql',
  graphqlHTTP((req: any, res: any) => {
    const isDev = process.env.NODE_ENV === 'development';
    const protocol = isDev ? 'ws' : 'wss';
    const host = isDev ? 'localhost:4002' : 'localhost:4002'; //req.headers.host;
    return {
      schema,
      graphiql: {
        subscriptionEndpoint: `${protocol}://${host}/graphql`
      } as any,
      // context: { port: PORT, user: req.user }
      context: {
        req,
        res
      }
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
// useServer({ schema }, wsServer);
useServer(
  {
    schema,

    onConnect(ctx) {
      console.log('WS Connected');
    },

    onSubscribe(ctx, msg: any) {
      console.log('Subscription:', msg.payload);
    },

    onNext(ctx, msg, args, result) {
      console.log('Next:', result);
    },

    onError(ctx, msg, errors) {
      console.error('Subscription Error:', errors);
    },

    onComplete() {
      console.log('Subscription completed');
    },

    onDisconnect() {
      console.log('WS disconnected');
    }
  },
  wsServer
);

wsServer.on('connection', () => {
  console.log('🔥 Raw websocket connected');
});

// Start Kafka Consumer API for consuming messages from producers.
// The chatBus which is an extended event emitter joined with an asyncIterator
// emits the events for the graphql subscriber to listen for and yield.
export const startKafkaConsumer = async () => {
  await consumer.connect();

  await consumer.subscribe({
    topic: 'products',
    fromBeginning: true
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const product = JSON.parse(message.value!.toString());

      setTimeout(() => {
        newChatBus.emit('NEW_PRODUCT', product);
      }, 0);

      console.log('Product emitted to graphql subscriber');
    }
  });
};
startKafkaConsumer();

server.listen(4002, () => {
  console.log('GraphQL Server is listening at PORT 4002');
});
