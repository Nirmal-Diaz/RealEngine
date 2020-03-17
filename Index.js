//@ts-check
const port = 8080;
//STANDARD MODULES
const fs = require("fs");
//EXPRESS
const express = require("express");
const app = express();
//EXPRESS: BODY-PARSER
const jsonParser = express.json();
//EXPRESS INITIALIZATION
//Make server listen to specified port
app.listen(port);
console.log(`Express server status: Ready, listening on port ${port}`);
//Use "public" directory to serve static content
app.use(express.static("./public"));
//EXPRESS ROUTING
app.route("/")
    .get((request, response) => {
        response.sendFile(__dirname + "/public/layouts/index.html");
    });