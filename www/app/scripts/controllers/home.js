'use strict';

angular.module('sidrApp')
.controller('HomeCtrl', function ($scope, $rootScope, CONST, EntryService, APIService, SessionService) {
  $rootScope.updateOverview();
  $scope.actionTitles = {};
  $scope.actionTitles[CONST.ACTION_TYPE_ADD_ENTRY] = 'Add entry';
  $scope.actionTitles[CONST.ACTION_TYPE_EDIT_ENTRY] = 'Edit entry';
  $scope.actionTitles[CONST.ACTION_TYPE_ADD_LEAD] = 'Add lead';
  $scope.actionTitles[CONST.ACTION_TYPE_EDIT_LEAD] = 'Edit lead';

  $scope.mapMarkers = [];
  $scope.actions = [];

  APIService.post('/actions', {count: 10}).then(function(rsp){
    $scope.actions = rsp.result;
  })
  if(SessionService.user.state !== null && typeof SessionService.user.state.focus_domain_id !== 'undefined'){
    APIService.get('/overview/locations/' + SessionService.user.state.focus_domain_id).then(function(res){
      $scope.mapMarkers = [];
      angular.forEach(res.locations, function(location){
        $scope.mapMarkers.push({
          latitude: location.latitude,
          longitude: location.longitude,
          title: location.asciiname,
          id: location.location_id
        })
      });
    })
  }
  $rootScope.$broadcast("updatePage", {
      hide: true
  });
  $scope.severityLevels = EntryService.getSeverityLevels();
  $scope.map = {
    center: {
      latitude: 45,
      longitude: -73
    },
    zoom: 2,
  };
});
