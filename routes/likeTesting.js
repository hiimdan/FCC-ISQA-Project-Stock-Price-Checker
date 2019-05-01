module.exports = (app, model) => {
  app.put('/remove-like', (req, res, next) => {
    console.log('hello');
    if (!req.body.stock) {
      return res.status(400).json({message: 'invalid query'});
    }
    let ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0] : req.connection.remoteAddress;
    if (Array.isArray(req.body.stock)) {
      let stock1 = req.body.stock[0].toUpperCase();
      let stock2 = req.body.stock[1].toUpperCase();
      model.findOneAndUpdate({symbol: stock1, likeLog: {$in: [ip]}}, {$pull: {likeLog: ip}, $inc: {likes: -1}}, (err, doc) => {
        if (err) {return next(err);}
        model.findOneAndUpdate({symbol: stock2, likeLog: {$in: [ip]}}, {$pull: {likeLog: ip}, $inc: {likes: -1}}, (err, doc) => {
          if (err) {return next(err);}
          res.json({message: 'success'});
        })
      })
    } else {
      model.findOneAndUpdate({symbol: req.body.stock.toUpperCase(), likeLog: {$in: [ip]}}, {$pull: {likeLog: ip}, $inc: {likes: -1}}, (err, doc) => {
        if (err) {return next(err);}
        res.json({message: 'success'});
      })
    }
  })
}
