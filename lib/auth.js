var GoogleStrategy = require('passport-google').Strategy;

exports.googleStrategy = function() {
    return new GoogleStrategy({
        returnURL: 'http://localhost:8000/auth/google/return',
        realm: 'http://localhost:3000'
    }, function(identifier, profile, done) {
        process.nextTick(function () {
            profile.identifier = identifier;
            return done(null, profile);
        });
    });
}
