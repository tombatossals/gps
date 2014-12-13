'use strict';

var app = angular.module('gps')

app.config(function ($routeProvider) {
    $routeProvider.when('/node/:node', {
        templateUrl: '../templates/node.tpl.html',
    }).when('/link/:n1/:n2', {
        templateUrl: '../templates/link.tpl.html',
    });
});
