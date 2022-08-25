const express = require("express");
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const admin = require("./public/js/admin");
app.use(cors());

/**
 * public= name directory where save static
 */
app.use(express.json())
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.urlencoded());
app.use(cookieParser())
const nodemailer = require('nodemailer');

const conn = mysql.createConnection({
    host: "localhost", user: "root", database: "market", password: "mysql1972", port: 3306

});
app.use(function (req, res, next) {
    if (req.originalUrl === '/admin' || req.originalUrl === '/admin-order') {
        admin(req, res, conn, next);
    }
    else {
        next();
    }
});
conn.connect(err => {
    if (err) {
        console.log(err);
        return err;
    } else {
        console.log('Database is OK!!!')
    }
});
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

app.get("/", (req, res) => {
    let cat = new Promise((resolve, reject) => {
        conn.query("select id,slug,name, cost, image, category from (select id,slug,name,cost,image,category, if(if(@curr_category != category, @curr_category := category, '') != '', @k := 0, @k := @k + 1) as ind   from goods, ( select @curr_category := '' ) v ) goods where ind < 3", (err, result, field) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        })
    })
    let catDescription = new Promise((resolve, reject) => {
        conn.query("SELECT * FROM category", (err, result, field) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        })
    });
    Promise.all([cat, catDescription]).then((value) => {
        res.render("index.pug", {
            goods: JSON.parse(JSON.stringify(value[0])), cat: JSON.parse(JSON.stringify(value[1])),
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
    Promise.all([cat.catch((error) => error), goods.catch((error) => error),]).then(function (values) {
        res.render("cat.pug", {
            cat: JSON.parse(JSON.stringify(values[0])), goods: JSON.parse(JSON.stringify(values[1]))
        });

    })
});
//!part one goods
app.get('/goods/*', (req, res) => {
    console.log(req.params);
    conn.query('SELECT * FROM goods WHERE slug="' + req.params['0'] + '"', function (error, result, fields) {
        if (error) throw error;
        console.log(result);
        result = JSON.parse(JSON.stringify(result));
        console.log(result[0]['slug']);
        res.end("ok");
        // res.render('goods.pug',
        //     { goods: JSON.parse(JSON.stringify(result)) });
    });
});
//!part order
app.get('/order', (req, res) => {
    res.render('order.pug');

});

//!part post fetch get-category-list
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
//!part post fetch-3 finish-order
app.post('/finish-order', function (req, res) {
    if (req.body.key.length != 0) {
        let key = Object.keys(req.body.key);
        conn.query('SELECT id,name,cost FROM goods WHERE id IN (' + key.join(',') + ')', function (error, result, fields) {
            if (error) throw error;
            console.log(result);
            sendMail(req.body, result).catch(console.error);
            saveOrder(req.body, result);
            res.send('1');
        });
    } else {
        res.send('0');
    }
});
//!block  admin
app.get('/admin', (req, res) => {
    res.render('admin.pug', {});

});

//!admin-order
app.get('/admin-order', function (req, res) {
    conn.query(`SELECT 
      shop_order.id as id,
      shop_order.user_id as user_id,
        shop_order.goods_id as goods_id,
        shop_order.goods_cost as goods_cost,
        shop_order.goods_amount as goods_amount,
        shop_order.total as total,
        from_unixtime(date,"%Y-%m-%d %h:%m") as human_date,
        user_info.user_name as user,
        user_info.user_phone as phone,
        user_info.address as address
    FROM 
      shop_order
    LEFT JOIN	
      user_info
    ON shop_order.user_id = user_info.id ORDER BY id DESC`, function (error, result, fields) {
        if (error) throw error;
        console.log(result);
        res.render('admin-order.pug', { order: JSON.parse(JSON.stringify(result)) });
    });
});

//!login form **************************
app.get('/login', (req, res) => {
    res.render('login.pug', {})
});
app.post('/login', (req, res) => {
    conn.query('SELECT * FROM user_login WHERE  login ="' + req.body.login + '"and password = "' + req.body.password + '"', (error, result) => {
        if (error) throw error;
        if (result.length === 0) {
            console.log('error user not found');
            res.redirect("/login")
        } else {
            result = JSON.parse(JSON.stringify(result));
            let hash =makeHash(32)
            res.cookie("hash", hash);
            res.cookie("id", result[0]['id']);
            sql = "UPDATE user_login SET  hash = '"+hash+"' WHERE id= " + result[0]['id'];
            conn.query(sql, (error, resultQuery) => {
                if (error) throw error;
                res.redirect("/admin")
            });
        };

    });
});


//!part saveOrder and sendMail
function saveOrder(data, result) {
    let sql = "INSERT INTO user_info(user_name,user_phone,user_email,address) VALUES ( '" + data.username + "','" + data.phone + "','" + data.email + "','" + data.address + "')";
    conn.query(sql, (error, resultQuery) => {
        if (error) throw error;
        console.log('1 user info saved');
        let userId = resultQuery.insertId;
        let date = new Date() / 1000;
        for (let i = 0; i < result.length; i++) {
            sql = "INSERT INTO shop_order (date, user_id, goods_id, goods_cost, goods_amount, total) VALUES (" + date + "," + userId + "," + result[i]['id'] + ", " + result[i]['cost'] + "," + data.key[result[i]['id']] + ", " + data.key[result[i]['id']] * result[i]['cost'] + ")";
            conn.query(sql, (err, resultQuery) => {
                if (err) throw err;
                console.log(resultQuery)
            })
        }

    });
}

async function sendMail(data, result) {
    let res = '<h2>Order in My Shop</h2>';
    let total = 0;
    for (let i = 0; i < result.length; i++) {
        res += `<p>${result[i]['name']} - ${data.key[result[i]['id']]} - ${result[i]['cost'] * data.key[result[i]['id']]} usd</p>`;
        total += result[i]['cost'] * data.key[result[i]['id']];
    }
    console.log(result);
    res += '<hr>';
    res += `Total ${total} uah`;
    res += `<hr>Phone: ${data.phone}`;
    res += `<hr>Username: ${data.username}`;
    res += `<hr>Address: ${data.address}`;
    res += `<hr>Email: ${data.email}`;
    console.log(res);
    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email", port: 587, secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass // generated ethereal password
        }
    });

    let mailOption = {
        from: `<l@gmail.com>`, to: "l@gmail.com," + data.email, subject: "shop order", text: 'Hello world', html: res
    };

    let info = await transporter.sendMail(mailOption);
    console.log("MessageSent: %s", info.messageId);
    console.log("PreviewSent: %s", nodemailer.getTestMessageUrl(info));
    return true;
}
//!make hash
function makeHash(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


app.listen(4000, () => {
    console.log("Backend is starting !!!")
});
