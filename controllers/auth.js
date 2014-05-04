'use strict';

var passport = require('passport');


module.exports = function (app) {

    app.get('/auth/google',
        passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/userinfo.email'] }),
        function(req, res){
            // The request will be redirected to Google for authentication, so this
            // function will not be called.
        });

        app.get('/auth/google/callback',
            passport.authenticate('google', { successRedirect: '/auth/google/success', failureRedirect: '/auth/google/failure' }));

        app.get('/auth/google/logout', function(req, res){
            req.logout();
            res.writeHead(200);
            res.end();
        });

        app.get('/auth/google/success', function(req, res) {
            res.render('after-auth', { state: 'success', user: req.user ? req.user : null });
        });

        app.get('/auth/google/failure', function(req, res) {
            res.render('after-auth', { state: 'failure', user: null });
        });
};
