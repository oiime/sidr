'use strict';
angular.module('sidrApp')
.service('DomainService', function($q, APIService, ObjectsService, Domain){
    angular.extend(this, ObjectsService.overload(this, 'domain', Domain));

    this.initCache = function(){
      var defer = $q.defer();

      if(typeof self.domains !== 'undefined'){
        defer.resolve(self.domains);
      }
      else {
        APIService.get('/domains').then(
          function(res) {
            self.domains = [];
            angular.forEach(res.result, function(domain){
              var domain = new Domain(domain);
              self.domains.push(domain)
            });
            defer.resolve(self.domains);
          },
          function(res) {
            defer.reject(res);
          });
      }
      return defer.promise;
    };
    this.getDomainCountries = function(id){
      var countries = [];
      angular.forEach(self.domains, function(domain){
        if(domain.id == id){
          countries = domain.restrict_countries;
        }
      })
      return countries;
    };
    this.getDropdown = function(){
      var rsp = [];
      angular.forEach(self.domains, function(domain){
        rsp.push({'id': parseInt(domain.id), 'name_display': domain.name_display});
      })
      return rsp;
    };
    this.getTitleMap = function(){
      var rsp = {};
      angular.forEach(self.domains, function(domain){
        rsp[parseInt(domain.id)] = domain.name_display;
      })
      return rsp;
    };
    this.getDomainTagclassState = function(domain_id){
      return APIService.get('/domain_tagclasses/' + domain_id);
    }
})
.factory('Domain', function(ObjectService){
  return function(data) {
      this.columns = {
          'name': null,
          'name_display': null,
          'description': null,
          'restrict_countries': null,
          'event_types': null
      };
      angular.extend(this, ObjectService.overload(this))
      angular.extend(this, data);
  };
});
