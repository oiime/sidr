'use strict';

angular.module('sidrApp')
.controller('UsersCtrl', function ($scope, $rootScope, $state, UserService,ngTableParams, CONST) {
  $rootScope.$broadcast("updatePage", {
      pageCaption: 'Users',
      pageSubCaption:  ''
  });

  $scope.userStatus = UserService.getUserStatusMap();
  $scope.userStatusDropdown = UserService.getUserStatusDropdown();
  $scope.tableParams = new ngTableParams({
      page: 1,
      count: 50
  }, {
      total: 0,
      getData: function($defer, params) {
          UserService.find(params.$params, function(data){
            params.total(data.total);
            console.log(data.result);
            $defer.resolve(data.result);
          });
      }
  });

  $scope.actions = {
    changeStatus: function(user, $index, status){
      UserService.updateStatus(user.id, status).then(function(rsp){
        user.status = rsp.status;
      })
    }
  }
});
