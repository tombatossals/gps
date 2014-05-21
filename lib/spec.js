'use strict';

var db = require('../lib/database');

module.exports = function spec(app) {

    return {
        onconfig: function (config, next) {
            config.get('view engines:js:renderer:arguments').push(app);
            db.config(config.get('databaseConfig'));
            next(null, config);
        }
    };
};
