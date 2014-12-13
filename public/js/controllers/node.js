'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', function($scope, $routeParams, $http) {
    $scope.center = {
        lat: 0,
        lng: 0,
        zoom: 1
    };
    
    $scope.$on('$routeChangeSuccess', function (event, route){
        var nodeName = route.params.node

        $http.get('/api/node/' + nodeName).success(function(data) {
            console.log(data);
            $scope.center = {
                lat: data.lat,
                lng: data.lng,
                zoom: 12
            };
            $scope.node = data;
        });
    });
});
