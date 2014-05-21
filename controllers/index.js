'use strict';

var IndexModel = require('../models/index');

module.exports = function (router) {
    router.get('/', function (req, res) {
        var model = new IndexModel();
        res.render('index', model);
    });
};
