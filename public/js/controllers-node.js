'use strict';

/* Controllers */

var app = angular.module('gpsNode.controllers', ['leaflet-directive', 'googleOauth']);

app.controller('NodeController', [ '$scope', '$http', '$timeout', '$location', '$route', '$aside', '$modal', '$alert', '$q', 'leafletData', 'leafletBoundsHelpers', function($scope, $http, $timeout, $location, $route, $aside, $modal, $alert, $q, leafletData, leafletBoundsHelpers) {

    $scope.selectedNode = undefined;
    $scope.$watch('selectedNode', function(value) {
        if (!value) return;
        if ($scope.nodes.indexOf(value) !== -1) {
            $location.url("/node/" + value);
        }
    });

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
        var nodeName = $route.current.params.nodeName;
        $http.get("/api/node/" + nodeName).success(function(node) {
            var message = '<strong>' + node.name + ' (' + node.ip + ')</strong>';

            $scope.center = {
                lat: node.lat,
                lng: node.lng,
                zoom: 16
            };

            var marker = {
                icon: {
                    type: 'awesomeMarker',
                    icon: 'star',
                    markerColor: 'blue',
                    labelAnchor: [10, -24]
                },
                label: {
                    message: message,
                    direction: 'auto'
                },
                riseOnHover: true,
                lat: node.lat,
                lng: node.lng,
                name: node.name,
                node: node
            };

            $scope.nodes[node.name] = marker;
            $scope.node = node;
        });

        $http.get("/api/node/").success(function(nodes) {
            $http.get("/api/node/" + nodeName + "/neighbors").success(function(neighbors) {
                $scope.neighbors = [];
                for (var i in neighbors) {
                    var neighbor = neighbors[i];
                    $scope.neighbors.push(nodes[neighbor]);
                }
                $http.get("/api/node/" + nodeName + "/links").success(function(links) {
                    for (var i in links) {
                        var link = links[i];
                        var n1 = link.nodes[0].name;
                        var n2 = link.nodes[1].name;
                        for (var j in $scope.neighbors) {
                            var neighbor = $scope.neighbors[j];
                            if (neighbor.name === n1 || neighbor.name === n2) {
                                neighbor.link = link;
                            }
                        }
                    }
                });
            });
        });

    });
}]);
