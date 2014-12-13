'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', function($scope, $routeParams, $http) {
    $scope.$on('$routeChangeSuccess', function (event, route){
        console.log(route);
        var nodeName = route.params.node

        $http.get('/api/node/' + nodeName).success(function(data) {
            console.log(data);
            $scope.node = data;
        });
    });
});
