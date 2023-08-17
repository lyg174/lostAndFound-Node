const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql')


const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());


// MySQL连接配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'LostAndFoundDB'
};

//创建数据库连接对象
const connection = mysql.createConnection(dbConfig);


//连接数据库测试
connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database!');
});

//登录
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const checkUserName = 'SELECT * FROM users WHERE username = ?';

    connection.query(checkUserName, [username], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        } else if (result.length === 0) {
            res.status(401).json({ error: '用户不存在' })
        } else {
            const user = result[0];
            if (password === user.password) {
                res.status(200).json({ message: '登录成功' });
            } else {
                res.status(401).json({ error: '密码错误' });
            }
        }
    })
})


//注册
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    const checkUserName = 'SELECT * FROM users WHERE username = ?';
    connection.query(checkUserName, [username], (err, result) => {// 检查用户名是否存在
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        } else if (result.length > 0) {// 返回的结果集中的行数,如存在则大于0
            res.status(400).json({ error: '用户名以存在' });
        } else {// 将注册信息存入数据库
            const insertUserMsg = 'INSERT INTO users (username, password) VALUES (?, ?)';
            connection.query(insertUserMsg, [username, password], (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.status(200).json({ message: '注册成功' });
                }
            });
        }
    })
})





app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});