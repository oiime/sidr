'use strict';

angular.module('sidrApp')
.controller('DomainsCtrl', function ($scope, $rootScope, $state, DomainService, LocationService, TagService, ngTableParams) {
  $rootScope.$broadcast("updatePage", {
      pageCaption: 'Domains',
      pageSubCaption:  ''
  });

  $scope.TagService = TagService;
  $scope.countries = LocationService.getCountriesDropdown();
  $scope.tableParams = new ngTableParams({
      page: 1,
      count: 50
  }, {
      total: 0,
      getData: function($defer, params) {
          DomainService.find(params.$params, function(data){
            params.total(data.total);
            $defer.resolve(data.result);
          });
      }
  });
})
.controller('DomainCtrl', function ($scope, $rootScope, $state, domain, Domain, DomainService, TagService, LocationService) {
  $scope.domain = domain;
  $scope.countries = LocationService.getCountries();
  $scope.tags = TagService.getByClass('event_type');
  $scope.serverErrors = [];

  $rootScope.$broadcast("updatePage", {
      pageCaption: ($scope.domain.isNew() ? 'Create Domain' : 'Edit Domain'),
      pageSubCaption:  $scope.domain.name
  });

  $scope.actions = {
    'submit': function(form){
      $scope.serverErrors = [];
      DomainService.save(domain).then(
            function(rsp){
              $scope.domain = new Domain(rsp);
              $state.transitionTo('signed.domains').then(function(){
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
