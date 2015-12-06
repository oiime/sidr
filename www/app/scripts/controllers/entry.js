'use strict';

angular.module('sidrApp')
.controller('EntriesCtrl', function ($scope, $rootScope, $uibModal, $state, EntryService, SessionService, LocationService, TagService, TagClassService, ngTableParams, CONST) {
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
        status: CONST.STATUS_ACTIVE,
        domain_id: SessionService.user.state.focus_domain_id
      }
  }, {
      total: 0,
      getData: function($defer, params) {
          EntryService.find(params.$params, function(data){
            params.total(data.total);
            $scope.exportUrls = {
              csv: EntryService.getExportUrl('csv', $scope.tableParams.filter),
              csv_permutated: EntryService.getExportUrl('csv_permutated', $scope.tableParams.filter),
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
    },
    openMap: function (entry) {
      var modalInstance = $uibModal.open({
        animation: true,
        templateUrl: 'mapview.html',
        controller: 'MapViewModalCtrl',
        size: 'lg',
        resolve: {
          locations: function () {
            return entry.locations;
          }
        }
      });
    }
  }
})

.controller('EntryCtrl', function ($scope, $rootScope, $state, $stateParams, $sce, uiGmapIsReady, CONST, entry, Entry, EntryService, APIService, TagService, TagClassService, LocationService, LocationOverlay, DomainService, LeadService, SessionService) {
  if($stateParams.hasOwnProperty('overlay') && typeof $stateParams.overlay !== 'undefined'){
    $scope.entry = new Entry(angular.fromJson($stateParams.overlay));
  } else {
    $scope.entry = entry;
  }
  $scope.countries = LocationService.getCountries(DomainService.getDomainCountries(SessionService.user.state.focus_domain_id));
  $scope.countries.push({code: null, name:'No Country'});

  if(typeof $scope.entry.country_code === 'undefined'){
    $scope.entry.country_code = $scope.countries[0].code;
  }
  $scope.serverErrors = [];
  $scope.geonameLocations = [];
  $scope.selfLocations = [];
  $scope.shapeSelected = false;
  $scope.tagGroups = [];
  $scope.lead = null;

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
          if(typeof selectedShape.setEditable !== 'undefined'){
            selectedShape.setEditable(false);
          }
          selectedShape = null;
        }
        $scope.shapeSelected = false;
        $scope.$apply();
      }
      function setSelection(shape) {
        clearSelection();
        selectedShape = shape;
        if(typeof shape.setEditable !== 'undefined'){
          shape.setEditable(true);
        }
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
      $scope.mapsearchbox = {
        template:'searchbox.tpl.html',
        place: null,
        events: {
          places_changed: function(search){
            var places = search.getPlaces(), place, bounds;
            if (places.length == 0) {
              return;
            }
            place = places[0];
            bounds = new google.maps.LatLngBounds();
            bounds.extend(place.geometry.location);
            $scope.map.bounds = {
              northeast: {
                latitude: bounds.getNorthEast().lat(),
                longitude: bounds.getNorthEast().lng()
              },
              southwest: {
                latitude: bounds.getSouthWest().lat(),
                longitude: bounds.getSouthWest().lng()
              }
            };
            $scope.map.zoom = 10;
          }
        }
      };
      $scope.mapOptions = {scrollwheel: true};
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
          drawingManager.setDrawingMode(null);
          var newShape = e.overlay;
          newShape.type = e.type;
          google.maps.event.addListener(newShape, 'click', function() {
            setSelection(newShape);
          });
          setSelection(newShape);
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
          obj.setMap(map);
          if(location.data.type !== 'point'){
            obj.setEditable(false);
          }
          google.maps.event.addListener(obj, 'click', function() {
            setSelection(obj);
          });
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
    checkEmptyTag: function(tag_class){
      var needsMoreRowz = true;
      if(typeof $scope.entry.tags === 'undefined'){
        $scope.entry.tags = {};
      }
      if(typeof $scope.entry.tags[tag_class] === 'undefined'){
        $scope.entry.tags[tag_class] = [];
      }
      angular.forEach($scope.entry.tags[tag_class], function(o){
        if(typeof o.id === 'undefined' || o.id < 1){
          needsMoreRowz = false;
        }
      });
      if(needsMoreRowz){
        $scope.entry.tags[tag_class].push({});
      }
    },
    tagChange: function(tag_class, item, model){
      $scope.actions.checkEmptyTag(tag_class);
    },
    removeTag: function(tag_class, tags, idx){
      tags.splice(idx, 1);
      $scope.actions.checkEmptyTag(tag_class);
    },
    submit: function(form, entry, next){
      $scope.serverErrors = [];
      EntryService.save($scope.entry).then(
          function(rsp){
            if(next == 'return'){
              $state.transitionTo('signed.entries').then(function(){
                // notification or something
              });
            }
            else if (next == 'next_similar') {
              var overlay = {
                lead_id: rsp.lead_id,
                locations: rsp.locations,
                excerpt: rsp.excerpt,
                information_at: rsp.information_at
              };
              $state.transitionTo('signed.entry', {lead_id: rsp.lead_id, overlay: angular.toJson(overlay)}, {reload: true}).then(function(){

              });
            }
            else{
              $state.transitionTo('signed.entry', {'lead_id': rsp.lead_id}, {reload: true}).then(function(){

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
  // load tag group data
  angular.forEach(['sector', 'vulnerable', 'affected', 'underlying'], function(tag_class){
    $scope.tagGroups.push({name: tag_class, tags: TagService.getByClass(tag_class), parameters: TagClassService.getClassParamters(tag_class), title: TagClassService.getClassTitle(tag_class)});
    if(typeof TagClassService.getClassParamters(tag_class) !== 'undefined'){
      $scope.actions.checkEmptyTag(tag_class);
    }
  });
  // load Lead
  LeadService.get($scope.entry.lead_id).then(function(lead){
    $scope.lead = lead;
    if(typeof lead.url !== 'undefined' && lead.url !== null && lead.url.length > 0){
      $scope.leadUrl = $sce.trustAsResourceUrl($scope.lead.url);
    }
  })
});
