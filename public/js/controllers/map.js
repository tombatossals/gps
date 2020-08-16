'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('MapController', function($scope, $http, $timeout, $location, $routeParams, $q, leafletBoundsHelpers, leafletData, gpsService) {

    //$('.sidebar').sidebar();

    $scope.api = gpsService.api;
    $scope.user = gpsService.user;
    $http.get('json/center.json').success(function(data) {
      $scope.center = data.center;
    });

    angular.extend($scope, {
        center: {},
        nodes: {},
        paths: {},
        linksPromise: $q.defer(),
        nodesPromise: $q.defer(),
        bounds: [],
        events: {
            markers: {
                enable: [ 'click' ],
                logic: 'emit'
            },
            paths: {
                enable: [ 'mouseout', 'mouseover', 'mousedown' ],
                logic: 'emit'
            }

        },
        layers: {
            baselayers: {
                osm: {
                    name: 'OpenStreetMap',
                    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    type: 'xyz'
                },
                googleHybrid: {
                    name: 'Google Hybrid',
                    layerType: 'HYBRID',
                    type: 'google'
                }
            }, overlays: {
                discovered: {
                    name: 'Discovered links',
                    type: 'group',
                    visible: false
                }
            }
        }
    });

    var saturationColor = {
        0: '#491',
        1: '#FFFF00',
        2: '#FF8800',
        3: '#FF0000'
    };

    var getNodeLatLng = function(nodeName) {
        return { lat: $scope.nodes[nodeName].lat, lng: $scope.nodes[nodeName].lng };
    };

    var showSidebar = function(active) {
        $timeout(function() {
            $('.sidebar').sidebar('show');
            $scope.active = active;
        }, 300);
    };

    $scope.closeSidebar = function() {
        $('.sidebar').sidebar('hide');
    };

    $scope.$on('$routeChangeSuccess', function (event, route) {
        console.log('router');
        if (angular.isDefined(route.params.node)) {
            $scope.nodesPromise.promise.then(function(nodes) {
                showSidebar(nodes[route.params.node]);
            });
        } else if (angular.isDefined(route.params.n1)) {
            $scope.linksPromise.promise.then(function(links) {
                showSidebar(links[route.params.n1 + '_' + route.params.n2]);
            });
        }
    });

    $scope.$on('leafletDirectivePath.mouseout', function(event, e) {
        if ($location.path().indexOf('/path') === 0) {
            return;
        }

        var link = $scope.paths[e.modelName];
        if (!$scope.active || $scope.active.name !== link.name) {
            link.color = link.activeColor;
        }
    });

    $scope.$on('leafletDirectivePath.mouseover', function(event, e) {
        if ($location.path().indexOf('/path') === 0) {
            return;
        }

        var link = $scope.paths[e.modelName];
        link.color = '#FFF';
    });

    $scope.$on('leafletDirectivePath.mousedown', function(event, e) {
        var n1 = $scope.nodes[e.modelName.split('_')[0]];
        var n2 = $scope.nodes[e.modelName.split('_')[1]];
        $scope.bounds = leafletBoundsHelpers.createBoundsFromArray([[n1.lat, n1.lng], [n2.lat, n2.lng]]);
        $location.url('/link/' + e.modelName.replace('_', '/'));
    });


    $scope.$on('leafletDirectiveMarker.click', function(event, e) {
        var node = $scope.nodes[e.modelName];
        $scope.center.lat = node.lat;
        $scope.center.lng = node.lng;
        $location.url('/node/' + node.name);
    });

	  console.log('lala');
    $http.get('/api/node/').success(function(nodes) {
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

        $http.get('/api/link/').success(function(links) {
            angular.forEach(links, function(link) {
                var n1 = link.nodes[0];
                var n2 = link.nodes[1];
                var l1 = getNodeLatLng(n1.name);
                var l2 = getNodeLatLng(n2.name);
                var weight = link.bandwidth/5 + 2;
                if (weight > 10) {
                    weight = 10;
                }

                message = '<img style="width: 380px;"" src="/graph/bandwidth/' + n1.name + '/' + n2.name + '">';

                $scope.paths[n1.name + '_' + n2.name] = {
                    id: link._id,
                    type: 'polyline',
                    weight: weight,
                    color: saturationColor[link.saturation],
                    activeColor: saturationColor[link.saturation],
                    saturation: link.saturation,
                    label: {
                        message: message
                    },
                    opacity: 0.9,
                    name: n1.name + '-' + n2.name,
                    network: link.network,
                    distance: link.distance,
                    nodes: [ link.nodes[0].name, link.nodes[1].name ],
                    latlngs: [ l1, l2 ],
                    link: { n1: n1, n2: n2}
                };
            });

            $http.get('/api/link/autodiscovered').success(function(links) {
                angular.forEach(links, function(link) {
                    var n1 = link.nodes[0];
                    var n2 = link.nodes[1];
                    var l1 = getNodeLatLng(n1.name);
                    var l2 = getNodeLatLng(n2.name);
                    var weight = 10;

                    $scope.paths[n1.name + '_' + n2.name] = {
                        id: link._id,
                        type: 'polyline',
                        layer: 'discovered',
                        discovered: link.discovered,
                        weight: 10,
                        color: '#000',
                        activeColor: '#000',
                        opacity: 0.9,
                        name: n1.name + '-' + n2.name,
                        network: link.network,
                        distance: link.distance,
                        nodes: [ link.nodes[0].name, link.nodes[1].name ],
                        latlngs: [ l1, l2 ],
                        link: { n1: n1, n2: n2}
                    };
                });
                $scope.linksPromise.resolve($scope.paths);
            });
        });
    });
});
