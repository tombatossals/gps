'use strict';

/* Controllers */

var app = angular.module('gps');

var saturationColor = {
  0: "#491",
  1: "#FFFF00",
  2: "#FF8800",
  3: "#FF0000"
};

app.controller('LinkController', function($scope, $http, leafletBoundsHelpers, leafletData) {
    angular.extend($scope, {
        center: {},
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
        markers: {},
        bounds: {},
        paths: {}
    });

    $scope.$on('$routeChangeSuccess', function (event, route){
        var n1 = route.params.n1;
        var n2 = route.params.n2;

        $http.get('/api/link/' + n1 + '/' + n2).success(function(data) {
            $scope.link = data.link;
            $scope.nodes = data.nodes;
            n1 = $scope.nodes[data.link.nodes[0].name];
            n2 = $scope.nodes[data.link.nodes[1].name];

            var weight = data.link.bandwidth/5 + 2;
            if (weight > 10) {
                weight = 10;
            }

            $scope.paths[n1.name + "_" + n2.name] = {
                weight: weight,
                saturation: data.link.saturation,
                color: saturationColor[data.link.saturation],
                label: {
                    message: '<h3>Distance</h3><p>' + data.link.distance + ' meters</p>'
                },
                opacity: 0.9,
                latlngs: [
                    { lat: n1.lat, lng: n1.lng },
                    { lat: n2.lat, lng: n2.lng }
                ]
            };

            $scope.markers = {
              n1: {
                  lat: n1.lat,
                  lng: n1.lng,
                  icon: {
                      type: 'awesomeMarker',
                      icon: 'fa-star',
                      color: n1.alive ? 'blue':'red',
                      prefix: 'fa',
                      shape: 'circle',
                      labelAnchor: [10, -24]
                  },
                  label: {
                      message: '<strong>' + n1.name + '</strong>',
                      direction: 'auto',
                      options: {
                          noHide: true
                      }
                  },
              },
              n2: {
                  lat: n2.lat,
                  lng: n2.lng,
                  icon: {
                      type: 'awesomeMarker',
                      icon: 'fa-star',
                      color: n2.alive ? 'blue':'red',
                      prefix: 'fa',
                      shape: 'circle',
                      labelAnchor: [10, -24]
                  },
                  label: {
                      message: '<strong>' + n2.name + '</strong>',
                      direction: 'auto',
                      options: {
                          noHide: true
                      }
                  },
                }
            };

            leafletData.getMap().then(function(map) {
                map.fitBounds([[n1.lat, n1.lng], [n2.lat, n2.lng]]);         
            });
        });
    });
});
