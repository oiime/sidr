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
})
.controller('ResetCtrl', function ($scope, $state, UserService) {
  $scope.email = null;
  $scope.sent = false;
  $scope.actions = {
    submit: function(form){
      $scope.serverErrors = [];
      UserService.sendResetLink($scope.email).then(
            function(rsp){
               $scope.sent = true;
            },
            function(res){
                if(typeof res.data.message !== 'undefined'){
                  $scope.serverErrors.push(res.data.message);
                }
            });
    }
  };
})
.controller('ResetRecieveCtrl', function ($scope, $state, $stateParams, UserService) {
  $scope.password = null;
  $scope.password2 = null;
  $scope.serverErrors = [];

  $stateParams.token;

  $scope.actions = {
    submit: function(form){
      $scope.serverErrors = [];
      UserService.sendResetToken($stateParams.token, $scope.password).then(
            function(rsp){
               $state.transitionTo('login');
            },
            function(res){
                if(typeof res.data.message !== 'undefined'){
                  $scope.serverErrors.push(res.data.message);
                }
            });
    }
  };
})
