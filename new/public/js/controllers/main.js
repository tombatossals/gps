'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('MainController', function($scope, $rootScope) {
    $rootScope.gps = false;
    $scope.showingGPS = false;
    if ($scope.gpsAlert) {
        $scope.gpsAlert.hide();
    }

    for (var i in $scope.links) {
        var link = $scope.links[i];
        link.color = link.activeColor;
    }
});
