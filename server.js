var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(express.static('public'));

app.get('/arrangement/*', function(req, res) {
    request("https://samfundet.no" + req.url, function(error, response, body) {
        var occurences = getIndicesOf("<div class='container'", body);
        var end = body.indexOf("<div id='sticky-footer-wrapper-footer'></div>");
        var to_send = body.substring(occurences[1], end + 45);
        var occurences = getIndicesOf("/assets", to_send);
        for(var i = 0; i < occurences.length; i++) {
            var to_add = "https://samfundet.no";
            var offset = to_add.length * i;
            var before = to_send.substring(0, occurences[i] + offset);
            var after = to_send.substring(occurences[i] + offset);
            to_send = before + to_add + after;
        }
        to_send += "<script> \
            input_values(); \
            $($('input[name=\"commit\"]')[1]).trigger('click'); \
        </script>";
        to_send += '<script> \
        setTimeout(function(){ \
            $("#ticket_type_paper").trigger("change"); \
            $("#ticket_type_card").trigger("change"); \
            $("#cardnumber").trigger("change"); \
            $("#email").trigger("change"); \
            $($("select")[0]).trigger("change"); \
            $("#ticket_type_paper").trigger("change"); \
            $("#email").trigger("change"); \
            $("#ccno").trigger("change"); \
            $($("select")[2]).trigger("change"); \
            $($("select")[3]).trigger("change"); \
            $("#cvc2").trigger("change"); \
        }, 50); \
        </script>';
        res.send(to_send);
    });
})

app.post('/get_site', function(req, res) {
    var url = req.body['url'];
    var num_members = req.body['num_members'];
    var num_non_members = req.body['num_non_members'];
    var email_member = req.body['email_or_membercard'];
    var member_card = req.body['member_card'] == "on";
    var card_number = req.body['card_number'];
    var expiration_month = req.body['expiration_month'];
    var expiration_year = req.body['expiration_year'];
    var cvc2 = req.body['cvc2'];
    var try_till_fail = req.body['try_infinite'];
    request(url, function (error, response, body) {
        if(body.toLowerCase().indexOf("<div class='purchase-button tickets-sold-out'>") > -1) {
            var headers = req.header('Referer');
            var redirect_url = headers + "?url=" + url + "&num_members=" + num_members + "&num_non_members=" + num_non_members + "&email_member=" + email_member + "&member_card=" + member_card + "&card_number=" + card_number + "&expiration_month=" + expiration_month + "&expiration_year=" + expiration_year + "&cvc2=" + cvc2;
            if(try_till_fail == "on") {
                redirect_url += "#try_again";
            }
            res.redirect(redirect_url);
            //res.send("Utsolgt..");
        } else {
            body = body.replace("</html>", "");
            request(url + "/", function(error, response, body2) {
                /*body += body2;
                body += "</html>";*/

                var occurences = getIndicesOf("/assets", body2);
                for(var i = 0; i < occurences.length; i++) {
                    var to_add = "https://samfundet.no";
                    var offset = to_add.length * i;
                    var before = body2.substring(0, occurences[i] + offset);
                    var after = body2.substring(occurences[i] + offset);
                    body2 = before + to_add + after;
                }

                var occurences = getIndicesOf("/arrangement", body2);
                for(var i = 0; i < occurences.length; i++) {
                    var to_add = "https://samfundet.no";
                    var offset = to_add.length * i;
                    var before = body2.substring(0, occurences[i] + offset);
                    var after = body2.substring(occurences[i] + offset);
                    body2 = before + to_add + after;
                }

                var occurences = getIndicesOf("/upload", body2);
                for(var i = 0; i < occurences.length; i++) {
                    var to_add = "https://samfundet.no";
                    var offset = to_add.length * i;
                    var before = body2.substring(0, occurences[i] + offset);
                    var after = body2.substring(occurences[i] + offset);
                    body2 = before + to_add + after;
                }

                body2 = body2.replace("</html>", "");
                body2 += '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>';
                body2 += '<script> \
                    var email = "' + email_member + '"; \
                    var num_members = "' + num_members + '"; \
                    var num_non_members = "' + num_non_members + '"; \
                    var member_card = "' + member_card + '"; \
                    var card_number = "' + card_number + '"; \
                    var expiration_month = "' + expiration_month + '"; \
                    var expiration_year = "' + expiration_year + '"; \
                    var cvc2 = "' + cvc2 + '"; \
                </script>';
                body2 += "<script src='ticket.js'></script>";
                body2 += "</html>";
                res.send(body2);
            });
        }
    });
});

function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

app.listen(3000);
