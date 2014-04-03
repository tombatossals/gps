'use strict';

/* Controllers */

var app = angular.module('gps.controllers', ['leaflet-directive', 'googleOauth']);

app.config(function(TokenProvider) {
    TokenProvider.extendConfig({
      clientId: '95689061043-lll7i98j1gficsutiu7a34ja90ut6nn5.apps.googleusercontent.com',
      redirectUri: 'http://gps.qui.guifi.net:8000/js/angular-oauth/src/oauth2callback.html',  // allow lunching demo from a mirror
      scopes: ["https://www.googleapis.com/auth/userinfo.email"]
    });
});


app.controller('HeaderController', [ '$rootScope', '$scope', '$window', 'Token', function($rootScope, $scope, $window, Token) {
    $scope.accessToken = Token.get();

    $scope.logout = function() {
        $window.location = 'https://www.google.com/accounts/Logout';
    }

    $scope.authenticate = function() {
      var extraParams = $scope.askApproval ? {approval_prompt: 'force'} : {};
      Token.getTokenByPopup(extraParams)
        .then(function(params) {
          // Success getting token from popup.

          // Verify the token before setting it, to avoid the confused deputy problem.
          Token.verifyAsync(params.access_token).
            then(function(data) {
              $rootScope.$apply(function() {
                $scope.accessToken = params.access_token;
                $scope.expiresIn = params.expires_in;

                Token.set(params.access_token);
              });
            }, function() {
              alert("Failed to verify token.")
            });

        }, function() {
          // Failure getting token from popup.
          alert("Failed to get token from popup.");
        });
    };
}]);

app.controller('MapController', [ '$scope', '$http', '$location', function($scope, $http, $location) {
    angular.extend($scope, {
        laplana: {
            lat: 40.000531,
            lng: -0.039139,
            zoom: 12
        },
        nodes: {},
        links: {},
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
        for (var i in $scope.nodes) {
            var node = $scope.nodes[i];
            if (node.name === nodeName) {
                return { lat: node.lat, lng: node.lng };
            }
        }
    };

    $http.get("/api/node/").success(function(nodes) {
        $scope.nodes = nodes;

        $http.get("/api/link/").success(function(links) {
            angular.forEach(links, function(link) {
                var n1 = link.nodes[0].name;
                var n2 = link.nodes[1].name;
                var l1 = getNodeLatLng(link.nodes[0].name);
                var l2 = getNodeLatLng(link.nodes[1].name);
                $scope.links[n1 + "_" + n2] = {
                    type: "polyline",
                    weight: link.bandwidth/10 + 4,
                    color: saturationColor[link.saturation],
                    label: {
                        message: '<img class="graph" src="/graph/' + n1 + '/' + n2 + '">'
                    },
                    opacity: 0.9,
                    latlngs: [ l1, l2 ]
                };
            });
        });
    });
}]);
