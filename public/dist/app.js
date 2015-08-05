'use strict';

var gps = angular.module('gps', [ 'ngRoute', 'satellizer', 'leaflet-directive']);

gps.config(["$locationProvider", function ($locationProvider) {
    $locationProvider.html5Mode(false);
}]);

gps.config(["$authProvider", function($authProvider) {
    $authProvider.loginUrl = '/api/user/login';
}]);

$(window.document).ready(function() {
    $('.sidebar').sidebar({ overlay: true});
});

'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('MapController', ["$scope", "$http", "$timeout", "$location", "$routeParams", "$q", "leafletBoundsHelpers", "leafletData", "gpsService", function($scope, $http, $timeout, $location, $routeParams, $q, leafletBoundsHelpers, leafletData, gpsService) {

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
}]);

'use strict';

/* Controllers */

var app = angular.module('gps');

app.controller('NodeController', ["$scope", "$routeParams", "$http", "$window", function($scope, $routeParams, $http, $window) {
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
}]);

'use strict';

/* Controllers */

var app = angular.module('gps');

var saturationColor = {
  0: "#491",
  1: "#FFFF00",
  2: "#FF8800",
  3: "#FF0000"
};

app.controller('LinkController', ["$scope", "$http", "leafletBoundsHelpers", "leafletData", "$window", function($scope, $http, leafletBoundsHelpers, leafletData, $window) {
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

    $scope.$on('leafletDirectivePath.click', function(event, link) {
        $window.location.href = '/#/link/' + link.pathName.replace('_', '/');
    });


    $scope.$on('leafletDirectiveMarker.click', function(event, node) {
        $window.location.href = '/#/node/' + node.name;
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
                    message: '<p>' + data.link.distance + ' meters</p>'
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
}]);

'use strict';

var gpsService = function ($http, $auth) {

    return {
        api: {
            deleteLink: function(link) {
                $http.delete('/api/link/' + link.id).success(function(r) {
                    console.log('done', r);
                })
            },
            disableLink: function(link) {
                $http.put('/api/link/' + link.id + '/disable/').success(function(r) {
                    link.discovered = true;
                    console.log('done', r);
                })
            },
            enableLink: function(link) {
                $http.put('/api/link/' + link.id + '/enable/').success(function(r) {
                    link.discovered = false;
                    console.log('done', r);
                })
            }
        },
        user: {
            authenticate: function (provider, user) {
                $auth.authenticate(provider).then(function () {
                    $('.login.modal').modal('hide');
                }).catch(function (response) {
                    console.log(response);
                });
            },

            login: function(email, password) {
                $auth.login({ email: email, password: password }).then(function() {
                    $('.login.modal').modal('hide');
                }).catch(function(response) {
                    console.log('fail');
                });
            },

            showLogin: function () {
                $('.login.modal').modal('show');
            },

            isAuthenticated: function () {
                return $auth.isAuthenticated();
            },

            toggleLink: function (provider, user) {
                if (!user[provider]) {
                    $auth.link(provider).then(function (id) {
                        user[provider] = id;
                    });
                } else {
                    $auth.unlink(provider).then(function () {
                        user[provider] = undefined;
                    });
                }
            },

            logout: function () {
                $auth.logout();
            }
        }
    };
};
gpsService.$inject = ["$http", "$auth"];


angular
    .module('gps')
    .factory('gpsService', gpsService);
