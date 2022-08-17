const express = require("express");
const app = express();
const mysql = require('mysql');
const cors = require('cors');
app.use(cors());
/**
 * public= name directory where save static
 */
app.use(express.json())
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
    let cat = new Promise((resolve, reject) => {
        conn.query(
            "select id,name, cost, image, category from (select id,name,cost,image,category, if(if(@curr_category != category, @curr_category := category, '') != '', @k := 0, @k := @k + 1) as ind   from goods, ( select @curr_category := '' ) v ) goods where ind < 3",
            (err, result, field) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            })
    })
    let catDescription = new Promise((resolve, reject) => {
        conn.query(
            "SELECT * FROM category",
            (err, result, field) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            })
    });
    Promise.all([cat, catDescription]).then((value) => {
        console.log(value[0])
        res.render("index.pug", {
            goods: JSON.parse(JSON.stringify(value[0])),
            cat: JSON.parse(JSON.stringify(value[1])),
        })
    })

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
        res.render("cat.pug", {
            cat: JSON.parse(JSON.stringify(values[0])),
            goods: JSON.parse(JSON.stringify(values[1]))
        });

    })
});
//!part one goods
app.get('/goods', (req, res) => {
    conn.query("SELECT *FROM goods WHERE id=" + req.query.id, (err, result, fields) => {
        if (err) throw  err;
        res.render("goods.pug", {
            goods: JSON.parse(JSON.stringify(result))
        })

    });
});
app.get('/order', (req, res) => {
    res.render('order.pug');

});


//!part post fetch
app.post("/get-category-list", (req, res) => {
    conn.query("SELECT id,category FROM category", (err, result, fields) => {
        if (err) throw  err;
        res.json(result)
    });
});
app.post("/get-goods-info", (req, res) => {
    if (req.body.key.length != 0) {
        conn.query("SELECT id, name, cost FROM goods WHERE  id IN  (" + req.body.key.join(",") + ")", (err, result, fields) => {
            if (err) throw  err;
            let goods = {};
            for (let i = 0; i < result.length; i++) {
                goods[result[i]['id']] = result[i]
            }
            res.json(goods)
        });
    } else {
        res.send('0');
    }
});
//!part post fetch-3
app.post("/finish-order", function (req, res) {
    console.log(req.body);
    res.send("1")
});
app.listen(4000, () => {
    console.log("Backend is starting !!!")
});
