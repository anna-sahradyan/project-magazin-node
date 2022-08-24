module.exports = function (req, res, conn, next) {
    if (req.cookies.hash == undefined || req.cookies.id == undefined) {
        res.redirect('/login');
        return false;
    }
    conn.query(
        'SELECT * FROM user_login WHERE id=' + req.cookies.id + ' and hash="' + req.cookies.hash + '"',
        function (error, result) {
            if (error) console.log(error);
            console.log(result);
            if (result.length == 0) {
                console.log('error user not found');
                res.redirect('/login');
            }
            else {
                next();
            }
        });
}