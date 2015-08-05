'use strict';

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var user = require('../models/user');
var moment = require('moment');
var jwt = require('jwt-simple');
var TOKEN_SECRET = require('../../config/gps').tokenSecret;

function createJWT(user) {
    var payload = {
        sub: user._id,
        iat: moment().unix(),
        exp: moment().add(14, 'days').unix()
    };
    return jwt.encode(payload, TOKEN_SECRET);
}

module.exports = function (app) {
    app.use('/api/user', router);

    router.post('/login', function (req, res) {
        user.getUser({ email: req.body.email }).then(function(user) {
            user.comparePassword(req.body.password, function(err, isMatch) {
                if (!isMatch) {
                    return res.status(401).json({ message: 'Wrong email and/or password' });
                }
                res.json({ token: createJWT(user) });
            });
        }).fail(function(err) {
            return res.status(401).json({ message: 'Wrong email and/or password' });
        });
    });
};
