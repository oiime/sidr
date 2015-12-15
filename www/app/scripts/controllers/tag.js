'use strict';

angular.module('sidrApp')
.controller('TagsCtrl', function ($scope, $rootScope, $state, $stateParams, $confirm, TagService, TagClassService, DomainService, ngTableParams) {
  $scope.tag_class = $stateParams.tag_class;
  $scope.tagClassName = TagClassService.getClassTitle($scope.tag_class);
  $scope.domainsSelect = DomainService.getDropdown();
  $scope.tagClassStructure = TagClassService.getClassStructure($scope.tag_class);
  $scope.states = {
    exclude_domain_ids: []
  };
  TagClassService.getTagClassState($scope.tag_class).then(function(rsp){
    $scope.states = rsp;
  })

  $rootScope.$broadcast("updatePage", {
      pageCaption: 'Tags',
      pageSubCaption:  $scope.tagClassName
  });

  $scope.actions = {
    updateDomainExclusion: function(){
      TagClassService.updateClassStructure($scope.tag_class, $scope.states);
    },
    delete: function(tag, idx){
      $confirm({text: 'Are you sure you want to delete this tag?'}).then(function() {
        TagService.delete(tag.id).then(function(){
          $scope.tableParams.reload();
        });
      });
    }
  };
  $scope.tableParams = new ngTableParams({
      page: 1,
      count: 50
  }, {
      total: 0,
      getData: function($defer, params) {
          var pparams = angular.copy(params.$params);
          pparams.filter.tag_class = $scope.tag_class;
          TagService.find(pparams, function(data){
            params.total(data.total);
            $defer.resolve(data.result);
          });
      }
  });
})
.controller('TagCtrl', function ($scope, $rootScope, $state, $stateParams, tag, Tag, TagService, TagClassService) {
  $scope.tag = tag;
  $scope.tags = [];
  $scope.tagClassName = TagClassService.getClassTitle($scope.tag.tag_class);
  $scope.tagClassStructure = TagClassService.getClassStructure($scope.tag.tag_class);
  $scope.serverErrors = [];

  TagService.find({filter: {tag_class: $scope.tag.tag_class}}, function(rsp){
    $scope.tags = rsp.result;
  });

  $rootScope.$broadcast("updatePage", {
      pageCaption: ($scope.tag.isNew() ? 'Create ' + $scope.tagClassName : 'Edit ' + $scope.tagClassName),
      pageSubCaption:  $scope.tag.name
  });

  $scope.actions = {
    'submit': function(form, tag, next){
      $scope.serverErrors = [];
      TagService.save($scope.tag).then(
            function(rsp){
              $scope.tag = new Tag(rsp);
              if(next == 'return'){
                $state.transitionTo('signed.tags', {'tag_class': rsp.tag_class}).then(function(){
                  // notification or something
                });
              } else if(next == 'next') {
                $state.transitionTo('signed.tag', {'tag_class': rsp.tag_class}).then(function(){
                  $scope.tag = new Tag({tag_class: $scope.tag.tag_class});
                });
              }
            },
            function(res){
                if(typeof res.data.message !== 'undefined'){
                  $scope.serverErrors.push(res.data.message);
                }
            });
      return false;
    }
  };
});
