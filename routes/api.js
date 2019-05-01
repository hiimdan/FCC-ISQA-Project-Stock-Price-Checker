'use strict'

const axios = require('axios');
const likeTest = require('./likeTesting');

module.exports = (app, mongoose) => {
  const stockSchema = new mongoose.Schema({
    symbol: String,
    likes: Number,
    likeLog: [String]
  });
  
  const Stock = mongoose.model('Stock', stockSchema);
  
  app.get('/api/stock-prices', (req, res, next) => {
    console.log(req.query);
    if (!req.query.stock) {
      return res.status(400).json({message: 'Stock is required as query parameter'});
    }
    if (Array.isArray(req.query.stock)) {
      if (req.query.stock.length === 2) {
        let stock1 = req.query.stock[0].toUpperCase();
        let stock2 = req.query.stock[1].toUpperCase();
        let query1 = axios.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + stock1 + '&apikey=' + process.env.AVAPIKEY);
        let query2 = axios.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + stock2 + '&apikey=' + process.env.AVAPIKEY);
        
        Promise.all([query1, query2])
        .then(responses => {
          if (!responses[0].data['Global Quote'] || !responses[1].data['Global Quote']) {
            return res.json({message: 'Maximum number of API calls have been reached. Please wait 1 minute and try again'});
          }
          if (Object.keys(responses[0].data['Global Quote']).length === 0) {
            return res.json({message: 'no data for stock: ' + stock1});
          } else if (Object.keys(responses[1].data['Global Quote']).length === 0) {
            return res.json({message: 'no data for stock: ' + stock2});
          }
          let ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.connection.remoteAddress;
          let stock1Price = responses[0].data['Global Quote']['05. price'];
          let stock2Price = responses[1].data['Global Quote']['05. price'];
          
          let result1 = new Promise((resolve, reject) => {
            Stock.findOne({symbol: stock1}, (err, doc) => {
              if (err) {return reject(err);}
              if (doc) {
                if (req.query.like !== 'true' || doc.likeLog.indexOf(ip) >= 0) {
                  resolve(doc);
                } else {
                  doc.likeLog.push(ip);
                  doc.likes++;
                  doc.save((err, savedDoc) => {
                    if (err) {return reject(err)}
                    resolve(savedDoc);
                  })
                }
              } else {
                let newStock = new Stock({
                  symbol: stock1,
                  likes: req.query.like == 'true' ? 1 : 0,
                  likeLog: req.query.like == 'true' ? [ip] : []
                });
                newStock.save((err, doc) => {
                  if (err) {return reject(err);}
                  resolve(doc);
                })
              }
            })
          });
          
          let result2 = new Promise((resolve, reject) => {
            Stock.findOne({symbol: stock2}, (err, doc) => {
              if (err) {return reject(err);}
              if (doc) {
                if (req.query.like !== 'true' || doc.likeLog.indexOf(ip) >= 0) {
                  resolve(doc);
                } else {
                  doc.likeLog.push(ip);
                  doc.likes++;
                  doc.save((err, savedDoc) => {
                    if (err) {return reject(err)}
                    resolve(savedDoc);
                  })
                }
              } else {
                let newStock = new Stock({
                  symbol: stock2,
                  likes: req.query.like == 'true' ? 1 : 0,
                  likeLog: req.query.like == 'true' ? [ip] : []
                });
                newStock.save((err, doc) => {
                  if (err) {return reject(err);}
                  resolve(doc);
                })
              }
            })
          });
          
          Promise.all([result1, result2])
          .then(docs => {
            res.json({stockData: [{stock: stock1, price: stock1Price, rel_likes: docs[0].likes - docs[1].likes}, {stock: stock2, price: stock2Price, rel_like: docs[1].likes - docs[0].likes}]})
          })
          .catch(err => {
            next(err);
          })
          
        })
        .catch(err => {
          next(err);
        })
      } else {
        res.status(400).json({message: 'Please provide exactly 1 or 2 stocks'})
      }
    } else {
      axios.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + req.query.stock.toUpperCase() + '&apikey=' + process.env.AVAPIKEY)
      .then(response => {
        let ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.connection.remoteAddress;
        if (!response.data['Global Quote']) {
          return res.json({message: 'Maximum number of API calls have been reached. Please wait 1 minute and try again'});
        }
        if (Object.keys(response.data['Global Quote']).length === 0) {
          return res.json({message: 'No results returned for stock: ' + req.query.stock});
        }
        let price = response.data['Global Quote']['05. price'];
        Stock.findOne({symbol: req.query.stock.toUpperCase()}, (err, doc) => {
          if (err) {return next(err);}
          if (doc) {
            if (req.query.like !== 'true' || doc.likeLog.indexOf(ip) >= 0) {
              res.json({stockData: {stock: doc.symbol, price, likes: doc.likes}});
              } else {
                doc.likeLog.push(ip);
                doc.likes++;
                doc.save((err, savedDoc) => {
                  if (err) {return next(err);}
                  res.json({stockData: {stock: savedDoc.symbol, price, likes: savedDoc.likes}});
                })
              } 
          } else {
            let newStock = new Stock({
              symbol: req.query.stock.toUpperCase(),
              likes: req.query.like == 'true' ? 1 : 0,
              likeLog: req.query.like == 'true' ? [ip] : []
            });
            
            newStock.save((err, savedDoc) => {
              if (err) {return next(err);}
              res.json({stockData: {stock: savedDoc.symbol, price, likes: savedDoc.likes}});
            })
          }
        })
      })
      .catch(error => {
        next(error);
      })
    }
  })
  // Route to remove ip from log from chai testing requests:
  likeTest(app, Stock);
}
