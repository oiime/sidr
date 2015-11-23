'use strict';
angular.module('sidrApp')
  .directive('comparePassword', function () {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=comparePassword"
        },
        link: function(scope, element, attributes, ngModel) {

            ngModel.$validators.comparePassword = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };

            scope.$watch("otherModelValue", function() {
                ngModel.$validate();
            });
        }
    };
  });
