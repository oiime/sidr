'use strict';
angular.module('sidrApp')
.service('EntryService', function($q, CONST, APIService, ObjectsService, Entry){
    angular.extend(this, ObjectsService.overload(this, 'entry', Entry, 'entries'));
    var self = this;
    this.updateStatus = function(id, status){
      var defer = $q.defer();
      APIService.post('/entry/' + id, {status: status}).then(
        function(res) {
          defer.resolve(new Entry(res));
        },
        function(res) {
          defer.reject(res);
        });
      return defer.promise;
    }
    this.getEntryStatusMap = function(){
      var rsp = {};
      rsp[CONST.STATUS_ACTIVE] = 'Active';
      rsp[CONST.STATUS_INACTIVE] = 'Inactive';
      rsp[CONST.STATUS_DELETED] = 'Deleted';

      return rsp;
    }
    this.getEntryStatusDropdown = function(){
      var rsp = [];
      angular.forEach(self.getEntryStatusMap(), function(name, id){
        rsp.push({'id': id, 'title': name});
      })
      return rsp;
    }
    this.getSeverityLevels = function(){
      return [
        {'id': 1, title: 'No problem'},
        {'id': 2, title: 'Minor problem'},
        {'id': 3, title: 'Situation of concern'},
        {'id': 4, title: 'Situation of major concern'},
        {'id': 5, title: 'Severe conditions'},
        {'id': 6, title: 'Critical situation'},
      ];
    }
    this.getReliabilityLevels = function(){
      return [
        {'id': 1, title: 'Completely'},
        {'id': 2, title: 'Usually'},
        {'id': 3, title: 'Fairly'},
        {'id': 4, title: 'Not Usuaully'},
        {'id': 5, title: 'Unrealiable'},
        {'id': 6, title: 'Can not be judged'},
      ];
    }
    this.getTitleMap = function(obj){
      var rsp = {};
      angular.forEach(obj, function(elm){
        rsp[elm.id] = elm.title;
      });
      return rsp;
    }
})
.factory('Entry', function(ObjectService, TagClassService, CONST, md5){
  return function(data) {
      var self = this;
      this.orig = angular.copy(data);
      this.columns = {
          'name': null,
          'lead_id': null,
          'excerpt': null,
          'tags': null,
          'country_code': null,
          'locations': [],
          'tags': {},
          'severity': null,
          'reliability': null,
          'timeline': null,
          'status_ord': null,
          'information_at': null
      };
      angular.extend(this, ObjectService.overload(this))
      angular.extend(this, data);

      this.postprocessExport = function(obj){
        var locations = [], tags = {};
        angular.forEach([CONST.LOCATION_SOURCE_GEONAME, CONST.LOCATION_SOURCE_SELF, CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE], function(source){
          angular.forEach(self.src_locations[source], function(location){
            if(typeof location.toLocationExport === 'function'){
              locations.push(location.toLocationExport(source));
            } else {
              locations.push(location);
            }
          })
        })
        obj.locations = locations;
        angular.forEach(obj.tags, function(ctags, tag_class){
          tags[tag_class] = [];
          angular.forEach(ctags, function(tag){
            if(typeof tag === 'object' && typeof tag.id === 'undefined'){
              // meh
            } else {
              tags[tag_class].push(tag);
            }
          });
        });
        obj.tags = tags;
        return obj;
      }

      // import in
      this.src_locations = {}
      this.src_locations[CONST.LOCATION_SOURCE_GOOGLE_MAP_SHAPE] = [];
      this.src_locations[CONST.LOCATION_SOURCE_GEONAME] = [];
      this.src_locations[CONST.LOCATION_SOURCE_SELF] = [];

      angular.forEach(this.locations, function(location){
        self.src_locations[location.source].push(location);
      })

      // yet another ugly hack to fit in the "parameters" for tags
      if(typeof this.tags !== 'undefined'){
        angular.forEach(this.tags, function(tags, tag_class){
          var ntags = [];
          if(typeof TagClassService.getClassParamters(tag_class) === 'undefined'){
            angular.forEach(tags, function(tag){
              ntags.push(tag.id);
            })
            self.tags[tag_class] = ntags;
          }
        })
      }
  };
});
