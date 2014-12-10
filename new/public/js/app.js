'use strict';

// Declare app level module which depends on filters, and services
angular.module('gps', [
    'ngRoute',
    'gps.controllers'
    ]).
    config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(false);

        $routeProvider.when('/', {
            controller: 'MainController'
        }).when('/node/:node', {
            templateUrl: 'templates/sidebar/node.tpl.html',
            controller: 'NodeController'
        }).when('/link/:n1/:n2', {
            templateUrl: 'templates/sidebar/link.tpl.html',
            controller: 'LinkController'
        }).when('/path/:p1/:p2', {
            templateUrl: 'templates/sidebar/path.tpl.html',
            controller: 'PathController'
        });
    });
