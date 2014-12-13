'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('LinkController', function($scope, $routeParams, leafletBoundsHelpers, leafletData) {
    $scope.linksPromise.promise.then(function(links) {
        var n1 = $routeParams.n1;
        var n2 = $routeParams.n2;

        $scope.active = links[n1 + "_" + n2];
        if (!$scope.active) {
            $scope.active = links[n2 + "_" + n1];
        }

        $scope.active.color = "#FFF";
        var n1 = $scope.nodes[$scope.active.nodes[0]];
        var n2 = $scope.nodes[$scope.active.nodes[1]];
        leafletData.getMap().then(function(map) {
            map.fitBounds([[n1.lat, n1.lng], [n2.lat, n2.lng]]);
        });
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
