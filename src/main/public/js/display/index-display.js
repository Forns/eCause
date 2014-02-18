/**
 * index-display.js
 */
$(function () {
  var formId = "#search-form",
      
      validObject = validationConfig(formId, function () {
        $.ajax({
          url: "/search",
          type: "POST",
          data: {search: $("#search-term").val()},
          success: function (results, textStatus, jqXHR) {
            console.log("OK!");
          },
          error: function (jqXHR, textStatus, errorThrown) {
            $("#popup").modal("hide");
            modalPopup.errorPane(
              "body",
              "main-modal-popup",
              "Error",
              (textStatus) ? textStatus : "Unknown! Try again shortly..."
            );
          }
        });
      });
});
