var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var path = require('path');

var cookieParser = require('cookie-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(cookieParser());


app.use("/public", express.static("public"));

app.get("/", function(req, res) {
    res.clearCookie("_session_id");
    var filePath = path.join(__dirname, '/public/index.html');
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
        if (!err) {
            request('https://samfundet.no/arrangement', function(error, response, body) {
                var occurences = getIndicesOf("<tr", body);
                var elements = [];
                for(var i = 4; i < occurences.length; i++) {
                    var end = body.substring(occurences[i]).indexOf("</tr>");
                    var this_element = body.substring(occurences[i], occurences[i] + end);
                    if(this_element.toLowerCase().indexOf("gratis inngang") > -1 || this_element.toLowerCase().indexOf("billett inkludert i inngang") > -1 || this_element.toLowerCase().indexOf("utsolgt") > -1) {
                        continue;
                    } else {
                        var price_start = this_element.indexOf('event-price');
                        var price_text = this_element.substring(price_start + 14, this_element.substring(price_start).indexOf("</td>") + price_start);
                        var start_info = this_element.indexOf('<a href="/arrangement/');
                        var start_link = this_element.substring(start_info);
                        var end_info = this_element.substring(start_info).indexOf("</a>") + start_info;
                        this_element = this_element.substring(start_info, end_info);
                        var link = "https://samfundet.no" + this_element.substring(this_element.indexOf('href="') + 6, this_element.indexOf('">'));
                        var name = this_element.substring(this_element.indexOf('">') + 2);
                        elements.push({
                            name: name + " (" + price_text + ")",
                            link: link
                        });
                    }
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
    var select_option = req.body['select_option'];
    if(select_option != "none") {
        url = select_option;
    }

    request(url, function (error, response, body) {
        if(body.toLowerCase().indexOf("<div class='purchase-button tickets-sold-out'>") > -1) {
            res.send("failed");
        } else {
            request(url + "/buy", function(error, response, body2) {
                if(response.request.uri.href != url + "/buy") {
                    res.send("failed");
                    return;
                }
                var _cookie = response.headers['set-cookie'][0];
                var cookie_value = _cookie.split("=")[1].split(";")[0];
                res.cookie('_session_id', cookie_value, {
                    httpOnly: true,
                });
                body = replace_url("/assets", body);
                body = replace_url("/arrangement", body);
                body = replace_url("/upload", body);

                body = body.replace("</html>", "");
                body = body.replace("</body>", "");
                body += '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>';
                body += "<script src='public/ticket.js'></script>";
                body += "<script>$('body').css('overflow', 'hidden');</script>";
                body += "<div class='buying-in-progress' style='position: absolute; \
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
                body += "</body>";
                body += "</html>";
                res.send(body);
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

app.listen(3001);
