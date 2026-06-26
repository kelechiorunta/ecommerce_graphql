import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLID,
  GraphQLFloat,
} from 'graphql';


export const ProductType = new GraphQLObjectType({
  name: 'Product',
 
  fields: {
    product_id: { type: GraphQLID },
    product_name: { type: GraphQLString },
    description: { type: GraphQLString },
    price: { type: GraphQLFloat },
    producer_name: {type: GraphQLString},
    category_name: {type: GraphQLString},
  },

});