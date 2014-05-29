'use strict';

var db = require('./database'),
    passport = require('passport'),
    auth = require('./auth');

module.exports = function spec(app) {

    return {
        onconfig: function (config, next) {
            config.get('view engines:js:renderer:arguments').push(app);
            db.config(config.get('databaseConfig'));

            //Tell passport to use our newly created local strategy for authentication
            passport.use(auth.googleStrategy(config.get("googleOauth")));

            //Give passport a way to serialize and deserialize a user. In this case, by the user's id.
            passport.serializeUser(function (user, done) {
                done(null, user.id);
            });

            passport.deserializeUser(function (id, done) {
                User.findOne({_id: id}, function (err, user) {
                    done(null, user);
                });
            });

            next(null, config);
        }
    };
};
