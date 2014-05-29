'use strict';

// Declare app level module which depends on filters, and services
angular.module('gps', [
  'ngAnimate',
  'ngRoute',
  'gps.services',
  'gps.controllers',
  'mgcrea.ngStrap'
]).
config(function ($routeProvider, $locationProvider) {
    $routeProvider.when('/node/:node', {
        templateUrl: 'templates/sidebar/node.tpl.html'
    }).when('/link/:n1/:n2', {
        templateUrl: 'templates/sidebar/link.tpl.html'
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
