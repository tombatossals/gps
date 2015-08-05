'use strict';

var mongoose = require('mongoose');
var Q = require('q');
var bcrypt = require('bcryptjs');
var util = require('util');

var UserModel = function() {
    var schema = mongoose.Schema({
        email: { type: String, unique: true, lowercase: true },
        password: { type: String, select: false },
        displayName: String,
        picture: String,
        facebook: String,
        foursquare: String,
        google: String,
        github: String,
        linkedin: String,
        live: String,
        yahoo: String,
        twitter: String
    });

    schema.pre('save', function(next) {
        var user = this;
        if (!user.isModified('password')) {
            return next();
        }
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(user.password, salt, function(err, hash) {
                user.password = hash;
                next();
            });
        });
    });

    schema.methods.comparePassword = function(password, done) {
        bcrypt.compare(password, this.password, function(err, isMatch) {
            done(err, isMatch);
        });
    };


    return mongoose.model('User', schema);
};

var User = new UserModel();

var getUser = function(query) {
    var df = Q.defer();

    User.findOne(query, '+password', function(error, user) {
        if (error || !user) {
            df.reject();
            return;
        }

        df.resolve(user);
    });

    return df.promise;
};

module.exports = {
    getUser : getUser
};
