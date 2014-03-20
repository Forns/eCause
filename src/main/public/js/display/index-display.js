/**
 * index-display.js
 */
$(function () {
  var formId = "#search-form",
      searchTerm = $("#search-term"),
      
      progressTick,
      loaded = false,
      totalStages = 4,
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
      
      patternToString = function (pattern) {
        var result = "";
        for (var e in pattern.elements) {
          var currentElement = pattern.elements[e];
          result += currentElement.concept + "/" + currentElement.tag + " ";
        }
        return result.trim();
      },
      
      patternToTemplateString = function (pattern) {
        if (!pattern.templated) {
          return pattern.toString();
        }
        var result = "";
        for (var e in pattern.elements) {
          var currentElement = pattern.elements[e];
          result += ((currentElement.isConcept && currentElement.tag[0] === "N") ? "[concept]/" : "") + 
                    ((currentElement.isMovement && currentElement.tag[0] === "V") ? "[movement]/" : "") +
                    ((currentElement.isCausal && currentElement.tag[0] === "V") ? "[cause]/" : "") +
                    currentElement.tag + " ";
        }
        return result.trim();
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
              "<tr>" +
                "<th>Extracting causality...</th>" +
                "<td id='progress-documents' class='prog' stage='3'>-</td>" +
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
                    if (loaded) {
                      return;
                    }
                    loaded = true;
                    $("#popup .modal-footer")
                      .append(
                        "<button id='view-results-button' type='button' class='btn btn-primary' data-dismiss='modal' aria-hidden='true'>View Results</button>"
                      );
                    $("#view-results-button")
                      .click(function () {
                        loaded = false;
                      });
                    $("#popup .modal-title")
                      .html("Done!");
                  }
                  
                  // If we have results, display them!
                  if (results.results) {
                    var findings = results.results,
                        causality = findings.results,
                        concepts = findings.concepts,
                        movements = findings.movements,
                        sentences = findings.sentences,
                        templates = findings.templates,
                        conceptString = "",
                        movementString = "",
                        conceptList = $("#concept-results"),
                        movementList = $("#movement-results"),
                        relevantTable = $("#relevant-results"),
                        resultsTable = $("#output-results");
                    
                    // Set up topics table
                    for (var c in concepts) {
                      conceptString += concepts[c] + ", ";
                    }
                    conceptString = conceptString.substring(0, conceptString.length - 2);
                    conceptList.html(conceptString);
                    
                    for (var m in movements) {
                      movementString += movements[m] + ", ";
                    }
                    movementString = movementString.substring(0, movementString.length - 2);
                    movementList.html(movementString);
                    
                    // Set up the relevant table
                    relevantTable.html("");
                    for (var s in sentences) {
                      var currentSentence = sentences[s],
                          currentTemplate = templates[s];
                      
                      relevantTable.append(
                        "<tr>" +
                          "<td>" + patternToString(currentSentence) + "</td>" +
                          "<td>" + patternToTemplateString(currentTemplate) + "</td>" +
                        "</tr>"
                      );
                    }
                    
                    // Set up results table
                    resultsTable.html("");
                    for (var c in causality) {
                      var currentCausal = causality[c],
                          currentReason = currentCausal.reason,
                          currentConsequence = currentCausal.consequence,
                          styling = (currentCausal.discovered === "true") ? "class='warning'" : "";
                          
                      resultsTable.append(
                        "<tr " + styling + ">" +
                          "<td>" + currentConsequence.concept +  "</td>" + 
                          "<td>" + currentConsequence.movement + "</td>" + 
                          "<td>" + currentReason.concept +  "</td>" + 
                          "<td>" + currentReason.movement + "</td>" + 
                        "</tr>"
                      );
                    }
                    
                    $("#output")
                      .removeClass("hidden");
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
