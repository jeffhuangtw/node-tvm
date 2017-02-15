var express = require('express');
var atvm = require('./anonymous_tvm');
var app = express();
var bodyParser = require('body-parser')

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/registrations', function (req, res, next) {
  atvm.register(req.body.device_id, req.body.key, function (err, data) {
    if (err) {
      handleError(res, err);
    }
    res.send(200, JSON.stringify({ 'ok': 'yeah' }));
  });
})

app.get('/tokens', function (req, res, next) {
  atvm.getToken(req.query.device_id, req.query.timestamp || 'TODO', req.query.signature || 'TODO', function (err, data) {
    if (err) {
      handleError(res, err);
    }
    res.send(200, JSON.stringify(data));
  });
});


var handleError = function(res, err) {
  console.log(err.stack);
  res.send(err.status || 500, JSON.stringify({ 'error': err.message }))
}

app.listen(app.get('port'));
console.log('Listening on port ' + app.get('port'));
