var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var path = require('path');

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use("/public", express.static("public"));

app.get("/", function(req, res) {
    var filePath = path.join(__dirname, '/public/index.html');
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
        if (!err) {
            request('https://samfundet.no/arrangement', function(error, response, body) {
                var occurences = getIndicesOf("event-title", body);
                var elements = [];
                for(var i = 0; i < occurences.length; i++) {
                    var start = occurences[i]+14;
                    var end = body.substring(start).indexOf("</td>");
                    var this_element = body.substring(start, start + end);
                    var name = this_element.substring(this_element.indexOf(">") + 1, this_element.length - 5);
                    var start_of_link = this_element.indexOf("href") + 6;
                    var end_of_link = this_element.indexOf(">") - 10;
                    var link = "https://samfundet.no" + this_element.substring(start_of_link, start_of_link + end_of_link);
                    elements.push({
                        name: name,
                        link: link
                    });
                }
                data = data.replace("</html>", "");
                data += "<script>var elements = " + JSON.stringify(elements) + ";</script>";
                data += "</html>";
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(data);
                res.end();
            });
        } else {
            res.send(404);
        }
    });
});

app.get('/arrangement/*', function(req, res) {
    request("https://samfundet.no" + req.url, function(error, response, body) {
        var occurences = getIndicesOf("<div class='container'", body);
        var end = body.indexOf("<div id='sticky-footer-wrapper-footer'></div>");
        var to_send = body.substring(occurences[1], end + 45);

        to_send = replace_url("/assets", to_send);

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
});

app.get('/get_site', function(req, res) {
    res.redirect("http://localhost:3000");
});

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
    var select_option = req.body['select_option'];
    if(select_option != "none") {
        url = select_option;
    }
    request(url, function (error, response, body) {
        if(body.toLowerCase().indexOf("<div class='purchase-button tickets-sold-out'>") > -1) {
            var headers = req.header('Referer');
            var redirect_url = headers + "?error=true&url=" + url + "&num_members=" + num_members + "&num_non_members=" + num_non_members + "&email_member=" + email_member + "&member_card=" + member_card + "&card_number=" + card_number + "&expiration_month=" + expiration_month + "&expiration_year=" + expiration_year + "&cvc2=" + cvc2;
            if(try_till_fail == "on") {
                redirect_url += "#try_again";
            }
            res.redirect(redirect_url);
        } else {
            body = body.replace("</html>", "");
            request(url + "/", function(error, response, body2) {

                body2 = replace_url("/assets", body2);
                body2 = replace_url("/arrangement", body2);
                body2 = replace_url("/upload", body2);

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
                body2 += "<script src='public/ticket.js'></script>";
                body2 += "<script>$('body').css('overflow', 'hidden');</script>";
                body2 += "<div class='buying-in-progress' style='position: absolute; \
                    top: 0px; \
                    left: 0px; \
                    height: 100vh; \
                    width: 100vw; \
                    background: rgba(0,0,0,.8); \
                    color: white; \
                    display: flex; \
                    flex-direction: column; \
                    justify-content: center; \
                    align-items: center; \
                    font-size: 2rem;'>Buying in progress, please wait..</div>"
                body2 += "</html>";
                res.send(body2);
            });
        }
    });
});

function replace_url(_with, body) {
    var occurences = getIndicesOf(_with, body);
    for(var i = 0; i < occurences.length; i++) {
        var to_add = "https://samfundet.no";
        var offset = to_add.length * i;
        var before = body.substring(0, occurences[i] + offset);
        var after = body.substring(occurences[i] + offset);
        body = before + to_add + after;
    }

    return body;
}

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
