'use strict';

// Declare app level module which depends on filters, and services
angular.module('gpsNode', [
  'ngRoute',
  'gpsNode.controllers',
  'gps.services',
  'mgcrea.ngStrap'
]).
config(function ($routeProvider, $locationProvider) {
    $routeProvider.when('/:nodeName', {
        templateUrl: '/templates/node/node.tpl.html'
    });
    $locationProvider.html5Mode(false);
}).
run(['$rootScope', '$window', 'sessionService', function ($rootScope, $window, sessionService) {
    $rootScope.session = sessionService;
    $window.app = {
        authState: function(state, user) {
            $rootScope.$apply(function() {
                switch (state) {
                    case 'success':
                        sessionService.authSuccess(user);
                        break;
                    case 'failure':
                        sessionService.authFailed();
                        break;
                }

            });
        }
    };

    if ($window.user) {
        sessionService.authSuccess($window.user);
    }
}]);
