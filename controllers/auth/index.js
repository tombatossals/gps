'use strict';

var passport = require('passport');


module.exports = function (router) {

    router.get('/google',
        passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/userinfo.email'] }),
        function(req, res){
            // The request will be redirected to Google for authentication, so this
            // function will not be called.
    });

    router.get('/google/callback',
        passport.authenticate('google', { successRedirect: '/auth/google/success', failureRedirect: '/auth/google/failure' }),
        function(req, res) {
            res.redirect('/');
        });

    router.get('/google/logout', function(req, res){
        req.logout();
        res.writeHead(200);
        res.end();
    });

    router.get('/google/success', function(req, res) {
        res.render('after-auth', { state: 'success', user: req.user ? req.user : null });
    });

    router.get('/google/failure', function(req, res) {
        res.render('after-auth', { state: 'failure', user: null });
    });
};
