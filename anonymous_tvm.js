var crypto = require('crypto');
var AWS = require('aws-sdk');
AWS.config.update({ region: process.env.TVM_REGION });
//var policy = { 'Version': '2012-10-17', 'Statement': [{ 'Effect': 'Allow', 'Action': '*', 'Resource': '*' }] }
var policy = require('./tvm_policy.json');
var tableName = process.env.TVM_TABLE;
var dynamodb = new AWS.DynamoDB();
var STS = new AWS.STS({ apiVersion: '2011-06-15' });

exports.register = function (deviceID, key, callback) {
    var item = { 'device_id': { 'S': deviceID }, 'key': { 'S': key } };
    dynamodb.getItem({ TableName: tableName, Key: { 'device_id': { 'S': deviceID } } }, function (err, data) {
        if (err) return callback(err, null);
        if (data && data.Item) {
            // user already registered
            console.log('this uid already registered: ' + deviceID);
            if (key == data.Item.key.S) {
                // secret key matched
                return callback(null, data);
            } else {
                // secret key not matched
                console.log('uid is not matched:' + deviceID);
                let error = new Error('register mismatch');
                error.status = 400;
                return callback(error, null);
            }
        } else {
            // new user register
            dynamodb.putItem({ TableName: tableName, Item: item }, function (err, data) {
                console.log('new uid registered');
                if (err) return callback(err, null);
                callback(null, data);
            });
        }
    });
};

exports.getToken = function (deviceID, timestamp, signature, callback) {
    dynamodb.getItem({ TableName: tableName, Key: { 'device_id': { 'S': deviceID } } }, function (err, data) {
        if (err) return callback(err, null);
        if (!data.Item) {
            let error = new Error('item not found');
            error.status = 400;
            return callback(error, null);
        }
        var hash = crypto.createHmac('SHA256', data.Item.key.S).update(timestamp).digest('base64');
        // console.log('hash:' + hash);
        if (hash != signature) {
            // signature mismatch
            let error = new Error('signature mismatch');
            error.status = 400;
            return callback(error, null);
        }

        let params = {
            DurationSeconds: 3600,
            Policy: JSON.stringify(policy),
            RoleArn: process.env.TVM_ROLE,
            RoleSessionName: deviceID
        };

        STS.assumeRole(params, function (err, data) {
            // get new token
            if (err) return callback(err, null);
            callback(null, data);
        });
        /*
        STS.getFederationToken({ 'Name': deviceID, 'Policy': JSON.stringify(policy) }, function (err, data) {
            // get new token
            if (err) return callback(err, null);
            callback(null, data);
        });
        */
    });
};
