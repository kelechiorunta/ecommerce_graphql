import app from "./app";
import { createServer } from 'http';

const server = createServer(app);

server.listen(4002, () => {console.log('GraphQL Server is listening at PORT 4002')})

