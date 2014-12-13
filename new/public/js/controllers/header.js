'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('HeaderController', function($rootScope, $scope, $location, $http) {

    $scope.nodes = [];
    $http.get('/api/node/search').success(function(items) {
        for (var i in items) {
            $scope.nodes.push(items[i].text);
        }
    });

    $scope.dropdown = [
        {
            text: 'Logout',
            click: 'session.logout()'
        }
    ];

    $scope.selectedNode = undefined;
    $scope.$watch('selectedNode', function(value) {
        if ($scope.nodes.indexOf(value) !== -1) {
            $location.url("/node/" + value);
        }
    });
});
