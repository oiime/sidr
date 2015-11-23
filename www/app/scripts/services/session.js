'use strict';
angular.module('sidrApp')
.service('SessionService', function($http,  $q){
      this.serialize = function(){
          return {token: this.token, user: this.user};
      };
      this.unserialize = function(data){
        this.create(data.token, data.user);
      };
      this.create = function (token, user) {
        this.token = token;
        this.user = user;
      };
      this.destroy = function () {
        this.token = null;
        this.user = null;
      };
      this.setToken = function(token){
        this.token = token;
      };
      return this;
});
