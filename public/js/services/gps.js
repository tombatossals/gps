'use strict';

var gpsService = function ($http, $auth, $rootScope) {

    var saturationColor = {
        0: '#491',
        1: '#FFFF00',
        2: '#FF8800',
        3: '#FF0000'
    };

    return {
        api: {
            getColor: function(link) {
                if (link.discovered) {
                    return '#000';
                }
                return saturationColor[link.saturation];
            },
            deleteLink: function(link) {
                var id = link.id || link._id;
                if (confirm('Are you sure?') === true) {
                    $http.delete('/api/link/' + id).success(function(r) {
                    });
                }
            },
            disableLink: function(link) {
                var id = link.id || link._id;
                $http.put('/api/link/' + id + '/disable/').success(function(r) {
                    link.discovered = true;
                    $rootScope.$emit('linkUpdated', { discovered: true });
                });
            },
            addNode: function() {

            },
            enableLink: function(link) {
                var id = link.id || link._id;
                $http.put('/api/link/' + id + '/enable/').success(function(r) {
                    link.discovered = false;
                    $rootScope.$emit('linkUpdated', { discovered: false });
                });
            }
        },
        user: {
            authenticate: function (provider, user) {
                return $auth.authenticate(provider);
            },

            login: function(email, password, redirect) {
                return $auth.login({ email: email, password: password }, redirect);
            },

            getUser: function() {
                return $http.get('/api/user');
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

            logout: function (redirect) {
                $auth.logout(redirect);
            }
        }
    };
};


angular
    .module('gps')
    .factory('gpsService', gpsService);
