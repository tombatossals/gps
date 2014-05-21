'use strict';

/* Controllers */

var app = angular.module('gps.controllers', ['leaflet-directive', 'googleOauth']);

app.controller('HeaderController', [ '$rootScope', '$scope', '$window', '$location', '$http', function($rootScope, $scope, $window, $location, $http) {

    $scope.nodes = [];
    $http.get('/api/node/search').success(function(items) {
        $scope.nodes = items;
    });

    $scope.dropdown = [
        {
            text: 'Logout',
            click: 'session.logout()'
        }
    ];

    $scope.selectedNode = undefined;
    $scope.$watch('selectedNode', function(value) {
        if (typeof value === "object" && value.id) {
            $location.url("/node/" + value.id);
        }
    });
}]);

app.controller('MapController', [ '$scope', '$http', '$location', '$aside', '$modal', '$alert', '$q', 'leafletData', 'leafletBoundsHelpers', function($scope, $http, $location, $aside, $modal, $alert, $q, leafletData, leafletBoundsHelpers) {
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

    $scope.$on("centerUrlHash", function(event, centerHash) {
        $location.search({ c: centerHash });
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

    $scope.$on('leafletDirectivePath.click', function(event, link) {
        console.log($scope.aside.section);
        if ($scope.aside.section === "link" && !$scope.aside.visible) {
            $scope.aside.aside.$promise.then(function() {
                $scope.aside.aside.show();
                $scope.aside.visible = true;
            });
        }
        $location.url("/link/" + link.pathName.replace('_', '/'));
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
                console.log(points);
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

    $scope.$on('leafletDirectiveMarker.click', function(event, node) {
        if ($scope.gps) {
            clickGPS($scope.aside.data.name, node.markerName);
            return;
        }

        if ($scope.aside.section === "node" && !$scope.aside.visible) {
            $scope.aside.aside.$promise.then(function() {
                $scope.aside.aside.show();
                $scope.aside.visible = true;
            });
        }
        $location.url("/node/" + node.markerName);
    });

    var current = {},
        linkAside = $aside({scope: $scope, backdrop: false, template: 'templates/aside/link.tpl.html', placement: 'right', show: false}),
        nodeAside = $aside({scope: $scope, backdrop: false, template: 'templates/aside/node.tpl.html', placement: 'left', show: false});

    $scope.aside = {
        aside: undefined,
        section: undefined,
        data: undefined,
        visible: false,
        force: false
    };

    var gpsAlert;
    $scope.startGPS = function() {
        gpsAlert = $alert({title: 'Choose the desired destination.', content: 'Click on the node where you want to go from ' + $scope.aside.data.name + '.', placement: 'top-right', type: 'success', show: true});
        $scope.gps = true;
    };

    $scope.showUserGraphs = function() {
        var modal = $modal({ scope: $scope, title: "User connection graphs", template: "templates/modal/node-users-graph.tpl.html", show: true});
    };

    $scope.showBandwidthGraphs = function() {
        var modal = $modal({ scope: $scope, title: "Link bandwidth graphs", template: "templates/modal/link-bandwidth-graph.tpl.html", show: true});
    };

    var visible = false;
    $scope.$on("modal.show", function() {
        $scope.aside.visible = true;
    });

    $scope.$on("modal.hide", function() {
        $scope.aside.visible = false;
    });

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

    var df = $q.defer();
/*
    $scope.$on('$locationChangeSuccess', function(value) {
        var path = $location.path(),
            params = $location.search(),
            pattern = /(node|link)\/(\w+)\/?(\w+)?/;

        if ((path === "/" + current.section + "/" + current.item) && path.match(pattern)) {
            return;
        }

        if (path.match('/path/')) {
            initGPS();
            return;
        }

        if (path.match(pattern)) {
            if (path.match(pattern)[1] === 'link' && $scope.aside.section !== 'link') {
                if ($scope.aside.aside) {
                    $scope.aside.aside.hide();
                    $scope.aside.visible = false;
                }
                $scope.aside.aside = linkAside;
            }

            if (path.match(pattern)[1] === 'node' && $scope.aside.section !== 'node') {
                if ($scope.aside.aside) {
                    $scope.aside.aside.hide();
                    $scope.aside.visible = false;
                }
                $scope.aside.aside = nodeAside;
            }

            $scope.aside.section = path.match(pattern)[1];
            if (!$scope.aside.visible) {
                $scope.aside.aside.$promise.then(function() {
                    $scope.aside.aside.show();
                    $scope.aside.visible = true;
                });
            }
        }

        if ((path !== "/" + current.section + "/" + current.item) && path.match(pattern)) {
            var section = path.match(pattern)[1];

            df.promise.then(function() {
                if ($scope.aside.section === 'node') {
                    var item = path.match(pattern)[2];
                    $scope.aside.data = $scope.nodes[item];
                    $scope.aside.aside.$promise.then(function() {
                        $scope.center = {
                            lat: $scope.nodes[item].lat,
                            lng: $scope.nodes[item].lng,
                            zoom: 17
                        };

                        colorizeNodeIcon($scope.nodes[item]);
                    });

                    $http.get("/api/node/" + item + "/neighbors").success(function(neighbors) {
                        $scope.aside.data.neighbors = neighbors;
                    });

                    current = {
                        section: "node",
                        item: item
                    };

                } else {
                    var item = path.match(pattern)[2] + '_' + path.match(pattern)[3];
                    if (!$scope.links.hasOwnProperty(item)) {
                        item = path.match(pattern)[3] + '_' + path.match(pattern)[2];
                    }
                    $scope.aside.data = $scope.links[item];
                    var n1 = $scope.aside.data.nodes[0],
                        n2 = $scope.aside.data.nodes[1];
                    $http.get("/api/link/" + n1 + '/' + n2 + "/nodes").success(function(nodes) {
                        $scope.aside.data.nodesInfo = nodes;
                        $scope.aside.aside.$promise.then(function() {
                            var a = nodes[n1].lat.toFixed(4);
                            $scope.bounds = leafletBoundsHelpers.createBoundsFromArray([
                                [nodes[n1].lat.toFixed(4)/1, nodes[n1].lng.toFixed(4)/1],
                                [nodes[n2].lat.toFixed(4)/1, nodes[n2].lng.toFixed(4)/1]
                            ]);

                            colorizeLink($scope.links[item]);
                        });

                    });

                    current = {
                        section: "link",
                        item: item
                    };

                }
            });
        }
    });

*/

    $http.get("/api/node/").success(function(nodes) {
        for (var i in nodes) {
            var node = nodes[i];

            var message = '<div class="panel panel-primary">' +
                          '<div class="panel-heading">' +
                          '<h3 class="panel-title">' + node.name + '</h3>' +
                          '</div>' +
                          '<div class="panel-body">' +
                          '<table class="table">' +
                          '<tr>' +
                          '<td>IP</td>' +
                          '<td>' + node.ip + '</td>' +
                          '</tr>' +
                          '<tr>' +
                          '<td>Active routes<br />Inactive routes</td>' +
                          '<td>' + node.routing.active + '<br />' + node.routing.inactive + '</td>' +
                          '</tr>' +
                          '<tr>' +
                          '<td>Uptime<br />Model<br />Version<br />Firmware</td>' +
                          '<td>' + node.sysinfo.uptime + '<br />' + node.sysinfo.model + '<br />' + node.sysinfo.version + '<br />' + node.sysinfo.firmware + '</td>' +
                          '</tr>' +
                          '<tr>' +
                          '<td>OSPF Instance<br />State<br />RouterId<br />Dijkstras</td>' +
                          '<td><br />' + node.ospf.state + '<br />' + node.ospf.routerId + '<br />' + node.ospf.dijkstras + '</td>' +
                          '</tr>' +
                          '<tr>';

            if (node.omnitik) {
                message += '<td>Connected users</td>' +
                           '<td>' + node.connectedUsers + '</td>' +
                           '</tr>'
            }

            message +=    '</table>' +
                          '<img class="graph" src="/graph/ping/' + node.name + '">' +
                          '</div>' +
                          '</div>';

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
                name: node.name
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

                var message = '<div class="panel panel-primary">' +
                          '<div class="panel-heading">' +
                          '<h3 class="panel-title">' + n1.name + '-' + n2.name + ' (' + (link.distance/1000) + 'km) </h3>' +
                          '</div>' +
                          '<div class="panel-body">' +
                          '<table class="table">';

                if (n1.ospf) {
                    message += '<tr>' +
                               '<td>OSPF ' + n1.name + '<br />State<br />Adjacency</br>State changes</td>' +
                               '<td><br />' + n1.ospf.state + '<br />' + n1.ospf.adjacency + '<br />' + n1.ospf.stateChanges + '</td>' +
                               '</tr>';
                }

                if (n2.ospf) {
                    message += '<tr>' +
                               '<td>OSPF ' + n2.name + '<br />State<br />Adjacency</br>State changes</td>' +
                               '<td><br />' + n2.ospf.state + '<br />' + n2.ospf.adjacency + '<br />' + n2.ospf.stateChanges + '</td>' +
                               '</tr>';
                }


                message += '</table><img class="graph" src="/graph/bandwidth/' + n1.name + '/' + n2.name + '">' +
                           '</div>' +
                           '</div>';

                $scope.links[n1.name + "_" + n2.name] = {
                    id: link._id,
                    type: "polyline",
                    weight: weight,
                    color: saturationColor[link.saturation],
                    saturation: link.saturation,
                    label: {
                        message: message
                    },
                    opacity: 0.9,
                    name: n1.name + "-" + n2.name,
                    distance: link.distance,
                    nodes: [ link.nodes[0].name, link.nodes[1].name ],
                    latlngs: [ l1, l2 ]
                };
            });
            df.resolve();
        });
    });
}]);
