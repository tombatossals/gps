'use strict';

/* Controllers */

var app = angular.module('gps.controllers', ['leaflet-directive', 'googleOauth']);

app.controller('HeaderController', [ '$rootScope', '$scope', '$location', '$http', function($rootScope, $scope, $location, $http) {

    $scope.nodes = [];
    $http.get('/api/node/search').success(function(items) {
        for (var i in items) {
            $scope.nodes.push(items[i].text);
        }
    });

    $scope.dropdown = [
        {
            text: 'Logout',
            click: 'session.logout()'
        }
    ];

    $scope.selectedNode = undefined;
    $scope.$watch('selectedNode', function(value) {
        if ($scope.nodes.indexOf(value) !== -1) {
            $location.url("/node/" + value);
        }
    });
}]);

app.controller('MapController', [ '$scope', '$http', '$timeout', '$location', '$routeParams', '$aside', '$modal', '$alert', '$q', 'leafletData', 'leafletBoundsHelpers', function($scope, $http, $timeout, $location, $routeParams, $aside, $modal, $alert, $q, leafletData, leafletBoundsHelpers) {

    angular.extend($scope, {
        center: {
            lat: 40.000531,
            lng: -0.039139,
            zoom: 12
        },
        nodes: {},
        bounds: [],
        links: {},
        gps: false,
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

    $scope.resetActive = function() {
        $scope.active.color = $scope.active.activeColor;
        $scope.active = undefined;
    }

    $scope.$on('leafletDirectivePath.mouseout', function(event, link) {
        var link = $scope.links[link.pathName];
        if ($scope.active.name !== link.name) {
            link.color = link.activeColor;
        }
    });

    $scope.$on('leafletDirectivePath.mouseover', function(event, link) {
        var link = $scope.links[link.pathName];
        link.color = "#FFF";
    });

    $scope.$on('leafletDirectivePath.click', function(event, link) {
        if ($scope.active) {
            $scope.active.color = $scope.active.activeColor;
        }

        $scope.active = $scope.links[link.pathName];
        $scope.active.color = "#FFF";
        var n1 = $scope.nodes[$scope.active.nodes[0]];
        var n2 = $scope.nodes[$scope.active.nodes[1]];

        $scope.bounds = leafletBoundsHelpers.createBoundsFromArray([[n1.lat, n1.lng], [n2.lat, n2.lng]]);
        $location.url("/link/" + link.pathName.replace('_', '/'));
    });

    $scope.$on('leafletDirectiveMarker.click', function(event, node) {
        if ($scope.active) {
            $scope.active.color = $scope.active.activeColor;
        }

        if ($scope.gps) {
            clickGPS($scope.aside.data.name, node.markerName);
            return;
        }
        $scope.active = $scope.nodes[node.markerName];
        $scope.center = {
            lat: $scope.active.lat,
            lng: $scope.active.lng,
            zoom: 16
        };
        $location.url("/node/" + node.markerName);
    });

    var clickGPS = function(n1, n2) {
        gpsAlert.hide();
        $location.url('/path/' + n1 + '/' + n2);
    };

    var getNodesInPath = function(path) {
        var nodes = [];
        for (var i in path) {
            var link = path[i];
            if (nodes.indexOf(link.nodes[0].name) === -1) {
                nodes.push(link.nodes[0].name);
            }
            if (nodes.indexOf(link.nodes[1].name) === -1) {
                nodes.push(link.nodes[1].name);
            }
        }
        return nodes;
    };

    var initGPS = function() {
        var path = $location.path(),
            pattern = /path\/(\w+)\/?(\w+)?/,
            match = path.match(pattern),
            n1 = match[1],
            n2 = match[2];

        gpsAlert = $alert({title: '', content: '<img style="margin-right: 1em;" src="/images/loading-spin.svg" /> <strong>Wait.</strong> Getting the route...', placement: 'top-right', type: 'warning', show: true});
        colorizeLink();
        $http.get("/api/path/" + n1 + '/' + n2).success(function(path) {
            leafletData.getMap().then(function(map) {
                var nodes = getNodesInPath(path);
                var points = [];
                for (var i in nodes) {
                    var node = nodes[i];
                    points.push([$scope.nodes[node].lat, $scope.nodes[node].lng ]);
                }
                map.fitBounds(points);
            });

            gpsAlert.hide();
            if ($scope.aside.aside) {
                $scope.aside.aside.hide();
            }
            $scope.aside.visible = false;
            for (var i in $scope.links) {
                var link = $scope.links[i];
                for (var j in path) {
                    var l = path[j];
                    if (l._id === link.id) {
                        link.color = "#FFF";
                    }
                }
            }
            $scope.gps = false;
            gpsAlert = $alert({title: path.length + ' hops', content: "links:" + path[0].name, placement: 'top-right', type: 'warning', show: true});
        }).error(function(data, status, headers, config) {
            $scope.gps = false;
        });
    };

    var current = {};
    var gpsAlert;
    $scope.startGPS = function() {
        gpsAlert = $alert({title: 'Choose the desired destination.', content: 'Click on the node where you want to go from ' + $scope.aside.data.name + '.', placement: 'top-right', type: 'success', show: true});
        $scope.gps = true;
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

    var setActiveElement = function() {
        if ($routeParams.node) {
            $scope.active = $scope.nodes[$routeParams.node];
            $scope.center = {
                lat: $scope.active.lat,
                lng: $scope.active.lng,
                zoom: 16
            };
        }

        if ($routeParams.n1 && $routeParams.n2) {
            var n1 = $routeParams.n1;
            var n2 = $routeParams.n2;
            $scope.active = $scope.links[n1 + "_" + n2];
            if (!$scope.active) {
                $scope.active = $scope.links[n2 + "_" + n1];
            }
            $scope.active.color = "#FFF";

            var n1 = $scope.nodes[$scope.active.nodes[0]];
            var n2 = $scope.nodes[$scope.active.nodes[1]];
            $scope.bounds = leafletBoundsHelpers.createBoundsFromArray([[n1.lat, n1.lng], [n2.lat, n2.lng]]);
        }
    };

    $http.get("/api/node/").success(function(nodes) {
        for (var i in nodes) {
            var node = nodes[i];

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
            });

            setActiveElement();
            $scope.$on('$locationChangeSuccess', function(event) {
                $timeout(setActiveElement, 300);
            });
        });
    });
}]);
