'use strict';

angular
  .module('sidrApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngMessages',
    'ngTouch',
    'ngTable',
    'ui.router',
    'ui.select',
    'ui.bootstrap',
    'angular-confirm',
    'angularFileUpload',
    'angularMoment',
    'mwl.confirm',
    'uiGmapgoogle-maps',
    'daterangepicker',
    'angular-md5'
  ])
  .constant('ENV', (function () {
      var VERSION = '0.1';
      var root = window.location.hostname.substring(window.location.hostname.indexOf('.') + 1);
      var apiVersion = 'v1'
      var protocol = window.location.protocol;

      return {
          apiEndpoint: protocol + '//api.'+ root + '/' + apiVersion,
          frontendRoot: protocol + '//www.'+ root + '/',
          VERSION: VERSION
      };
  }()))
  .constant('CONST', {
    STATUS_ACTIVE: 1,
    STATUS_INACTIVE: 2,
    STATUS_PENDING: 3,
    STATUS_DELETED: 11,
    LOCATION_SOURCE_SELF: 1,
    LOCATION_SOURCE_GEONAME: 10,
    LOCATION_SOURCE_GOOGLE_MAP_SHAPE: 11,
    ACTION_TYPE_ADD_ENTRY: 1,
    ACTION_TYPE_EDIT_ENTRY: 2,
    ACTION_TYPE_ADD_LEAD: 3,
    ACTION_TYPE_EDIT_LEAD: 4
  })
  .constant('API_EVENTS', {
    endpointMissing: 'rsp-404',
    notAuthenticated: 'rsp-401',
    notAuthorized: 'rsp-403',
    notAcceptable: 'rsp-406',
    internalError: 'rsp-500',
    unknownStatus: 'rsp-unknown'
  })
  .constant('USER_ROLES', {
    user: 1,
    admin: 10
  })
  .config(function ($stateProvider, $urlRouterProvider, $locationProvider, USER_ROLES) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise("/home");
    $stateProvider
      .state('noauth', {
        url: "/noauth",
        templateUrl: "views/noauth.html"
      })
      .state('register', {
        url: "/register",
        controller: 'RegisterCtrl',
        templateUrl: "views/register.html"
      })
      .state('login', {
        url: "/login",
        controller: 'LoginCtrl',
        templateUrl: "views/login.html"
      })
      .state('signed', {
        templateUrl: "views/signed.html",
        controller: 'SignedCtrl',
        data: {
          requireAuth: true
        },
        resolve: {
            tagClasses: function(TagClassService){
              return TagClassService.initClasses();
            },
            tags: function(TagService){
              return TagService.initCache();
            },
            domains: function(DomainService){
              return DomainService.initCache();
            }
        }
      })
      .state('signed.home', {
        url: "/home",
        controller: 'HomeCtrl',
        templateUrl: "views/home.html"
      })
      // USER
      .state('signed.users', {
        url: "/users",
        templateUrl: "views/users.html",
        controller: 'UsersCtrl',
        data: {
          authorizedRoles: [USER_ROLES.admin]
        }
      })
      // LOCATIONS
      .state('signed.locations', {
        url: "/locations",
        templateUrl: "views/locations.html",
        controller: 'LocationsCtrl',
        data: {
          authorizedRoles: [USER_ROLES.admin]
        }
      })
      // DOMAIN
      .state('signed.domains', {
        url: "/domains",
        templateUrl: "views/domains.html",
        controller: 'DomainsCtrl',
        data: {
          authorizedRoles: [USER_ROLES.admin]
        }
      })
      .state('signed.domain', {
        url: "/domain/{id}",
        templateUrl: "views/domain.html",
        controller: 'DomainCtrl',
        data: {
          authorizedRoles: [USER_ROLES.admin]
        },
        resolve: {
          domain: function($stateParams, DomainService, Domain){
            if($stateParams.id > 0){
              return DomainService.get($stateParams.id);
            }
            else {
              return new Domain();
            }
          }
        }
      })
      // LEAD
      .state('signed.leads', {
        url: "/leads",
        templateUrl: "views/leads.html",
        controller: 'LeadsCtrl',
        data: {
          requireAuth: true
        }
      })
      .state('signed.lead', {
        url: "/lead/{id}?lead_type",
        templateUrl: "views/lead.html",
        controller: 'LeadCtrl',
        data: {
          requireAuth: true
        },
        resolve: {
          lead: function($stateParams, SessionService, LeadService, Lead){
            if($stateParams.id > 0){
              return LeadService.get($stateParams.id);
            }
            else {
              var lead = new Lead();
              lead.domain_id = SessionService.user.state.focus_domain_id;
              lead.lead_type = $stateParams.lead_type;
              return lead;
            }
          }
        }
      })
      // LEAD
      .state('signed.entries', {
        url: "/entries",
        templateUrl: "views/entries.html",
        controller: 'EntriesCtrl',
        data: {
          requireAuth: true
        }
      })
      .state('signed.entry', {
        url: "/entry/{id}?lead_id&overlay",
        templateUrl: "views/entry.html",
        controller: 'EntryCtrl',
        data: {
          requireAuth: true
        },
        resolve: {
          entry: function($stateParams, EntryService, Entry){
            if($stateParams.id > 0){
              return EntryService.get($stateParams.id);
            }
            else if($stateParams.lead_id > 0){
              var entry = new Entry({lead_id: $stateParams.lead_id});
              return entry;
            }
          }
        }
      })
      // TAG
      .state('signed.tags', {
        url: "/tags/{tag_class}",
        templateUrl: "views/tags.html",
        controller: 'TagsCtrl',
        data: {
          requireAuth: [USER_ROLES.admin]
        }
      })
      .state('signed.tag', {
        url: "/tag/{id}?tag_class",
        templateUrl: "views/tag.html",
        controller: 'TagCtrl',
        data: {
          requireAuth: [USER_ROLES.admin]
        },
        resolve: {
          tag: function($stateParams, TagService, Tag){
            if($stateParams.id > 0){
              return TagService.get($stateParams.id);
            }
            else {
              return new Tag({tag_class: $stateParams.tag_class});
            }
          }
        }
      });
  })
  .run(function($rootScope, $window, AuthService, API_EVENTS){
    AuthService.init();

    $rootScope.$on(API_EVENTS.notAuthenticated, function(event) {
      $window.location.href = '/login';
      event.preventDefault();
    });
    $rootScope.$on(API_EVENTS.notAuthorized, function(event) {
      $window.location.href = '/noauth';
      event.preventDefault();
    });

    $rootScope.$on('$stateChangeStart', function (event, next) {
        if(next.data && (next.data.requireAuth || next.data.authorizedRoles)){
            if (!AuthService.isAuthenticated()) {
                $rootScope.$broadcast(API_EVENTS.notAuthenticated);
                event.preventDefault();
            }
        }
        else if(next.data && next.data.authorizedRoles && !AuthService.isAuthorized(next.data.authorizedRoles)){
            $rootScope.$broadcast(API_EVENTS.notAuthorized);
            event.preventDefault();
        }

    })
  });
