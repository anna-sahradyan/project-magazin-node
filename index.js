const express = require("express");
const app = express();
/**
 * public= name directory where save static
 */
app.use(express.static("public"))
app.listen(4000, () => {
    console.log("Backend is starting !!!")
});
app.get("/", (req, res) => {
    res.end("hello")
});
app.get("/", (req, res) => {
    console.log("load/")
    res.render("index.html")
});
