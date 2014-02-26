/**
 * index-display.js
 */
$(function () {
  var formId = "#search-form",
      searchTerm = $("#search-term"),
      
      progressTick,
      totalStages = 3,
      stagesComplete = 0,
      progressUpdate = function (stage) {
        for (var i = 0; i <= stage; i++) {
          var changeText = "-";
          if (i === stage) {
            changeText = "In progress...";
          }
          if (i < stage) {
            $("[stage='" + i + "']").parent().addClass("success");
            changeText = "<span class='glyphicon glyphicon-check'></span> Done!";
          }
          
          $("[stage='" + i + "']")
            .html(changeText);
          stagesComplete = stage;
        }
      },
      
      errorModal = function (textStatus) {
        $("#popup").modal("hide");
          modalPopup.errorPane(
            "body",
            "main-modal-popup",
            "Error",
            (textStatus) ? textStatus : "Unknown! Try again shortly..."
          );
      },
      
      validObject = validationConfig(formId, function () {
        // First, set up the loading screen
        $("#popup").modal("hide");
        modalPopup(
          "body",
          "popup",
          "Working...",
          "<table class='table'>" +
            "<caption>Performing causal extraction now. Thanks for your patience!</caption>" +
            "<tbody>" +
              "<tr>" +
                "<th>Fetching documents...</th>" +
                "<td id='progress-documents' class='prog' stage='0'>In Progress...</td>" +
              "</tr>" +
              "<tr>" +
                "<th>Topic modeling...</th>" +
                "<td id='progress-documents' class='prog' stage='1'>-</td>" +
              "</tr>" +
              "<tr>" +
                "<th>Finding patterns...</th>" +
                "<td id='progress-documents' class='prog' stage='2'>-</td>" +
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
            
            progressTick = setInterval(function () {
              $.ajax({
                url: "/progress",
                type: "GET",
                success: function (results, textStatus, jqXHR) {
                  console.log(results);
                  progressUpdate(results.progress);
                  if (results.progress >= totalStages) {
                    clearInterval(progressTick);
                    $("#popup .modal-footer")
                      .append(
                        "<button type='button' class='btn btn-primary' data-dismiss='modal' aria-hidden='true'>View Results</button>"
                      );
                  }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                  clearInterval(progressTick);
                  errorModal(textStatus);
                }
              });
            }, 2000);
          },
          error: function (jqXHR, textStatus, errorThrown) {
            clearInterval(progressTick);
            errorModal(textStatus);
          }
        });
      });
      
      searchTerm.focus();
});
