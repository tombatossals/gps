'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', function($scope, $routeParams, $http) {
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
                    lng: data.lng
                }
            }
            $scope.node = data;
        });

        $http.get('/api/node/' + nodeName + '/links').success(function(data) {
            var neighbors = {};
            console.log(data);
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
