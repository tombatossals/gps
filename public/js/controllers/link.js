'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('LinkController', function($scope, $http, leafletBoundsHelpers) {
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
    bounds: {}
  });

  $scope.$on('$routeChangeSuccess', function (event, route){
      var n1 = route.params.n1;
      var n2 = route.params.n2;

      $http.get('/api/link/' + n1 + '/' + n2).success(function(data) {
          $scope.link = data.link;
          $scope.nodes = data.nodes;
          n1 = $scope.nodes[data.link.nodes[0].name];
          n2 = $scope.nodes[data.link.nodes[1].name];
          $scope.bounds = leafletBoundsHelpers.createBoundsFromArray([[n1.lat, n1.lng], [n2.lat, n2.lng]]);
          console.log($scope.bounds);
      });
  });
});
