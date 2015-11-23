'use strict';

angular.module('sidrApp')
.controller('LocationsCtrl', function ($scope, $rootScope, $state, APIService,LocationService,ngTableParams, CONST) {
  var uploader = $scope.uploader = APIService.uploader('/location/csv');

  uploader.onSuccessItem = function(fileItem, response, status, headers) {
      console.info('onSuccessItem', fileItem, response, status, headers);
      console.log(response);
      fileItem.remove();
  };
  $rootScope.$broadcast("updatePage", {
      pageCaption: 'Locations',
      pageSubCaption:  ''
  });

  $scope.tableParams = new ngTableParams({
      page: 1,
      count: 50
  }, {
      total: 0,
      getData: function($defer, params) {
          LocationService.find(params.$params, function(data){
            params.total(data.total);
            $defer.resolve(data.result);
          });
      }
  });
});
