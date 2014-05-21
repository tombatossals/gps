'use strict';

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    getUserByEmail = require('./common').getUserByEmail,
    createNewUser = require('./common').createNewUser;

exports.config = function(settings) {
};

exports.googleStrategy = function() {
    return new GoogleStrategy({
        clientID: cfg.GOOGLE_CLIENT_ID,
        clientSecret: cfg.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://gps.qui.guifi.net/auth/google/callback'
    }, function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            getUserByEmail(profile._json.email).then(function(user) {
                return done(null, user);
            }).fail(function() {
                createNewUser(profile._json).then(function(user) {
                    return done(null, user);
                });
            });
        });
    });
};

/**
 * A helper method to determine if a user has been authenticated, and if they have the right role.
 * If the user is not known, redirect to the login page. If the role doesn't match, show a 403 page.
 * @param role The role that a user should have to pass authentication.
 */
exports.isAuthenticated = function () {

    return function (req, res, next) {
        var route = req.url,
            role = (req.user && req.user.role) ? req.user.role : '';

        var auth = {
            '/admin': true,
            '/profile': true
        };

        if (!auth[route]) {
            next();
            return;
        }

        if (!req.isAuthenticated()) {
            //If the user is not authorized, save the location that was being accessed so we can redirect afterwards.
            req.session.goingTo = req.url;
            req.flash('error', 'Please log in to view this page');
            res.redirect('/auth/google');
            return;
        }

        //If a role was specified, make sure that the user has it.
        if (role && req.user.role !== role) {
            res.status(401);
            res.render('errors/401');
        }

        next();
    };
};

/**
 * A helper method to add the user to the response context so we don't have to manually do it.
 * @param req
 * @param res
 * @param next
 */
exports.injectUser = function (req, res, next) {
    return function injectUser(req, res, next) {
        if (req.isAuthenticated()) {
            res.locals.user = req.user;
        }
        next();
    };
};
