function input_values() {
    $($("select")[0]).val(num_members);
    $($("select")[0]).trigger("change");
    $($("select")[1]).val(num_non_members);
    $($("select")[1]).trigger("change");
    if(member_card == "true") {
        $("#ticket_type_card").prop("checked", true);
        $("#ticket_type_card").trigger("change");
        $("#cardnumber").val(email);
        $("#cardnumber").trigger("change");
    } else {
        $("#ticket_type_paper").prop("checked", true);
        $("#ticket_type_paper").trigger("change");
        $("#email").val(email);
        $("#email").trigger("change");
    }
    $("#ccno").val(card_number);
    $("#ccno").trigger("change");
    $($("select")[2]).val(expiration_month);
    $($("select")[2]).trigger("change");
    $($("select")[3]).val(expiration_year);
    $($("select")[3]).trigger("change");
    $("#cvc2").val(cvc2)
    $("#cvc2").trigger("change");
}

var waitForEl = function(selector, callback) {
  if (jQuery(selector).length) {
    callback();
  } else {
    setTimeout(function() {
      waitForEl(selector, callback);
    }, 100);
  }
};

$(document).ready(function() {
  waitForEl(".tickets-available", function() {
    setTimeout(function() {
      $(".tickets-available").trigger("click");
    }, 1000);
  });
});
