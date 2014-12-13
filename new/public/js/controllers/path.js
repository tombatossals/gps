'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('PathController', function($scope, $routeParams, $alert, $http, leafletData) {
    var n1 = $routeParams.p1;
    var n2 = $routeParams.p2;

    $scope.active = [];
    if ($scope.gpsAlert) {
        $scope.gpsAlert.hide();
    }

    var saturationColor = {
        0: "#491",
        1: "#FFFF00",
        2: "#FF8800",
        3: "#FF0000"
    };

    $scope.resetActive = function() {
        $scope.gps = false;
        if ($scope.gpsAlert) {
            $scope.gpsAlert.hide();
        }

        for (var i in $scope.links) {
            var link = $scope.links[i];
            link.color = link.activeColor;
        }
    };

    $scope.gpsAlert = $alert({title: '', content: '<img style="margin-right: 1em;" src="/images/loading-spin.svg" /> <strong>Wait.</strong> Getting the route...', placement: 'top-right', type: 'warning', show: true});

    var colorizeLink = function(activeLink) {
        angular.forEach($scope.links, function(link) {
            if (link === activeLink) {
                colorizeNodeIcon();
                link.color = "#FFF";
            } else {
                link.color = saturationColor[link.saturation];
            }
        });
    };

    var colorizeNodeIcon = function(activeNode) {
        angular.forEach($scope.nodes, function(node) {
            if (node === activeNode) {
                colorizeLink();
                node.icon.markerColor = "red";
            } else {
                node.icon.markerColor = "blue";
            }
        });
    };

    var getNodesInPath = function(path) {
        var nodes = [];
        for (var i in path) {
            var link = path[i];
            if (!link) continue;
            if (nodes.indexOf(link.nodes[0].name) === -1) {
                nodes.push(link.nodes[0].name);
            }
            if (nodes.indexOf(link.nodes[1].name) === -1) {
                nodes.push(link.nodes[1].name);
            }
        }
        return nodes;
    };

    colorizeLink();
    $http.get("/api/path/" + n1 + '/' + n2).success(function(path) {
        leafletData.getMap().then(function(map) {
            var nodes = getNodesInPath(path);
            var points = [];
            for (var i in nodes) {
                var node = nodes[i];
                points.push([$scope.nodes[node].lat, $scope.nodes[node].lng ]);
            }
            map.fitBounds(points);
        });

        $scope.gpsAlert.hide();
        for (var i in $scope.links) {
            var link = $scope.links[i];
            for (var j in path) {
                var l = path[j];
                if (!l) continue;
                if (l._id === link.id) {
                    link.color = "#FFF";
                }
            }
        }
        $scope.active = path;
        $scope.gps = false;
    }).error(function(data, status, headers, config) {
        $scope.gps = false;
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
