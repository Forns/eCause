/**
 * general-display.js
 */
$(function () {
  // Set up validation
  $("input, textarea, select")
    .each(function () {
      if (!$(this).attr("name")) {
        $(this).attr("name", $(this).attr("id"));
      }
    });
});
