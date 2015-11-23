'use strict';
angular.module('sidrApp')
.factory('APIService', function($http,  $q, $rootScope, ENV, API_EVENTS, SessionService, FileUploader){
  var uploadRequest = function(uri, payload){
    var defer = $q.defer();
    var headers = {};
    var httpArgs = [ENV.apiEndpoint + uri];
    if(SessionService.token){
        headers.Authorization = SessionService.token;
    }
    var uploader = new FileUploader({
        url: httpArgs,
        headers: headers,
        autoUpload: true
    });
    return uploader

  };
  var request = function(method, uri, payload){
    var defer = $q.defer();
    var httpArgs = [ENV.apiEndpoint + uri];
    var headers = {};
    method = method.toLowerCase();
    if(SessionService.token){
        headers.Authorization = SessionService.token;
    }

    if (method.match(/post|put/)){
        httpArgs.push( payload );
    }
    httpArgs.push({headers: headers});

    $http[method].apply(null, httpArgs)
        .success(function(data){
            defer.resolve(data);
        })
        .error(function(data, status){
            switch(status){
                case 400:
                  defer.reject({status: status, data: data});
                  break;
                case 401:
                case 403:
                  $rootScope.$broadcast(API_EVENTS.notAuthenticated , data);
                  defer.reject({status: status, data: data});
                  break;
                case 404:
                  $rootScope.$broadcast(API_EVENTS.endpointMissing , data);
                  defer.reject({status: status, data: data});
                  break;
                case 500:
                case 502:
                  $rootScope.$broadcast(API_EVENTS.internalError , data);
                  defer.reject({status: status, data: data});
                  break;
                default:
                  $rootScope.$broadcast(API_EVENTS.unknownResponse , data);
                  defer.reject({status: status, data: null});
                  break;
            }
        });
    return defer.promise;
  }

  return {
      get: function( uri ){
          return request( 'get', uri );
      },
      post: function( uri, data ){
          return request( 'post', uri, data );
      },
      put: function( uri, data ){
          return request( 'put', uri, data );
      },
      delete: function( uri ){
          return request( 'delete', uri );
      },
      uploader: function( uri ){
          return uploadRequest( uri );
      }
  };
});
