'use strict';

// Declare app level module which depends on filters, and services
angular.module('gps', [ 'ngRoute', 'leaflet-directive']).config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(false);

    $routeProvider.when('/node/:node', {
        templateUrl: 'templates/node.tpl.html',
    }).when('/link/:n1/:n2', {
        templateUrl: 'templates/link.tpl.html',
    });
});

$(window.document).ready(function() {
    $('.sidebar').sidebar({ overlay: true});
});
