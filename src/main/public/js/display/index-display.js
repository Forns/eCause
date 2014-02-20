/**
 * index-display.js
 */
$(function () {
  var formId = "#search-form",
      searchTerm = $("#search-term"),
      
      validObject = validationConfig(formId, function () {
        // First, set up the loading screen
        $("#popup").modal("hide");
        modalPopup(
          "body",
          "popup",
          "Working...",
          "<p>Please wait while we process your request...</p>",
          ""
        );
        
        $.ajax({
          url: "/search",
          type: "POST",
          data: {search: searchTerm.val()},
          success: function (results, textStatus, jqXHR) {
            console.log("OK!");
            $("#popup").modal("hide");
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
      
      searchTerm.focus();
});
