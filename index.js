const express = require("express");
const app = express();
const mysql = require('mysql');
/**
 * public= name directory where save static
 */
app.set("views engine", "pug");
app.use(express.static("public"));

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "market",
    password: "mysql1972",
    port: 3306

})
conn.connect(err => {
    if (err) {
        console.log(err);
        return err;
    } else {
        console.log('Database is OK!!!')
    }
});

app.listen(4000, () => {
    console.log("Backend is starting !!!")
});

app.get("/", (req, res) => {
    let query = "SELECT * FROM goods"
    conn.query(query, (err, result) => {
        if (err) {
            throw err;
        }
        let goods = {};
        for (let i = 0; i < result.length; i++) {
            goods[result[i]['id']] = result[i];
        }
        console.log(JSON.parse(JSON.stringify(goods)))
        res.render("main.pug", {
            foo: 4,
            bar: 7,
            goods:JSON.parse(JSON.stringify(goods))
        });

    })

});
