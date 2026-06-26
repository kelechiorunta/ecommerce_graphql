import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql';
import { ProductType } from '../types/types';
import axios from 'axios';

/**
 * Construct a GraphQL schema and define the necessary resolvers.
 *
 * type Query {
 *   hello: String
 * }
 */
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'world',
      },

      getProducts: {
      type: new GraphQLList(ProductType),
      resolve: async (_: any, __: any, { context }: {context: any}) => {
        try {
          const products = await axios.get('http://localhost:3980/api/products');
          return products ? products.data : [];
        } catch (error) {
          console.error(error instanceof Error ? error.message : error);
        }
      }
    },
    },

    
  }),
  
});

export default schema