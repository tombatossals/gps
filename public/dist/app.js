'use strict';

angular.module('gps', [ 'ngRoute', 'leaflet-directive']).config(["$locationProvider", function ($locationProvider) {
    $locationProvider.html5Mode(false);
}]);

$(window.document).ready(function() {
    $('.sidebar').sidebar({ overlay: true});
});

'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('MapController', ["$scope", "$http", "$timeout", "$location", "$routeParams", "$q", "leafletBoundsHelpers", function($scope, $http, $timeout, $location, $routeParams, $q, leafletBoundsHelpers) {

    angular.extend($scope, {
        center: {
            lat: 40.000531,
            lng: -0.039139,
            zoom: 12
        },
        nodes: {},
        links: {},
        linksPromise: $q.defer(),
        nodesPromise: $q.defer(),
        bounds: [],
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

    var showSidebar = function(active) {
        $('.sidebar').sidebar('show');
        $scope.active = active;
    }

    $scope.closeSidebar = function() {
        $('.sidebar').sidebar('hide');
    }

    $scope.$on('$routeChangeSuccess', function (event, route){
        if (angular.isDefined(route.params.node)) {
            $scope.nodesPromise.promise.then(function(nodes) {
                showSidebar(nodes[route.params.node]);
            });
        } else if (angular.isDefined(route.params.n1)) {
            $scope.linksPromise.promise.then(function(links) {
                showSidebar(links[route.params.n1 + '_' + route.params.n2]);
            });
        }
        $('.sidebar').sidebar({ overlay: true});
    });

    $scope.$on('leafletDirectivePath.mouseout', function(event, link) {
        if ($location.path().indexOf("/path") === 0) return;
        var link = $scope.links[link.pathName];
        if (!$scope.active || $scope.active.name !== link.name) {
            link.color = link.activeColor;
        }
    });

    $scope.$on('leafletDirectivePath.mouseover', function(event, link) {
        if ($location.path().indexOf("/path") === 0) return;
        var link = $scope.links[link.pathName];
        link.color = "#FFF";
    });

    $scope.$on('leafletDirectivePath.click', function(event, link) {
        var n1 = $scope.nodes[link.pathName.split('_')[0]];
        var n2 = $scope.nodes[link.pathName.split('_')[1]];
        $scope.bounds = leafletBoundsHelpers.createBoundsFromArray([[n1.lat, n1.lng], [n2.lat, n2.lng]]);
        $location.url("/link/" + link.pathName.replace('_', '/'));
    });


    $scope.$on('leafletDirectiveMarker.click', function(event, node) {
        var node = $scope.nodes[node.markerName];
        $scope.center.lat = node.lat;
        $scope.center.lng = node.lng;
        $location.url("/node/" + node.name);
    });

    $http.get("/api/node/").success(function(nodes) {
        for (var i in nodes) {
            var node = nodes[i];

            var message = '<strong>' + node.name + ' (' + node.ip + ')</strong>';

            var marker = {
                icon: {
                    type: 'awesomeMarker',
                    icon: 'fa-star',
                    color: node.alive ? 'blue':'red',
                    prefix: 'fa',
                    shape: 'circle',
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
        $scope.nodesPromise.resolve($scope.nodes);

        $http.get("/api/link/").success(function(links) {
            angular.forEach(links, function(link) {
                var n1 = link.nodes[0]
                var n2 = link.nodes[1];
                var l1 = getNodeLatLng(n1.name);
                var l2 = getNodeLatLng(n2.name);
                var weight = link.bandwidth/5 + 2;
                if (weight > 10) {
                    weight = 10;
                }

                message = '<img style="width: 380px;" src="/graph/bandwidth/' + n1.name + '/' + n2.name + '">';
                message = '<img style="width: 380px;" src="http://gps.qui.guifi.net/graph/bandwidth/acometidas/bartolo">';

                $scope.links[n1.name + "_" + n2.name] = {
                    id: link._id,
                    type: "polyline",
                    weight: weight,
                    color: saturationColor[link.saturation],
                    activeColor: saturationColor[link.saturation],
                    saturation: link.saturation,
                    label: {
                        message: message
                    },
                    opacity: 0.9,
                    name: n1.name + "-" + n2.name,
                    distance: link.distance,
                    nodes: [ link.nodes[0].name, link.nodes[1].name ],
                    latlngs: [ l1, l2 ],
                    link: { n1: n1, n2: n2}
                };
                $scope.linksPromise.resolve($scope.links);
            });
        });
    });
}]);

'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', ["$scope", "$routeParams", "$http", function($scope, $routeParams, $http) {
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
}]);

'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('LinkController', ["$scope", "$http", "leafletBoundsHelpers", function($scope, $http, leafletBoundsHelpers) {
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
}]);
