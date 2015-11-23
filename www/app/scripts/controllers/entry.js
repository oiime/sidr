'use strict';

angular.module('sidrApp')
.controller('EntriesCtrl', function ($scope, $rootScope, $state, EntryService, LocationService, TagService, TagClassService, ngTableParams, CONST) {
  $rootScope.$broadcast("updatePage", {
      pageCaption: 'Entries',
      pageSubCaption:  ''
  });
  $scope.exportUrls = {
    csv: '',
    json: ''
  }
  $scope.tagsSelectorPulldown = TagService.getByClass(['sector', 'vulnerable', 'affected', 'underlying']);
  $scope.TagClassService = TagClassService;
  $scope.tagTitles = TagService.getTitleMap();
  $scope.entryStatus = EntryService.getEntryStatusMap();
  $scope.entryStatusDropdown = EntryService.getEntryStatusDropdown();
  $scope.countries = LocationService.getCountriesDropdown();

  $scope.severityLevels = EntryService.getSeverityLevels();
  $scope.reliabilityLevels = EntryService.getReliabilityLevels();
  $scope.statusLevels = TagService.getByClass('status');
  $scope.timelineLevels = TagService.getByClass('timeline');
  $scope.severityTitles = EntryService.getTitleMap($scope.severityLevels);
  $scope.reliabilityTitles = EntryService.getTitleMap($scope.reliabilityLevels);
  $scope.statusTitles = EntryService.getTitleMap($scope.statusLevels);
  $scope.timelineTitles = EntryService.getTitleMap($scope.timelineLevels);

  $scope.tableParams = new ngTableParams({
      page: 1,
      count: 50,
      filter: {
        status: CONST.STATUS_ACTIVE
      }
  }, {
      total: 0,
      getData: function($defer, params) {
          EntryService.find(params.$params, function(data){
            params.total(data.total);
            $scope.exportUrls = {
              csv: EntryService.getExportUrl('csv', $scope.tableParams.filter),
              json: EntryService.getExportUrl('json', $scope.tableParams.filter)
            }
            $defer.resolve(data.result);
          });
      }
  });

  $scope.actions = {
    changeStatus: function(entry, $index, status){
      EntryService.updateStatus(entry.id, status).then(function(rsp){
        entry.status = rsp.status;
      })
    }
  }
})
.controller('EntryCtrl', function ($scope, $rootScope, $state, uiGmapIsReady, CONST, entry, Entry, EntryService, APIService, TagService, TagClassService, LocationService, LocationOverlay, DomainService, SessionService) {
  $scope.entry = entry;
  $scope.countries = LocationService.getCountries(DomainService.getDomainCountries(SessionService.user.state.focus_domain_id));
  if(typeof $scope.entry.country_code === 'undefined'){
    $scope.entry.country_code = $scope.countries[0].code;
  }
  $scope.serverErrors = [];
  $scope.geonameLocations = [];
  $scope.selfLocations = [];
  $scope.shapeSelected = false;
  $scope.tagGroups = [];

  angular.forEach(['sector', 'vulnerable', 'affected', 'underlying'], function(tag_class){
      $scope.tagGroups.push({name: tag_class, tags: TagService.getByClass(tag_class), title: TagClassService.getClassTitle(tag_class)})
  });

  // holy shit this is terrible
  var hookDrawingManager = function(){
      var drawingManager;
      var selectedShape;
      var idTokenizer = 1;
      var shapeOptions = {
        fillColor: '#5555ff',
        fillOpacity: 0.2,
        strokeWeight: 0.5,
        editable: true
      }
      function clearSelection() {
        if (selectedShape) {
          selectedShape.setEditable(false);
          selectedShape = null;
        }
        $scope.shapeSelected = false;
        $scope.$apply();
      }
      function setSelection(shape) {
        clearSelection();
        selectedShape = shape;
        shape.setEditable(true);
        $scope.shapeSelected = true;
        $scope.$apply();
      }
      function deleteSelectedShape() {
        if (selectedShape) {
          angular.forEach($scope.entry.src_locations[CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE], function(ol, idx){
            if(ol.e.id === selectedShape.id){
              $scope.entry.src_locations[CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE].splice(idx, 1);
            }
          })
          selectedShape.setMap(null);
        }
      }

      $scope.deleteSelectedShape = deleteSelectedShape;

      // setup
      $scope.map = {
          center: {latitude: 40.1451, longitude: 0.6680 },
          zoom: 2, bounds: {},
          drawingManagerControl: {}
      };
      $scope.mapOptions = {scrollwheel: false};
      $scope.drawingManagerOptions = {
       drawingMode: google.maps.drawing.OverlayType.MARKER,
       drawingControl: true,
       drawingControlOptions: {
         position: google.maps.ControlPosition.TOP_CENTER,
           drawingModes: [
             google.maps.drawing.OverlayType.MARKER,
             google.maps.drawing.OverlayType.CIRCLE,
             google.maps.drawing.OverlayType.POLYGON,
             //google.maps.drawing.OverlayType.POLYLINE,
             //google.maps.drawing.OverlayType.RECTANGLE
           ]
       },
       markerOptions: {
        draggable: true
       },
       circleOptions: shapeOptions,
       polygonOptions: shapeOptions
      };

      $scope.$watch('map.drawingManagerControl.getDrawingManager', function() {
        if (!$scope.map.drawingManagerControl.getDrawingManager) {
          return;
        }
        var controlOptions = angular.copy($scope.map.drawingManagerOptions);
        var map = $scope.map.drawingManagerControl.getDrawingManager().map;
        var drawingManager = $scope.map.drawingManagerControl.getDrawingManager();
        var addObject = function(type, obj){
          var ol = LocationOverlay.create(type);
          obj.id = idTokenizer;
          idTokenizer++;
          ol.setObject(obj);
          $scope.entry.src_locations[CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE].push(ol);
        }
        drawingManager.setOptions(controlOptions);
        google.maps.event.addListener(drawingManager, 'circlecomplete', function (e) {
          addObject('circle', e);
        });
        google.maps.event.addListener(drawingManager, 'polygoncomplete', function (e) {
          addObject('polygon', e);
        });
        google.maps.event.addListener(drawingManager, 'markercomplete', function (e) {
          addObject('point', e);
        });
        google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {
          if (e.type != google.maps.drawing.OverlayType.MARKER) {
            drawingManager.setDrawingMode(null);
            var newShape = e.overlay;
            newShape.type = e.type;
            google.maps.event.addListener(newShape, 'click', function() {
              setSelection(newShape);
            });
            setSelection(newShape);
          }
        });
        google.maps.event.addListener(drawingManager, 'drawingmode_changed', clearSelection);
        google.maps.event.addListener(map, 'click', clearSelection);

        // load
        angular.forEach($scope.entry.src_locations[CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE], function(location, pos){
          switch(location.data.type){
            case 'circle':
              var obj = new google.maps.Circle(angular.extend({
                  center: {lat: location.data.coordinates[0], lng: location.data.coordinates[1] },
                  radius: location.data.radius
                }, shapeOptions));
               break;
             case 'point':
               var obj = new google.maps.Marker({
                 position: {lat: location.data.coordinates[0], lng: location.data.coordinates[1] },
               });
               obj.setMap(map);
               //obj.setEditable(true);
               break;
             case 'polygon':
               var paths = [];
               angular.forEach(location.data.coordinates, function(coordinates){
                 paths.push({lat: coordinates[0], lng: coordinates[1]});
               });
               var obj = new google.maps.Polygon(angular.extend({
                   paths: paths
                 }, shapeOptions));
                break;
          }
          obj.id = idTokenizer;
          idTokenizer++;
          if(location.data.type !== 'point'){
            obj.setMap(map);
            obj.setEditable(false);
            google.maps.event.addListener(obj, 'click', function() {
              setSelection(obj);
            });
          }
          var ol = LocationOverlay.create(location.data.type);
          ol.setObject(obj);
          $scope.entry.src_locations[CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE][pos] = ol;
        });
      });
  }

  hookDrawingManager();

  $scope.severityLevels = EntryService.getSeverityLevels();
  $scope.reliabilityLevels = EntryService.getReliabilityLevels();
  $scope.statusLevels = TagService.getByClass('status');
  $scope.timelineLevels = TagService.getByClass('timeline');

  $scope.today = function() {
    $scope.dt = new Date();
  };

  $scope.dateOptions = {
   formatYear: 'yy',
   startingDay: 1
 };
  $rootScope.$broadcast("updatePage", {
      pageCaption: ($scope.entry.isNew() ? 'Create Entry' : 'Edit Entry'),
      pageSubCaption:  $scope.entry.name
  });


  $scope.actions = {
    submit: function(form, entry, next){
      $scope.serverErrors = [];
      EntryService.save($scope.entry).then(
          function(rsp){
            $scope.entry = new Entry(rsp);
            if(next == 'return'){
              $state.transitionTo('signed.entries').then(function(){
                // notification or something
              });
            }
            else{
              $state.transitionTo('signed.entry', {'lead_id': rsp.lead_id}).then(function(){
                $scope.entry = new Entry({lead_id: rsp.lead_id});
              });
            }
          },
          function(res){
              if(typeof res.data.message !== 'undefined'){
                $scope.serverErrors.push(res.data.message);
              }
          });
    },
    getGeoname: function(country_code, value){
      return LocationService.getGeonameFinder(country_code, value).then(function(rsp){
        $scope.geonameLocations = rsp.results;
      })
    },
    getLocation: function(country_code, value){
      return LocationService.getFinder(country_code, value).then(function(rsp){
        $scope.selfLocations = rsp.results;
      })
    }
  };
});
