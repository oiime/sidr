'use strict';
angular.module('sidrApp')
  .factory('AuthService', function(APIService, SessionService, User, $location, $cookies, $q) {
    return {
        authenticate: function(credentials){
          var defer = $q.defer();
          APIService.post('/auth', credentials).then(
              function(res) {
                  defer.resolve(res);
              },
              function(res) {
                  defer.reject(res);
              });
          return defer.promise;
        },
        init: function(){
            if($cookies.get('session')){
              var session = $cookies.getObject('session');
              SessionService.create(session.token, new User(session.user));
            }
        },
        assign: function(token, user){
            SessionService.create(token, user);
            $cookies.putObject('session', {
              token: token,
              user: user
            });
        },
        update: function(){
          $cookies.putObject('session', {
            token: SessionService.token,
            user: SessionService.user
          });
        },
        isAuthenticated: function () {
          return !!SessionService.user;
        },
        isAuthorized: function (authorizedRoles) {
          if (!angular.isArray(authorizedRoles)) {
            authorizedRoles = [authorizedRoles];
          }
          return (this.isAuthenticated() &&
            authorizedRoles.indexOf(parseInt(SessionService.user.role)) !== -1);
        },
        destroy: function(){
          SessionService.destroy();
          if($cookies.token){
            delete $cookies.token;
          }
        }
      };
  });
