'use strict';

var app = angular.module('gps')

app.config(function ($routeProvider) {
    $routeProvider.when('/:n1/:n2', {
        templateUrl: '../templates/link/link.tpl.html',
    });
});
