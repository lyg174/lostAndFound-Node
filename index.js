const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql')
const path = require('path');
const { log } = require('console');


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
                res.status(200).json({ data: result });
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
            res.status(400).json({ error: '用户名已存在' });
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


//提供失主已经发布的失物信息
app.get('/lostlist', (req, res) => {

    const getLostListInfo = 'SELECT * FROM lostlist';
    connection.query(getLostListInfo, [], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            for (let i = 0; i < result.length; i++) {
                const item = result[i];
                // 在这里处理每个 item
                item.lostImageUrl = item.lostImageUrl.replace('node\\', '') //删除原图片路径中的'node\'
            }
            res.status(200).json({ data: result })
        }
    })
})

//提供拾取者发布的招领信息
app.get('/foundlist', (req, res) => {

    const getFoundListInfo = 'SELECT * FROM foundlist';
    connection.query(getFoundListInfo, [], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            for (let i = 0; i < result.length; i++) {
                const item = result[i];
                // 在这里处理每个 item
                item.foundImageUrl = item.foundImageUrl.replace('node\\', '') //删除原图片路径中的'node\'
            }
            res.status(200).json({ data: result })
        }
    })
})

//提供用户个人信息
app.post('/usersInfo', (req, res) => {
    const { username } = req.body;

    const getUsersInfo = 'SELECT * FROM usersinfo WHERE username = ?'
    connection.query(getUsersInfo, [username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ data: result })
        }
    })
})

//处理用户修改信息
app.post('/changeInfo', (req, res) => {
    const userInfo = req.body;

    const updateUserInfo = `UPDATE usersinfo SET nickname=?, realName=?, gender=?, phoneNumber=? WHERE username=?`;

    // 执行用户信息更新操作
    connection.query(
        updateUserInfo,
        [userInfo.nickname, userInfo.realName, userInfo.gender, userInfo.phoneNumber, userInfo.username], // username 是用户的唯一标识
        (err, result) => {
            if (err) {
                console.error('更新失败: ', err);
                res.status(500).json({ error: '更新失败' });
                return;
            }
            console.log('更新成功');
            res.status(200).json({ message: '更新成功' });
        }
    );
})

// 处理图片路径，以便前端访问图片
app.get('/image-proxy', (req, res) => {
    const imageUrl = req.query.url; // 前端通过查询参数传递图片路径
    const absoluteImageUrl = path.join(__dirname, imageUrl); // 根据传递的路径构建绝对路径
    res.sendFile(absoluteImageUrl); // 将图片发送回前端
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});