var express = require('express');
var atvm = require('./anonymous_tvm');
var app = express();
var bodyParser = require('body-parser');

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/registrations', function (req, res) {
    atvm.register(req.body.device_id, req.body.key, function (err, data) {
        if (err) {
            return handleError(res, err);
        }
        res.status(200).send(JSON.stringify({ 'result': 'ok' }));
    });
});

app.get('/tokens', function (req, res) {
    atvm.getToken(req.query.device_id, req.query.timestamp, req.query.signature, function (err, data) {
        if (err) {
            return handleError(res, err);
        }
        res.status(200).send(JSON.stringify(data));
    });
});

var handleError = function (res, err) {
    console.log(err.stack);
    res.status(err.status || 500).send(JSON.stringify({ 'error': err.message }));
};

app.listen(app.get('port'));
console.log('Listening on port ' + app.get('port'));