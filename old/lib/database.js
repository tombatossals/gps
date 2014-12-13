'use strict';

var mongoose = require('mongoose');

//mongoose.set('debug', true);

var db = function () {
    return {
        config: function (conf) {
            mongoose.connect('mongodb://' + conf.host + '/' + conf.database);
            var db = mongoose.connection;
            db.on('error', console.error.bind(console, 'connection error:'));
            //db.once('open', function callback() {});
        },
        close: function() {
            mongoose.connection.close();
        }
    };
};

module.exports = db();
