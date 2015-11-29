'use strict';
angular.module('sidrApp')
.service('TagClassService', function($q, APIService){
    var self = this;
    this.initClasses = function(){
      var defer = $q.defer();

      if(typeof self.tagClasses !== 'undefined'){
        defer.resolve(self.tagClasses);
      }
      else {
        APIService.get('/tag_classes').then(
          function(res) {
            self.tagClasses = res.result;
            self.tagClassesMap = {};
            angular.forEach(self.tagClasses, function(cls){
              self.tagClassesMap[cls.name] = cls;
            });
            defer.resolve(self.tagClasses);
          },
          function(res) {
            defer.reject(res);
          });
      }
      return defer.promise;
    };
    this.getDropdown = function(){
      var rsp = [];
      angular.forEach(self.tagClasses, function(cls){
        rsp.push({'id': cls.name, 'title': cls.metadata.title});
      })
      return rsp;
    };
    this.getClassTitle = function(tag_class){
      return self.tagClassesMap[tag_class].metadata.title;
    };
    this.getClassStructure = function(tag_class){
      return self.tagClassesMap[tag_class].metadata.structure;
    };
    this.getClassParamters = function(tag_class){
      if(typeof self.tagClassesMap[tag_class].metadata.parameters !== 'undefined'){
        return self.tagClassesMap[tag_class].metadata.parameters;
      } else {
        return undefined;
      }
    };

})
.service('TagService', function($q, APIService, ObjectsService, Tag){
    var self = this;
    angular.extend(this, ObjectsService.overload(this, 'tag', Tag));
    this.initCache = function(){
      var defer = $q.defer();

      if(typeof self.tags !== 'undefined'){
        defer.resolve(self.tags);
      }
      else {
        APIService.get('/tags').then(
          function(res) {
            self.tags = [];
            self.tagsClassMap = {};
            self.tagIdMap = {};
            angular.forEach(res.result, function(tag){
              var tag = new Tag(tag);

              self.tags.push(tag)
              self.tagIdMap[tag.id] = tag;
              if(typeof self.tagsClassMap[tag.tag_class] === 'undefined'){
                self.tagsClassMap[tag.tag_class] = [];
              }
              self.tagsClassMap[tag.tag_class].push(tag);
            });
            defer.resolve(self.tags);
          },
          function(res) {
            defer.reject(res);
          });
      }
      return defer.promise;
    };
    this.getByClass = function(tag_class){
      if(tag_class instanceof Array){
        var rsp = [];
        angular.forEach(tag_class, function(tag_class){
          rsp = rsp.concat(self.tagsClassMap[tag_class]);
        })
        return rsp;
      } else {
        return self.tagsClassMap[tag_class];
      }
    };
    this.getById = function(id){
      return self.tagIdMap[id];
    }
    this.getTitleMap = function(tag_class){
      var rsp = {};
      angular.forEach(self.tags, function(tag){
        if(typeof tag_class === 'undefined' || tag.tag_class == tag_class){
          rsp[tag.id] = tag.title;
        }
      })
      return rsp;
    }
    this.getDropdown = function(tag_class){
      var rsp = [];
      angular.forEach(self.tags, function(tag){
        if(typeof tag_class === 'undefined' || tag.tag_class == tag_class){
          rsp.push({'id': tag.name, 'title': tag.title});
        }
      })
      return rsp;
    };
})
.factory('Tag', function(ObjectService){
  return function(data) {
      this.columns = {
          'tag_class': null,
          'name': null,
          'data': null,
          'restrict_domains': null,
          'title': null,
          'description': null
      };
      angular.extend(this, ObjectService.overload(this))
      angular.extend(this, data);
  };
});
