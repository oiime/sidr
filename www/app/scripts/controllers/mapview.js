'use strict';

angular.module('sidrApp')
.service('MapDrawService', function(uiGmapIsReady, CONST){
  this.draw = function(locations){
    var shapeOptions = {
      fillColor: '#5555ff',
      fillOpacity: 0.2,
      strokeWeight: 0.5
    };

    uiGmapIsReady.promise(1).then(function(instances) {
      instances.forEach(function(inst) {
        var map = inst.map;
        angular.forEach(locations, function(location, pos){
          if(location.source == CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE){
            var obj;

            switch(location.data.type){
              case 'circle':
                obj = new google.maps.Circle(angular.extend({
                    center: {lat: location.data.coordinates[0], lng: location.data.coordinates[1] , id: location.id},
                    radius: location.data.radius
                  }, shapeOptions));
                 break;
               case 'point':
                 obj = new google.maps.Marker({
                   position: {lat: location.data.coordinates[0], lng: location.data.coordinates[1] , id: location.id },
                 });
                 break;
               case 'polygon':
                 var paths = [];
                 angular.forEach(location.data.coordinates, function(coordinates){
                   paths.push({lat: coordinates[0], lng: coordinates[1]});
                 });
                 obj = new google.maps.Polygon(angular.extend({
                     id: location.id,
                     paths: paths
                   }, shapeOptions));
                  break;
            }
            if(typeof obj !== 'undefined'){
              obj.setMap(map);
            }
          }
        });
      });
    });
  };
})
.controller('MapViewCtrl', function ($scope, MapDrawService) {
  $scope.map = {
      center: {latitude: 40.1451, longitude: 0.6680 },
      zoom: 2, bounds: {}
  };
  $scope.mapOptions = {scrollwheel: true};
  $scope.init = function(locations){
    MapDrawService.draw(locations);
  }
})
.controller('MapViewModalCtrl', function ($scope, $uibModalInstance, $timeout, MapDrawService, locations) {
  $scope.ready = false;
  $scope.locations = locations;
  $scope.ready = false;
  $timeout(function() {
      $scope.ready = true; // :(
  }, 500);

  // setup
  $scope.map = {
      center: {latitude: 40.1451, longitude: 0.6680 },
      zoom: 2, bounds: {}
  };
  $scope.mapOptions = {scrollwheel: true};
  $scope.ok = function () {
    angular.forEach($scope.mapElms, function(obj){
      obj.setMap();
    })
    $scope.$destroy();
    $uibModalInstance.close();
  };
  MapDrawService.draw(locations);
});
