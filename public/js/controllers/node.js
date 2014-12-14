'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', function($scope, $routeParams, $http, $window) {
    angular.extend($scope, {
        center: {
            lat: 0,
            lng: 0,
            zoom: 1
        },
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
            }
          }
        },
        markers: {}
    });

    $scope.$on('leafletDirectiveMarker.click', function(event, node) {
        $window.location.href = '/#/node/' + $routeParams.node;
    });

    $scope.$on('$routeChangeSuccess', function (event, route){
        var nodeName = route.params.node

        $http.get('/api/node/' + nodeName).success(function(data) {
            $scope.center = {
                lat: data.lat,
                lng: data.lng,
                zoom: 16
            };
            $scope.markers = {
                main: {
                    lat: data.lat,
                    lng: data.lng,
                    icon: {
                      type: 'awesomeMarker',
                      icon: 'fa-star',
                      color: data.alive ? 'blue':'red',
                      prefix: 'fa',
                      shape: 'circle',
                      labelAnchor: [10, -24]
                    },
                    label: {
                      message: '<strong>' + data.name + '</strong>',
                      direction: 'auto',
                      options: {
                        noHide: true
                      }
                    },
                }
            }
            $scope.node = data;
        });

        $http.get('/api/node/' + nodeName + '/links').success(function(data) {
            var neighbors = {};
            for (var i in data) {
                var link = data[i];
                var neighbor = {};
                if (link.nodes[0].name !== nodeName) {
                    neighbor.name = link.nodes[0].name;
                } else {
                    neighbor.name = link.nodes[1].name;
                }
                neighbor.distance = link.distance;

                neighbors[neighbor.name] = neighbor;
            }

            $scope.neighbors = neighbors;
        });

    });
});
