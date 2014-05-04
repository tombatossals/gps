'use strict';

// Declare app level module which depends on filters, and services
angular.module('gps', [
  'ngAnimate',
  'gps.services',
  'gps.controllers',
  'mgcrea.ngStrap'
]).
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
