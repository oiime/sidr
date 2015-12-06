'use strict';
angular.module('sidrApp')
.factory('LocationOverlay', function($http,  $q, $rootScope, ENV, API_EVENTS, SessionService, FileUploader, md5){
  var LocationOverlay = function(type){
    this.type = type;
  };
  LocationOverlay.prototype.setObject = function(e){
    this.e = e;
  };
  LocationOverlay.prototype.toGeoJson = function(){
    var rsp = {type: this.type};
    switch(this.type){
      case 'circle':
        rsp.coordinates = [this.e.getCenter().lat(), this.e.getCenter().lng()];
        rsp.radius = this.e.getRadius();
        break;
      case 'polygon':
        rsp.coordinates = [];
        angular.forEach(this.e.getPath().getArray(), function(p){
          rsp.coordinates.push([p.lat(), p.lng()]);
        });
        break;
      case 'point':
        rsp.coordinates = [this.e.getPosition().lat(), this.e.getPosition().lng()];
        break;
    }
    return rsp;
  };
  LocationOverlay.prototype.toLocationExport = function(source){
    return {
      source: source,
      asciiname: '',
      location_id:  md5.createHash(JSON.stringify(this.toGeoJson())),
      data: this.toGeoJson()
    }
  };

  return {
      create: function(type){
        return new LocationOverlay(type);
      }
  };
})
.service('LocationService', function($q, ObjectsService, APIService, Location){
  angular.extend(this, ObjectsService.overload(this, 'location', Location));

  this.getFinder = function(country_code, value){
    var defer = $q.defer();
    if(value.length < 3){
      defer.resolve([]);
    }
    else{
      APIService.get('/location/autocomplete/' + country_code + '/' + value).then(
        function(res) {
          defer.resolve(res);
        },
        function(res) {
          defer.reject(res);
        });
    }
    return defer.promise;
  }
  this.getGeonameFinder = function(country_code, value){
    var defer = $q.defer();
    if(value.length < 3){
      defer.resolve([]);
    }
    else{
      APIService.get('/geoname/' + country_code + '/' + value).then(
        function(res) {
          defer.resolve(res);
        },
        function(res) {
          defer.reject(res);
        });
    }
    return defer.promise;
  };
  this.getCountriesDropdown = function(){
    var map = [];
    angular.forEach(this.countries, function(v){
        map.push({id: v.code, title: v.name});
    });
    return map;
  };
  this.getCountries = function(limitCountries){
    if(typeof limitCountries !== 'undefined'){
      var rsp = [];
      angular.forEach(this.countries, function(v){
          if(limitCountries.indexOf(v.code) != -1){
            rsp.push(v);
          }
      });
      return rsp;
    }
    return this.countries;
  };
  this.countries =
    [ { name: 'Bangladesh', code: 'BD' },
      { name: 'Belgium', code: 'BE' },
      { name: 'Burkina Faso', code: 'BF' },
      { name: 'Bulgaria', code: 'BG' },
      { name: 'Bosnia and Herzegovina', code: 'BA' },
      { name: 'Barbados', code: 'BB' },
      { name: 'Wallis and Futuna', code: 'WF' },
      { name: 'Saint Barthelemy', code: 'BL' },
      { name: 'Bermuda', code: 'BM' },
      { name: 'Brunei', code: 'BN' },
      { name: 'Bolivia', code: 'BO' },
      { name: 'Bahrain', code: 'BH' },
      { name: 'Burundi', code: 'BI' },
      { name: 'Benin', code: 'BJ' },
      { name: 'Bhutan', code: 'BT' },
      { name: 'Jamaica', code: 'JM' },
      { name: 'Bouvet Island', code: 'BV' },
      { name: 'Botswana', code: 'BW' },
      { name: 'Samoa', code: 'WS' },
      { name: 'Bonaire, Saint Eustatius and Saba ', code: 'BQ' },
      { name: 'Brazil', code: 'BR' },
      { name: 'Bahamas', code: 'BS' },
      { name: 'Jersey', code: 'JE' },
      { name: 'Belarus', code: 'BY' },
      { name: 'Belize', code: 'BZ' },
      { name: 'Russia', code: 'RU' },
      { name: 'Rwanda', code: 'RW' },
      { name: 'Serbia', code: 'RS' },
      { name: 'East Timor', code: 'TL' },
      { name: 'Reunion', code: 'RE' },
      { name: 'Turkmenistan', code: 'TM' },
      { name: 'Tajikistan', code: 'TJ' },
      { name: 'Romania', code: 'RO' },
      { name: 'Tokelau', code: 'TK' },
      { name: 'Guinea-Bissau', code: 'GW' },
      { name: 'Guam', code: 'GU' },
      { name: 'Guatemala', code: 'GT' },
      { name: 'South Georgia and the South Sandwich Islands',
        code: 'GS' },
      { name: 'Greece', code: 'GR' },
      { name: 'Equatorial Guinea', code: 'GQ' },
      { name: 'Guadeloupe', code: 'GP' },
      { name: 'Japan', code: 'JP' },
      { name: 'Guyana', code: 'GY' },
      { name: 'Guernsey', code: 'GG' },
      { name: 'French Guiana', code: 'GF' },
      { name: 'Georgia', code: 'GE' },
      { name: 'Grenada', code: 'GD' },
      { name: 'United Kingdom', code: 'GB' },
      { name: 'Gabon', code: 'GA' },
      { name: 'El Salvador', code: 'SV' },
      { name: 'Guinea', code: 'GN' },
      { name: 'Gambia', code: 'GM' },
      { name: 'Greenland', code: 'GL' },
      { name: 'Gibraltar', code: 'GI' },
      { name: 'Ghana', code: 'GH' },
      { name: 'Oman', code: 'OM' },
      { name: 'Tunisia', code: 'TN' },
      { name: 'Jordan', code: 'JO' },
      { name: 'Croatia', code: 'HR' },
      { name: 'Haiti', code: 'HT' },
      { name: 'Hungary', code: 'HU' },
      { name: 'Hong Kong', code: 'HK' },
      { name: 'Honduras', code: 'HN' },
      { name: 'Heard Island and McDonald Islands', code: 'HM' },
      { name: 'Venezuela', code: 'VE' },
      { name: 'Puerto Rico', code: 'PR' },
      { name: 'Palestinian Territory', code: 'PS' },
      { name: 'Palau', code: 'PW' },
      { name: 'Portugal', code: 'PT' },
      { name: 'Svalbard and Jan Mayen', code: 'SJ' },
      { name: 'Paraguay', code: 'PY' },
      { name: 'Iraq', code: 'IQ' },
      { name: 'Panama', code: 'PA' },
      { name: 'French Polynesia', code: 'PF' },
      { name: 'Papua New Guinea', code: 'PG' },
      { name: 'Peru', code: 'PE' },
      { name: 'Pakistan', code: 'PK' },
      { name: 'Philippines', code: 'PH' },
      { name: 'Pitcairn', code: 'PN' },
      { name: 'Poland', code: 'PL' },
      { name: 'Saint Pierre and Miquelon', code: 'PM' },
      { name: 'Zambia', code: 'ZM' },
      { name: 'Western Sahara', code: 'EH' },
      { name: 'Estonia', code: 'EE' },
      { name: 'Egypt', code: 'EG' },
      { name: 'South Africa', code: 'ZA' },
      { name: 'Ecuador', code: 'EC' },
      { name: 'Italy', code: 'IT' },
      { name: 'Vietnam', code: 'VN' },
      { name: 'Solomon Islands', code: 'SB' },
      { name: 'Ethiopia', code: 'ET' },
      { name: 'Somalia', code: 'SO' },
      { name: 'Zimbabwe', code: 'ZW' },
      { name: 'Saudi Arabia', code: 'SA' },
      { name: 'Spain', code: 'ES' },
      { name: 'Eritrea', code: 'ER' },
      { name: 'Montenegro', code: 'ME' },
      { name: 'Moldova', code: 'MD' },
      { name: 'Madagascar', code: 'MG' },
      { name: 'Saint Martin', code: 'MF' },
      { name: 'Morocco', code: 'MA' },
      { name: 'Monaco', code: 'MC' },
      { name: 'Uzbekistan', code: 'UZ' },
      { name: 'Myanmar', code: 'MM' },
      { name: 'Mali', code: 'ML' },
      { name: 'Macao', code: 'MO' },
      { name: 'Mongolia', code: 'MN' },
      { name: 'Marshall Islands', code: 'MH' },
      { name: 'Macedonia', code: 'MK' },
      { name: 'Mauritius', code: 'MU' },
      { name: 'Malta', code: 'MT' },
      { name: 'Malawi', code: 'MW' },
      { name: 'Maldives', code: 'MV' },
      { name: 'Martinique', code: 'MQ' },
      { name: 'Northern Mariana Islands', code: 'MP' },
      { name: 'Montserrat', code: 'MS' },
      { name: 'Mauritania', code: 'MR' },
      { name: 'Isle of Man', code: 'IM' },
      { name: 'Uganda', code: 'UG' },
      { name: 'Tanzania', code: 'TZ' },
      { name: 'Malaysia', code: 'MY' },
      { name: 'Mexico', code: 'MX' },
      { name: 'Israel', code: 'IL' },
      { name: 'France', code: 'FR' },
      { name: 'British Indian Ocean Territory', code: 'IO' },
      { name: 'Saint Helena', code: 'SH' },
      { name: 'Finland', code: 'FI' },
      { name: 'Fiji', code: 'FJ' },
      { name: 'Falkland Islands', code: 'FK' },
      { name: 'Micronesia', code: 'FM' },
      { name: 'Faroe Islands', code: 'FO' },
      { name: 'Nicaragua', code: 'NI' },
      { name: 'Netherlands', code: 'NL' },
      { name: 'Norway', code: 'NO' },
      { name: 'Namibia', code: 'NA' },
      { name: 'Vanuatu', code: 'VU' },
      { name: 'New Caledonia', code: 'NC' },
      { name: 'Niger', code: 'NE' },
      { name: 'Norfolk Island', code: 'NF' },
      { name: 'Nigeria', code: 'NG' },
      { name: 'New Zealand', code: 'NZ' },
      { name: 'Nepal', code: 'NP' },
      { name: 'Nauru', code: 'NR' },
      { name: 'Niue', code: 'NU' },
      { name: 'Cook Islands', code: 'CK' },
      { name: 'Kosovo', code: 'XK' },
      { name: 'Ivory Coast', code: 'CI' },
      { name: 'Switzerland', code: 'CH' },
      { name: 'Colombia', code: 'CO' },
      { name: 'China', code: 'CN' },
      { name: 'Cameroon', code: 'CM' },
      { name: 'Chile', code: 'CL' },
      { name: 'Cocos Islands', code: 'CC' },
      { name: 'Canada', code: 'CA' },
      { name: 'Republic of the Congo', code: 'CG' },
      { name: 'Central African Republic', code: 'CF' },
      { name: 'Democratic Republic of the Congo', code: 'CD' },
      { name: 'Czech Republic', code: 'CZ' },
      { name: 'Cyprus', code: 'CY' },
      { name: 'Christmas Island', code: 'CX' },
      { name: 'Costa Rica', code: 'CR' },
      { name: 'Curacao', code: 'CW' },
      { name: 'Cape Verde', code: 'CV' },
      { name: 'Cuba', code: 'CU' },
      { name: 'Swaziland', code: 'SZ' },
      { name: 'Syria', code: 'SY' },
      { name: 'Sint Maarten', code: 'SX' },
      { name: 'Kyrgyzstan', code: 'KG' },
      { name: 'Kenya', code: 'KE' },
      { name: 'South Sudan', code: 'SS' },
      { name: 'Suriname', code: 'SR' },
      { name: 'Kiribati', code: 'KI' },
      { name: 'Cambodia', code: 'KH' },
      { name: 'Saint Kitts and Nevis', code: 'KN' },
      { name: 'Comoros', code: 'KM' },
      { name: 'Sao Tome and Principe', code: 'ST' },
      { name: 'Slovakia', code: 'SK' },
      { name: 'South Korea', code: 'KR' },
      { name: 'Slovenia', code: 'SI' },
      { name: 'North Korea', code: 'KP' },
      { name: 'Kuwait', code: 'KW' },
      { name: 'Senegal', code: 'SN' },
      { name: 'San Marino', code: 'SM' },
      { name: 'Sierra Leone', code: 'SL' },
      { name: 'Seychelles', code: 'SC' },
      { name: 'Kazakhstan', code: 'KZ' },
      { name: 'Cayman Islands', code: 'KY' },
      { name: 'Singapore', code: 'SG' },
      { name: 'Sweden', code: 'SE' },
      { name: 'Sudan', code: 'SD' },
      { name: 'Dominican Republic', code: 'DO' },
      { name: 'Dominica', code: 'DM' },
      { name: 'Djibouti', code: 'DJ' },
      { name: 'Denmark', code: 'DK' },
      { name: 'British Virgin Islands', code: 'VG' },
      { name: 'Germany', code: 'DE' },
      { name: 'Yemen', code: 'YE' },
      { name: 'Algeria', code: 'DZ' },
      { name: 'United States', code: 'US' },
      { name: 'Uruguay', code: 'UY' },
      { name: 'Mayotte', code: 'YT' },
      { name: 'United States Minor Outlying Islands', code: 'UM' },
      { name: 'Lebanon', code: 'LB' },
      { name: 'Saint Lucia', code: 'LC' },
      { name: 'Laos', code: 'LA' },
      { name: 'Tuvalu', code: 'TV' },
      { name: 'Taiwan', code: 'TW' },
      { name: 'Trinidad and Tobago', code: 'TT' },
      { name: 'Turkey', code: 'TR' },
      { name: 'Sri Lanka', code: 'LK' },
      { name: 'Liechtenstein', code: 'LI' },
      { name: 'Latvia', code: 'LV' },
      { name: 'Tonga', code: 'TO' },
      { name: 'Lithuania', code: 'LT' },
      { name: 'Luxembourg', code: 'LU' },
      { name: 'Liberia', code: 'LR' },
      { name: 'Lesotho', code: 'LS' },
      { name: 'Thailand', code: 'TH' },
      { name: 'French Southern Territories', code: 'TF' },
      { name: 'Togo', code: 'TG' },
      { name: 'Chad', code: 'TD' },
      { name: 'Turks and Caicos Islands', code: 'TC' },
      { name: 'Libya', code: 'LY' },
      { name: 'Vatican', code: 'VA' },
      { name: 'Saint Vincent and the Grenadines', code: 'VC' },
      { name: 'United Arab Emirates', code: 'AE' },
      { name: 'Andorra', code: 'AD' },
      { name: 'Antigua and Barbuda', code: 'AG' },
      { name: 'Afghanistan', code: 'AF' },
      { name: 'Anguilla', code: 'AI' },
      { name: 'U.S. Virgin Islands', code: 'VI' },
      { name: 'Iceland', code: 'IS' },
      { name: 'Iran', code: 'IR' },
      { name: 'Armenia', code: 'AM' },
      { name: 'Albania', code: 'AL' },
      { name: 'Angola', code: 'AO' },
      { name: 'Antarctica', code: 'AQ' },
      { name: 'American Samoa', code: 'AS' },
      { name: 'Argentina', code: 'AR' },
      { name: 'Australia', code: 'AU' },
      { name: 'Austria', code: 'AT' },
      { name: 'Aruba', code: 'AW' },
      { name: 'India', code: 'IN' },
      { name: 'Aland Islands', code: 'AX' },
      { name: 'Azerbaijan', code: 'AZ' },
      { name: 'Ireland', code: 'IE' },
      { name: 'Indonesia', code: 'ID' },
      { name: 'Ukraine', code: 'UA' },
      { name: 'Qatar', code: 'QA' },
      { name: 'Mozambique', code: 'MZ' } ];
})
.factory('Location', function(ObjectService){
  return function(data) {
    this.columns = {
        'parent_id': null,
        'code': null,
        'level': null,
        'longtitude': null,
        'latitude': null,
        'name': null,
        'country_code': null
    };
    angular.extend(this, ObjectService.overload(this))
    angular.extend(this, data);
  };
});
