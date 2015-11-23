'use strict';
angular.module('sidrApp')
.service('ObjectsService', function($q, ENV, APIService){
  this.overload = function(service, uName, uClass, uNamePlural){
    if(typeof uNamePlural === 'undefined'){
      uNamePlural = uName + 's'
    }
    return {
      getExportUrl: function(rtype, filter){
        console.log(ENV.apiEndpoint + '/' + uNamePlural + '?rtype=' + rtype + '&auth=' + ENV.Authorization + '&filter=' + JSON.stringify(filter));
        return ENV.apiEndpoint + '/' + uNamePlural + '?rtype=' + rtype + '&auth=' + ENV.Authorization + '&filter=' + JSON.stringify(filter);
      },
      save: function(obj){
        if(obj.isNew()){
            return obj.save(APIService.post('/' + uName, obj.export()));
        }
        else {
            return obj.save(APIService.post('/' + uName + '/' + obj.id, obj.export()));
        }
      },
      delete: function(id){
        var defer = $q.defer();
        APIService.delete('/' + uName + '/' + id).then(
          function(res) {
            defer.resolve(res);
          },
          function(res) {
            defer.reject(res);
          });
        return defer.promise;
      },
      get: function(id){
        var defer = $q.defer();
        APIService.get('/' + uName + '/' + id).then(
          function(res) {
            defer.resolve(new uClass(res));
          },
          function(res) {
            defer.reject(res);
          });
        return defer.promise;
      },
      find: function(params, cb){
        return APIService.post('/' + uNamePlural, params).then(function(rsp){
            cb(rsp);
        }, function(err){
          console.log(err);
        })
      }
    }
  };
})
.service('ObjectService', function($q){
  this.overload = function(record){
    return {
      isNew: function(){
        return (typeof record.id === 'undefined')?true:false;
      },
      export: function(){
        var obj = {}
        if(typeof this.columns !== 'undefined'){
          var sObj = this;
          angular.forEach(this.columns, function(v, k){
            if (sObj[k] !== undefined){
              obj[k] = sObj[k];
            }
          })
        }
        else {
          obj = angular.fromJson(angular.toJson(this));
        }
        if(typeof this.postprocessExport !== 'undefined'){
          obj = this.postprocessExport(obj);
        };
        return obj;
      },
      save: function(req){
        var defer = $q.defer();
        req.then(
          function(res) {
            defer.resolve(new record.constructor(res));
          },
          function(res) {
            defer.reject(res);
          });
        return defer.promise;
      }
    }
  }
})
