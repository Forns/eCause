/**
 * validation-config.js
 * 
 * jQuery-validate configuration
 */

var validationConfig = function (formSelector, submitCallback, placement) {
  var formId = $(formSelector),
      validObject = formId.validate({
        onkeyup: false,
        errorClass: 'has-error',
        validClass: 'success',
        showErrors: function(errorMap, errorList) {
          $.each(this.successList, function(index, value) {
            $(this).closest(".form-group").first().removeClass("has-error");
            return $(value).popover("hide");
          });
          return $.each(errorList, function(index, value) {
            var _popover,
                _popoverId = $(value.element).attr("id") + "-popover";
            $(value.element).closest(".form-group").first().addClass("has-error");
            _popover = $(value.element).popover({
              trigger: "manual",
              placement: (placement) ? placement : "right",
              content: function () {return value.message;},
              template: "<div id='" + _popoverId + "' class='popover has-error'><div class='arrow'></div><div class='popover-inner'><div class='popover-content'><p></p></div></div></div>"
            });
            _popover.popover("show");
            $("#" + _popoverId + " .popover-content").html("<span>" + value.message + "</span>");
            return _popover;
          });
        },
        success: $.noop, // Odd workaround for errorPlacement not firing!
        submitHandler: submitCallback
      });
  
  return validObject;
};

// Configure form input gathering
validationConfig.gatherInputs = function (form) {
  var formSelector = $(form),
      inputs = {};
      
  // Start with standard inputs: text and textareas
  formSelector
    .find("input[type='text'], input[type='email'], textarea")
    .each(function () {
      if ($(this).attr("name")) {
        inputs[$(this).attr("name")] = $(this).val();
      }
    });
  
  // Selects
  formSelector
    .find("select :selected")
    .each(function () {
      if (typeof($(this).parent().parent().attr("id")) !== "undefined") {
        inputs[$(this).parent().parent().attr("id")] = $(this).val();
      }
    });
    
  // Checkboxes and radios
  formSelector
    .find(":checkbox:checked, :radio:checked")
    .each(function () {
      inputs[$(this).attr("name")] = $(this).val();
    });
    
  return inputs;
};

if ($.validator) {
  // Add custom class rules
  $.validator.addClassRules("min7", {required: true, minlength: 7});
  $.validator.addClassRules("pdf", {accept: "pdf"});
  $.validator.addClassRules("username", {rangelength: [4, 20]});
  $.validator.addClassRules("pass1", {minlength: 7});
  $.validator.addClassRules("pass2", {equalTo: ".pass1", minlength: 7});
  $.validator.addClassRules("uniqueUsername", {
    remote: {
        url: "/unique/accounts",
        type: "post",
        data: {
          query: {
            username: function () {
              return $( "#username" ).val();
            }
          }
        }
      }
  });
  
  // Add custom methods
  $.validator.addMethod(
    "profile-picture", 
    
    function(value, element) {
      return this.optional(element) || 
             ((element.files[0].size <= 1048576) && (/png|jpe?g|gif/g.test(element.files[0].type)));
    },
    
    "File must be a .png, .jpg, or .gif and under 1 MB"
  );
  
  $.validator.addMethod(
    "phone-valid",
    
    function(value, element) {
      return value.replace(/[^0-9]/g, "").length === 10;
    },
    
    "You must enter a valid phone number"
  );
  
  $.validator.addMethod(
    "mustSelect",
    
    function(value, element) {
      return !/^Please select...|^\s$/.test(value);
    },
    
    "You must select an option from this menu"
  );
  
  $.validator.addMethod(
    "alphanumeric",
    
    function(value, element) {
      return /^[a-zA-Z0-9_]*$/.test(value);
    },
    
    "You must use only numbers and letters"
  );
  
  $.validator.addMethod(
    "no-html",
    
    function(value, element) {
      return !/<(?:.|\n)*?>/.test(value);
    },
    
    "No HTML tags, please!"
  );
  
  $.validator.addMethod(
    "checkbox-required",
    
    function(value, element) {
      return Boolean($("#package-checkboxes :checked").length);
    },
    
    "You must select at least one package"
  );
  
}
