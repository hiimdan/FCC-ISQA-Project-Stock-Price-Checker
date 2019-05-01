'use strict'

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');

const runner = require('./test-runner.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const apiRoutes = require('./routes/api.js');

app.use(helmet.contentSecurityPolicy({directives: {defaultSrc: ["'self'"], scriptSrc: ["'self'", "code.jquery.com"]}}))

app.use(express.static('public'));

app.use(cors({origin: '*'}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

fccTestingRoutes(app);

apiRoutes(app, mongoose);


// Unmatched routes
app.use((req, res) => {
  res.status(404)
  .type('text')
  .send('not found');
})

mongoose.connect(process.env.DB, {useNewUrlParser: true});

mongoose.connection.on('error', console.error.bind(console, 'connection error'));

mongoose.connection.once('open', () => {
  console.log('database is connected');
  app.listen(process.env.PORT || 3000, () => {
    console.log('listening on port ' + process.env.PORT);
    if (process.env.NODE_ENV === 'test') {
      console.log('running tests');
      setTimeout(() => {
        try {
          runner.run();
        } catch(e) {
          console.log('tests are not valid');
          console.log(e);
        }
      }, 3500)
    }
  })
})

module.exports = app;
