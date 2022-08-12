const express = require("express");
const app = express();
const mysql = require('mysql');
/**
 * public= name directory where save static
 */
app.set("view engine", "pug");
app.use(express.static("public"));

const conn = mysql.createConnection({
    host: "localhost", user: "root", database: "market", password: "mysql1972", port: 3306

})
conn.connect(err => {
    if (err) {
        console.log(err);
        return err;
    } else {
        console.log('Database is OK!!!')
    }
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
            goods: JSON.parse(JSON.stringify(goods))
        });

    });

});

//!block  category


app.get('/cat', (req, res) => {
    let catId = req.query.id;
    let cat = new Promise((resolve, reject) => {
        conn.query('SELECT * FROM category WHERE id = ' + catId, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
    let goods = new Promise((resolve, reject) => {
        conn.query('SELECT * FROM goods WHERE category = ' + catId, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
    Promise.all([
        cat.catch((error) => error),
        goods.catch((error) => error),
    ]).then(function (values) {
        console.log(values[0])

        res.render("cat.pug", {
            cat: JSON.parse(JSON.stringify(values[0])),
            goods: JSON.parse(JSON.stringify(values[1]))
        });

    })
});
//!part one goods
app.get('/goods', (req, res) => {
    console.log(req.query.id);
    conn.query("SELECT *FROM goods WHERE id=" + req.query.id, (err, result, fields) => {
        if (err) throw  err;
        res.render("goods.pug",{
            goods: JSON.parse(JSON.stringify(result))
        })

    });
})
//!part post fetch
app.post("/get-category-list",(req,res)=> {
    conn.query("SELECT id,category FROM category", (err, result, fields) => {
        if (err) throw  err;
        console.log(result)
        res.json(result)
    });
});
app.listen(4000, () => {
    console.log("Backend is starting !!!")
});
