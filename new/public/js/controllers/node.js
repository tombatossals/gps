'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', function($scope, $routeParams) {
    console.log('hola');
    $scope.gps = false;
    $scope.showingGPS = false;
    if ($scope.gpsAlert) {
        $scope.gpsAlert.hide();
    }

    $scope.nodesPromise.promise.then(function(nodes) {
        $scope.active = nodes[$routeParams.node];
        $scope.center = {
            lat: $scope.active.lat,
            lng: $scope.active.lng,
            zoom: 16
        };
    });

    $scope.resetActive = function() {
        $scope.gps = false;
        $scope.showingGPS = false;
        if ($scope.gpsAlert) {
            $scope.gpsAlert.hide();
        }

        for (var i in $scope.links) {
            var link = $scope.links[i];
            link.color = link.activeColor;
        }
    };

});
