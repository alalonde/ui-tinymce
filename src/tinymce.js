/**
 * Binds a TinyMCE widget to <textarea> elements.
 *
 * Forked to git@github.com:alalonde/ui-tinymce.git
 *
 * With this version you can add keyup and click listeners to the TinyMCE textarea.
 * It also overrides the tab and shift-tab keys to indent/outdent rather than switch focus.
 */
angular.module('ui.tinymce', [])
  .value('uiTinymceConfig', {})
  .directive('uiTinymce', ['uiTinymceConfig', function (uiTinymceConfig) {
    'use strict';

    uiTinymceConfig = uiTinymceConfig || {};

    // keep track of all the listeners, as there may be one per instance of this directive
    var generatedIds = 0, keyUpListeners = [], clickListeners = [];

    function parseId(id) {
      return parseInt(id.substr(id.length - 1), 10);
    }

    return {
      priority: 10,
      require: 'ngModel',
      controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
      // define an API for child directives to view and modify sorting parameters
        this.setKeyUpListener = function(listener) {
          keyUpListeners[parseId($attrs.id)] = listener; 
        };
        this.setClickListener = function(listener) {
          clickListeners[parseId($attrs.id)] = listener;
        };
      }],
      link: function (scope, elm, attrs, ngModel) {
        var expression, options, tinyInstance,
          updateView = function () {
            ngModel.$setViewValue(elm.val());
            if (!scope.$root.$$phase) {
              scope.$apply();
            }
          };

        // generate an ID if not present
        if (!attrs.id) {
          attrs.$set('id', 'uiTinymce' + generatedIds++);
        }

        if (attrs.uiTinymce) {
          expression = scope.$eval(attrs.uiTinymce);
        } else {
          expression = {};
        }

        // make config'ed setup method available
        if (expression.setup) {
          var configSetup = expression.setup;
          delete expression.setup;
        }

        options = {
          // Update model when calling setContent (such as from the source editor popup)
          setup: function (ed) {
            var args;
            ed.on('init', function(args) {
              ngModel.$render();
              ngModel.$setPristine();
            });
            // Update model on button click
            ed.on('ExecCommand', function (e) {
              ed.save();
              updateView();
            });
            // Update model on keypress
            ed.on('KeyUp', function (e) {
              var listener = keyUpListeners[parseId(attrs.id)];
              if(listener) {
                listener(ed, e);
              }
              ed.save();
              updateView();
            });
            ed.on('KeyDown', function(event) {
              if (event.keyCode === 9) { // tab pressed
                if (event.shiftKey) {
                  ed.execCommand('Outdent');
                } else {
                  ed.execCommand('Indent');
                }

                event.preventDefault();
                return false;
              }
            });
            ed.on('Click', function(e) {
              var listener = clickListeners[parseId(attrs.id)];
              if(listener) {
                listener(ed, e);
              }
            });
            // Update model on change, i.e. copy/pasted text, plugins altering content
            ed.on('SetContent', function (e) {
              if (!e.initial && ngModel.$viewValue !== e.content) {
                ed.save();
                updateView();
              }
            });
            ed.on('Blur', function(e) {
              elm.blur();
            });
            // Update model when an object has been resized (table, image)
            ed.on('ObjectResized', function (e) {
              ed.save();
              updateView();
            });
            if (configSetup) {
              configSetup(ed);
            }
          },
          mode: 'exact',
          elements: attrs.id
        };
        // extend options with initial uiTinymceConfig and options from directive attribute value
        angular.extend(options, uiTinymceConfig, expression);
        setTimeout(function () {
          tinymce.init(options);
        });

        ngModel.$render = function() {
          if (!tinyInstance) {
            tinyInstance = tinymce.get(attrs.id);
          }
          if (tinyInstance) {
            tinyInstance.setContent(ngModel.$viewValue || '');
          }
        };

        scope.$on('$destroy', function() {
          if (!tinyInstance) { 
            tinyInstance = tinymce.get(attrs.id); 
          }
          if (tinyInstance) {
            tinyInstance.remove();
            tinyInstance = null;
          }
        });
      }
    };
  }]);
