'use strict';
angular.module('sidrApp')
.service('UserService', function($q, CONST, APIService, ObjectsService, User){
    angular.extend(this, ObjectsService.overload(this, 'user', User));
    var self = this;
    this.save = function(user){
      if(user.isNew()){
          return user.save(APIService.post('/register', user.export()));
      }
      else {
          return user.save(APIService.post('/user/' + user.id, user.export()));
      }
    };
    this.setState = function(user, k, v){
      var state = user.state;
      if(! (state instanceof Object)){
        state = {};
      }
      state[k] = v;
      return user.save(APIService.post('/user/' + user.id, {'state': state}));
    };
    this.getUserStatusMap = function(){
      var rsp = {};
      rsp[CONST.STATUS_PENDING] = 'Pending';
      rsp[CONST.STATUS_INACTIVE] = 'Inactive';
      rsp[CONST.STATUS_ACTIVE] = 'Active';
      rsp[CONST.STATUS_DELETED] = 'Deleted';

      return rsp;
    }
    this.getUsersMap = function(){
        return APIService.get('/users/map');
    };
    this.getUserStatusDropdown = function(){
      var rsp = [];
      angular.forEach(self.getUserStatusMap(), function(name, id){
        rsp.push({'id': id, 'title': name});
      })
      return rsp;
    }

})
.factory('User', function(ObjectService){
  return function(data) {
    this.columns = {
        'email': null,
        'name': null,
        'password': null,
        'orgnization': null,
        'status': null,
        'role': null,
        'state': null
    };
    angular.extend(this, ObjectService.overload(this))
    angular.extend(this, data);
  };
});
