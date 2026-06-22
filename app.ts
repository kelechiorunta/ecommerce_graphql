import express from 'express';

const app = express();

app.get('/graphql/customers', (req, res) => {
    res.json({message: "Graphql Server is working"})
})

export default app;