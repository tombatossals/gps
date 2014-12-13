'use strict';

var app = angular.module('gps')

app.config(function ($routeProvider) {
    $routeProvider.when('/:node', {
        templateUrl: '../templates/node/node.tpl.html',
    });
});
