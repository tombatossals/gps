'use strict';

/* Controllers */

var app = angular.module('gpsLink.controllers', ['leaflet-directive', 'googleOauth']);

app.controller('LinkController', [ '$scope', '$http', '$timeout', '$location', '$route', '$aside', '$modal', '$alert', '$q', 'leafletData', 'leafletBoundsHelpers', function($scope, $http, $timeout, $location, $route, $aside, $modal, $alert, $q, leafletData, leafletBoundsHelpers) {

    angular.extend($scope, {
        center: {
            lat: 40.000531,
            lng: -0.039139,
            zoom: 12
        },
        nodes: {},
        links: [],
        neighbors: [],
        layers: {
            baselayers: {
                googleHybrid: {
                    name: 'Google Hybrid',
                    layerType: 'HYBRID',
                    type: 'google'
                },
                osm: {
                    name: 'OpenStreetMap',
                    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    type: 'xyz'
                },
                cloudmade: {
                    name: 'Cloudmade Tourist',
                    type: 'xyz',
                    url: 'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
                    layerParams: {
                        key: '007b9471b4c74da4a6ec7ff43552b16f',
                        styleId: 7
                    }
                }
            }
        }
    });

    var saturationColor = {
        0: "#491",
        1: "#FFFF00",
        2: "#FF8800",
        3: "#FF0000"
    };

    var getNodeLatLng = function(nodeName) {
        return { lat: $scope.nodes[nodeName].lat, lng: $scope.nodes[nodeName].lng };
    };

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

    $scope.$on('$locationChangeSuccess', function(event) {
        if (!$route.current) return;
        $scope.n1 = $route.current.params.n1,
        $scope.n2 = $route.current.params.n2;

        var linkName = $scope.n1 + "-" + $scope.n2;
        $http.get("/api/link/").success(function(links) {
            $scope.links = links;
            for (var i in links) {
                var link = links[i];
                if (link.nodes[0].name + "-" + link.nodes[1].name === linkName || link.nodes[1].name + "-" + link.nodes[0].name === linkName) {
                    $scope.link = link;
                    break;
                }
            }
        });
    });
}]);
