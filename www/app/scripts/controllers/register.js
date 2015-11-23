'use strict';

angular.module('sidrApp')
.controller('RegisterCtrl', function ($scope, $state, UserService, AuthService, User) {
  $scope.user =  new User();
  $scope.serverErrors = [];

  $scope.actions = {
    'submit': function(form){
      $scope.serverErrors = [];
      UserService.save($scope.user).then(
            function(rsp){
              var user = new User(rsp.user);
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
