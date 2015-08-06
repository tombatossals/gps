'use strict';

var gps = angular.module('gps', [ 'ngRoute', 'satellizer', 'leaflet-directive']);

gps.config(function ($locationProvider) {
    $locationProvider.html5Mode(false);
});

gps.config(function($authProvider) {
    $authProvider.loginUrl = '/api/user/login';
});

gps.run(function($rootScope, $location, gpsService) {
    $rootScope.location = $location;
    $rootScope.user = gpsService.user;
    $rootScope.api = gpsService.api;
});

$(window.document).ready(function() {
    $('.sidebar').sidebar({ overlay: true});
});
