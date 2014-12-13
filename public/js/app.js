'use strict';

angular.module('gps', [ 'ngRoute', 'leaflet-directive']).config(function ($locationProvider) {
    $locationProvider.html5Mode(false);
});

$(window.document).ready(function() {
    $('.sidebar').sidebar({ overlay: true});
});
