angular.module('sidrApp')
.controller('SignedCtrl', function ($rootScope, $scope, $state, TagClassService, DomainService, UserService, SessionService, AuthService, APIService, ENV, CONST) {
  $scope.overview = {}
  $scope.tagClasses = TagClassService.getDropdown();
  $scope.domainsDropdown = DomainService.getDropdown();
  $scope.domainTitleMap = DomainService.getTitleMap();
  $scope.currentUser = SessionService.user;
  $scope.ENV = ENV;
  $scope.ENV.Authorization = SessionService.token;
  $scope.CONST = CONST;
  $scope.dateRangePickerOptions = {
        format: 'YYYY-MM-DD',
        ranges: {
            'All Times': [moment().subtract(30, 'years'), moment()],
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 days': [moment().subtract(7, 'days'), moment()],
            'Last 30 days': [moment().subtract(30, 'days'), moment()],
            'This month': [moment().startOf('month'), moment().endOf('month')]
        }
  };
  $scope.signedActions = {
    getStatusClass: function(status){
      var classes = {};
      classes[$scope.CONST.STATUS_ACTIVE] = 'text-green';
      classes[$scope.CONST.STATUS_INACTIVE] = 'text-yellow';
      classes[$scope.CONST.STATUS_PENDING] = 'text-blue';
      classes[$scope.CONST.STATUS_DELETED] = 'text-red';
      return classes[status];
    },
    updateCurrentDomain: function(domain){
      var domain_id;
      if(typeof domain === 'undefined'){
        $scope.currentUser.state.focus_domain_id = domain_id = 0;
      }
      else{
        domain_id = parseInt(domain.id);
      }
      UserService.setState(SessionService.user, 'focus_domain_id',domain_id).then(function(user){
        SessionService.user = user;
        AuthService.update();
        $scope.signedActions.updateOverview();
        if($scope.currentUser.state == null){
          $scope.currentUser.state = {};
        }
        $scope.currentUser.state.focus_domain_id = domain_id;
      })
    },
    updateOverview: function(){
      if(SessionService.user.state !== null && typeof SessionService.user.state.focus_domain_id !== 'undefined'){
        APIService.get('/overview/' + SessionService.user.state.focus_domain_id).then(function(res){
          $scope.overview = res;
        })
      }
    }
  }
  $scope.signedActions.updateOverview();

  $rootScope.updateOverview = function(){
    $scope.signedActions.updateOverview();
  }

});
