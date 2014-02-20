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
          "<table class='table'>" +
            "<caption></caption>" +
            "<tbody>" +
              "<tr>" +
                "<th>Fetching documents...</th>" +
                "<td id='progress-documents'>In Progress...</td>" +
              "</tr>" +
            "</tbody>" +
          "</table>",
          ""
        );
        
        $.ajax({
          url: "/search",
          type: "POST",
          data: {search: searchTerm.val()},
          success: function (results, textStatus, jqXHR) {
            $("#progress-documents")
              .html(
                "<span class='glyphicon glyphicon-check'></span> Done!"
              );
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
