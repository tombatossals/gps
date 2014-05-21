'use strict';


var ProfileModel = require('../../models/profile'),
    auth = require('../../lib/auth');

module.exports = function (router) {

    var model = new ProfileModel();


    router.get('/', auth.isAuthenticated('admin'), function (req, res) {

        res.render('profile', model);

    });

};
