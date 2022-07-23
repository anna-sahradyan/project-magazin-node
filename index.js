const express = require("express");
const app = express();
/**
 * public= name directory where save static
 */
app.set("views engine","pug");
app.use(express.static("public"))
app.listen(4000, () => {
    console.log("Backend is starting !!!")
});
// app.get("/", (req, res) => {
//     res.end("hello")
// });
app.get("/", (req, res) => {
    console.log("load/")
    res.render("main.pug",{
        foo:4,
        bar:7
    })
});
