var crypto = require('crypto');
var AWS = require('aws-sdk');
AWS.config.update({ region: process.env.TVM_REGION });
//var policy = { 'Version': '2012-10-17', 'Statement': [{ 'Effect': 'Allow', 'Action': '*', 'Resource': '*' }] }
var policy = require('./tvm_policy.json');
var tableName = process.env.TVM_TABLE;
var dynamodb = new AWS.DynamoDB();
var STS = new AWS.STS();

exports.register = function (deviceID, key, callback) {
    var item = { 'device_id': { 'S': deviceID }, 'key': { 'S': key } };
    dynamodb.getItem({ TableName: tableName, Key: { 'device_id': { 'S': deviceID } } }, function (err, data) {
        if (err) return callback(err, null);
        if (data) {
            console.log('uid already registered');
            if (key == data.Item.key.S) {
                return callback(null, data);
            } else {
                console.log('uid is not matched:' + deviceID);
                let error = new Error('register info mismatch');
                error.status = 400;
                return callback(error, null);
            }
        }
        dynamodb.putItem({ TableName: tableName, Item: item }, function (err, data) {
            console.log('new uid registered');
            if (err) return callback(err, null);
            callback(null, data);
        });
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
        console.log('hash:' + hash);
        if (hash != signature) {
            let error = new Error('signature mismatch');
            error.status = 400;
            return callback(error, null);
        }
        STS.getFederationToken({ 'Name': deviceID, 'Policy': JSON.stringify(policy) }, function (err, data) {
            if (err) return callback(err, null);
            callback(null, data);
        });
    });
};
