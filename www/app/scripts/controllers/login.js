'use strict';

angular.module('sidrApp')
.controller('LoginCtrl', function ($scope, $state, AuthService, UserService, User) {
  $scope.credentials = {};
  $scope.serverErrors = [];

  $scope.actions = {
    'submit': function(form){
      $scope.serverErrors = [];
      AuthService.authenticate($scope.credentials).then(
            function(rsp){
              var user = new User(rsp.user)
              AuthService.assign(rsp.token, user);
               $state.transitionTo('signed.home').then(function(){
                 // notification or something
               });
            },
            function(res){
                if(typeof res.data.message !== 'undefined'){
                  $scope.serverErrors.push(res.data.message);
                }
            });
    }
  };
});
