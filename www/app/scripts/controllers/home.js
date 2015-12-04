'use strict';

angular.module('sidrApp')
.controller('HomeCtrl', function ($scope, $rootScope, CONST, EntryService, SessionService, locations, actions) {
  $rootScope.updateOverview();
  $scope.actionTitles = {};
  $scope.actionTitles[CONST.ACTION_TYPE_ADD_ENTRY] = 'Add entry';
  $scope.actionTitles[CONST.ACTION_TYPE_EDIT_ENTRY] = 'Edit entry';
  $scope.actionTitles[CONST.ACTION_TYPE_ADD_LEAD] = 'Add lead';
  $scope.actionTitles[CONST.ACTION_TYPE_EDIT_LEAD] = 'Edit lead';

  $scope.mapMarkers = [];
  $scope.actions = [];

  $scope.actions = actions.result;
  $scope.locations = locations.locations;

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
