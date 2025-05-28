const express = require('express');
const app = express();
const db= require('./db');
const identifyRoutes = require('./routes/identify');

require('dotenv').config();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Welcome to the BiteSpeed API');
});

app.use('/', identifyRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
