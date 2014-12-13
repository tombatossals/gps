'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('LinkController', function($scope, $http, leafletBoundsHelpers) {
  $scope.center = {
    lat: 0,
    lng: 0,
    zoom: 1
  };

  $scope.$on('$routeChangeSuccess', function (event, route){
    var n1 = route.params.n1;
    var n2 = route.params.n2;

    $http.get('/api/link/' + n1 + '/' + n2).success(function(data) {
      console.log(data);
      $scope.center = {
        lat: data.lat,
        lng: data.lng,
        zoom: 12
      };
      $scope.node = data;
    });
  });
});
