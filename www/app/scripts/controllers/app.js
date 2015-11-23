angular.module('sidrApp')
.controller('AppCtrl', function ($rootScope, $scope, $state, SessionService, ENV, USER_ROLES) {
  $scope.$state = $state;
  $scope.ENV = ENV;
  $scope.USER_ROLES = USER_ROLES;
  $scope.currentUser = SessionService.user;
  $scope.caption = '';
  $scope.subcaption = '';

  $rootScope.$on("updatePage", function (event, args) {
    if(typeof args.hide !== 'undefined' && args.hide === true){
      $scope.pageHideBreadcrumbs = true;
    }
    else{
      $scope.pageHideBreadcrumbs = false;
    }
    $scope.pageCaption = args.pageCaption;
    $scope.pageSubCaption = args.pageSubCaption;
  });
});
