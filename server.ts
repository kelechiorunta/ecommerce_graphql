import app from './app';
import { createServer } from 'http';

import { graphqlHTTP } from 'express-graphql';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

import { producer } from './kafka/producer';
import { consumer } from './kafka/consumer';

import schema from './graphql/schema/schema';
import { newChatBus } from './chatbus';
import { Topics } from './kafka/topics';
import { topicEventMap, TopicEventMapType } from './kafka/topicsEventMap';
const controller = new AbortController();
const { signal } = controller;

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

    onSubscribe(ctx: any, msg: any) {
      console.log('CTX', ctx);
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

  const topics = Object.values(Topics);
  for (const topic of topics) {
    await consumer.subscribe({
      topic,
      fromBeginning: true
    });
  }

  // Subscribe to all graphql subscribers based on the topic
  await consumer.run({
    eachMessage: async ({ topic, message }: { topic: any; message: any }) => {
      const payload = JSON.parse(message.value!.toString());

      // Emit/Publish the event and data from the payload with the chatBus based on the corresponding topic
      // //key of the topicEventMapType
      //// const events = topicEventMap[topic as keyof TopicEventMapType] as string[];
      // Add a bit of debounce for the Chatbus emission
      setTimeout(() => {
        // Add abort signal to prevent memory leaks
        newChatBus.emit(payload.event, payload.data, { signal: controller.signal });
      }, 0);

      console.log(`${payload.event} emitted from ${topic} topic to graphql subscriber`);
      // Call the abort function once every emission
      controller.abort();
    }
  });
};
startKafkaConsumer();

server.listen(4002, () => {
  console.log('GraphQL Server is listening at PORT 4002');
});
