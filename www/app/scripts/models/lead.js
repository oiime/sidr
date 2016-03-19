'use strict';
angular.module('sidrApp')
.service('LeadService', function($q, CONST, APIService, ObjectsService, Lead){
    angular.extend(this, ObjectsService.overload(this, 'lead', Lead));
    var self = this;
    this.leadTypes = {
      'manual': 'Manual Entry',
      'attachment': 'Attachment',
      'url': 'URL'
    }
    this.updateStatus = function(id, status){
      var defer = $q.defer();
      APIService.post('/lead/' + id, {status: status}).then(
        function(res) {
          defer.resolve(new Lead(res));
        },
        function(res) {
          defer.reject(res);
        });
      return defer.promise;
    }
    this.getLeadTypeName = function(lead_type){
      return this.leadTypes[lead_type];
    }
    this.getTypesDropdown = function(){
      var rsp = [];
      angular.forEach(self.leadTypes, function(name, id){
        rsp.push({'id': id, 'title': name});
      })
      return rsp;
    }
    this.getLeadStatusMap = function(){
      var rsp = {};
      rsp[CONST.STATUS_PENDING] = 'Pending';
      rsp[CONST.STATUS_INACTIVE] = 'Processed';
      rsp[CONST.STATUS_DELETED] = 'Deleted';

      return rsp;
    }
    this.getLeadStatusDropdown = function(){
      var rsp = [];
      angular.forEach(self.getLeadStatusMap(), function(name, id){
        rsp.push({'id': id, 'title': name});
      })
      return rsp;
    }
    this.getConfidentialityMap = function(){
      var rsp = {};
      rsp[CONST.CONFIDENTIALITY_UNPROTECTED] = 'Unprotected';
      rsp[CONST.CONFIDENTIALITY_PROTECTED] = 'Protected';
      rsp[CONST.CONFIDENTIALITY_RESTRICTED] = 'Restricted';
      rsp[CONST.CONFIDENTIALITY_CONFIDENTIAL] = 'Confidential';
      return rsp;
    }
    this.getConfidentialityDropdown = function(){
      var rsp = [];
      angular.forEach(self.getConfidentialityMap(), function(name, id){
        rsp.push({'id': id, 'title': name});
      })
      return rsp;
    }
})
.factory('Lead', function(ObjectService, CONST){
  return function(data) {
      this.columns = {
          'domain_id': null,
          'lead_type': null,
          'source_id': null,
          'content_format_id': null,
          'name': null,
          'confidentiality': null,
          'description': null,
          'website': null,
          'url': null,
          'published_at': null,
          'assignee_id': null,
          'binbags': []
      };
      angular.extend(this, ObjectService.overload(this));
      angular.extend(this, {confidentiality: CONST.CONFIDENTIALITY_UNPROTECTED});
      angular.extend(this, data);

      this.postprocessExport = function(obj){
        angular.forEach(obj, function(value, key){
          if(['binbags', 'published_at'].indexOf(key) !== -1 && obj[key] === null){
            delete obj[key];
          }
          switch(key){
            case 'confidentiality':
              obj[key] = parseInt(obj[key]);
              break;
          }
        });
        return obj;
      }
  };
});
