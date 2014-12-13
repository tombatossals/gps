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
        links: {},
        bounds: {},
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

    $scope.$on('$locationChangeSuccess', function(event) {
        if (!$route.current) return;
        $scope.n1 = $route.current.params.n1,
        $scope.n2 = $route.current.params.n2;

        var n1 = $scope.n1,
            n2 = $scope.n2;

        var linkName = n1 + "-" + n2;
        $http.get("/api/node/").success(function(nodes) {

            for (var i in nodes) {
                var node = nodes[i];

                if (node.name !== n1 && node.name !== n2) continue;

                var message = '<strong>' + node.name + ' (' + node.ip + ')</strong>';

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
            }

            var k1 = $scope.nodes[n1];
            var k2 = $scope.nodes[n2];
            $http.get("/api/link/").success(function(links) {
                for (var i in links) {
                    var link = links[i];
                    if (link.nodes[0].name + "-" + link.nodes[1].name === linkName || link.nodes[1].name + "-" + link.nodes[0].name === linkName) {
                        $scope.link = link;
                        break;
                    }
                }

                var weight = link.bandwidth/5 + 2;
                if (weight > 10) {
                    weight = 10;
                }

                var l1 = { lat: nodes[n1].lat, lng: nodes[n1].lng };
                var l2 = { lat: nodes[n2].lat, lng: nodes[n2].lng };


                $scope.links[n1 + "_" + n2] = {
                    weight: weight,
                    color: saturationColor[link.saturation],
                    opacity: 0.9,
                    latlngs: [ l1, l2 ],
                };
                leafletData.getMap().then(function(map) {
                    map.fitBounds([[k1.lat, k1.lng], [k2.lat, k2.lng]]);
                    $timeout(function() {
                        map.setZoom(map.getZoom()-1);
                    }, 500);
                });
            });
        });
    });
}]);
