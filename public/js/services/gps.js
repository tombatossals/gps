'use strict';

var gpsService = function ($http, $auth) {

    return {
        api: {
            deleteLink: function(link) {
                $http.delete('/api/link/' + link.id).success(function(r) {
                    console.log('done', r);
                })
            },
            disableLink: function(link) {
                $http.put('/api/link/' + link.id + '/disable/').success(function(r) {
                    link.discovered = true;
                    console.log('done', r);
                })
            },
            enableLink: function(link) {
                $http.put('/api/link/' + link.id + '/enable/').success(function(r) {
                    link.discovered = false;
                    console.log('done', r);
                })
            }
        },
        user: {
            authenticate: function (provider, user) {
                $auth.authenticate(provider).then(function () {
                    $('.login.modal').modal('hide');
                }).catch(function (response) {
                    console.log(response);
                });
            },

            login: function(email, password) {
                $auth.login({ email: email, password: password }).then(function() {
                    $('.login.modal').modal('hide');
                }).catch(function(response) {
                    console.log('fail');
                });
            },

            showLogin: function () {
                $('.login.modal').modal('show');
            },

            isAuthenticated: function () {
                return $auth.isAuthenticated();
            },

            toggleLink: function (provider, user) {
                if (!user[provider]) {
                    $auth.link(provider).then(function (id) {
                        user[provider] = id;
                    });
                } else {
                    $auth.unlink(provider).then(function () {
                        user[provider] = undefined;
                    });
                }
            },

            logout: function () {
                $auth.logout();
            }
        }
    };
};


angular
    .module('gps')
    .factory('gpsService', gpsService);
