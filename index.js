const express = require('express');
const cors = require('cors');//解决跨域
const bodyParser = require('body-parser');//转化json文件
const mysql = require('mysql')
const path = require('path');//处理文件路径
const multer = require('multer');//处理文件上传
const fs = require('fs');//操作文件，例如删除

const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());






// 配置招领物图片上传目录和文件名
const foundStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'foundImages/'); // 上传的文件保存在 foundImages 目录
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // 使用原始文件名作为保存的文件名
    }
});
//处理招领物图片上传实例
const uploadFoundImage = multer({ storage: foundStorage });

// 配置失物图片上传目录和文件名
const lostStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'lostImages/'); // 上传的文件保存在 lostImages 目录
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // 使用原始文件名作为保存的文件名
    }
});
//处理失物图片上传实例
const uploadLostImage = multer({ storage: lostStorage });

// 配置用户头像上传目录和文件名
const usersAvatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'usersAvatar/'); // 上传的文件保存在 usersAvatar 目录
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // 使用原始文件名作为保存的文件名
    }
});
//处理用户头像上传实例
const uploadUserAvatar = multer({ storage: usersAvatarStorage });

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
            const login_status = user.login_status;

            if (login_status === 'true') {// 判断是否允许登录
                if (password === user.password) {
                    res.status(200).json({ data: result });
                } else {
                    res.status(401).json({ error: '密码错误' });
                }
            } else {
                res.status(401).json({ error: '你被禁止登录' });
            }
            
        }
    })
})


//注册
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    const checkUserName = 'SELECT * FROM users WHERE username = ?';
    const setUserInfo = 'INSERT INTO usersinfo (username, nickname) VALUES (?, ?)'
    const updateUserInfo = 'UPDATE users SET nickname = ? WHERE username = ?'//更新用户昵称，默认为用户名

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
                    connection.query(updateUserInfo, [username, username])//第一次创建时
                    connection.query(setUserInfo, [username, username], (err, result) => {//创建用户个人信息,第一次创建时，昵称既是用户名
                        if (err) {
                            console.error(err);
                            res.status(500).json({ error: 'Internal server error' });
                        } else {
                            res.status(200).json({ message: '注册成功' });
                        }
                    })
                }
            });
        }
    })
})


//处理用户修改密码(找回)
app.post('/handlePassword', (req, res) => {
    const { username, phoneNumber } = req.body;

    const getUserInfo = 'SELECT phoneNumber FROM usersinfo WHERE username = ?';

    connection.query(getUserInfo, [username], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            if (phoneNumber === result[0].phoneNumber) res.status(200).json({ data: true });
            else res.status(401).json({ error: '信息错误' });
        }
    })
})

// 修改密码
app.post('/changePassword', (req, res) => {
    const { username, password } = req.body;

    const updateUserPSW = 'UPDATE users SET password = ? WHERE username = ?'

    connection.query(updateUserPSW, [password, username], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '修改成功' })
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

    const updateUserAvatar = 'UPDATE users SET nickname=? WHERE username = ?';//更新用户表users里对应用户的昵称信息

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
            connection.query(updateUserAvatar, [userInfo.nickname, userInfo.username], (err, result) => {
                if (err) {
                    console.error('更新失败: ', err);
                    res.status(500).json({ error: '更新失败' });
                } else {
                    res.status(200).json({ message: '更新成功' });
                }
            })
        }
    );
})

//处理用户头像上传(更改)
app.post('/usersAvatar', uploadUserAvatar.single('file'), (req, res) => {
    //文件上传成功后处理
    const username = req.body.username;//获取用户名

    const relativeAvatarPath = 'usersAvatar\\' + req.file.originalname;//获取上传头像所在地址的相对路径
    console.log(relativeAvatarPath);

    const getUserOldAvatarPath = 'SELECT avatar FROM users WHERE username = ?'// 获取用户旧头像地址

    const updateAvatarPath = 'UPDATE users SET avatar = ? WHERE username = ?';//更新用户头像存储路径

    connection.query(getUserOldAvatarPath, [username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            if (result[0].avatar) { // 区分新老用户，新用户没有头像，avatar为空时不执行
                const oldAvatarPath = result[0].avatar.replace('node\\', '');

                fs.unlink(oldAvatarPath, (err) => {
                    if (err) {
                        console.error('删除失败:', err);
                    } else {
                        handleFileUpdate(res, updateAvatarPath, relativeAvatarPath, username);
                    }
                });
            } else {// 新用户没有头像，直接更新
                handleFileUpdate(res, updateAvatarPath, relativeAvatarPath, username);
            }
        }
    })
})

//处理对应用户上传的文件路径
function handleFileUpdate(res, updatePath, relativePath, username) {//更新上传文件存储路径、文件上传后相对路径、用户名
    connection.query(updatePath, [relativePath, username], (err, result) => {
        if (err) {
            console.error('更新失败: ', err);
            res.status(500).json({ error: '更新失败' });
            return;
        }
        res.status(200).json({ path: relativePath });
    })
}

//提供用户自己发布的招领物信息
app.post('/userFoundList', (req, res) => {
    const username = req.body.username;

    const getUserFoundListInfo = 'SELECT * FROM foundlist WHERE username = ?';

    connection.query(getUserFoundListInfo, [username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            for (item of result) {
                item.foundImageUrl = item.foundImageUrl.replace('node\\', '') //删除原图片路径中的'node\'
            }

            res.status(200).json({ data: result })
        }
    })
})

//处理用户发布的招领物信息
app.post('/userPublishFound', uploadFoundImage.single('file'), (req, res) => {
    const { foundName, foundTime, foundPublishTime, descripText, myContact, username } = req.body;

    const publish_status = 'false'; // 未审核状态

    const relativeImagePath = 'foundImages\\' + req.file.originalname;//获取上传图片的相对地址

    const setUserPublishFoundInfo = 'INSERT INTO foundlist (foundImageUrl, foundName, foundTime, foundPublishTime, descripText, foundersContact, username, publish_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    connection.query(setUserPublishFoundInfo, [relativeImagePath, foundName, foundTime, foundPublishTime, descripText, myContact, username, publish_status], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '发布成功' })
        }
    })
})

//处理用户删除自己发布的招领信息(管理员删除用户的发布的招领信息)
app.post('/userDeletePublishFoundInfo', (req, res) => {
    const url = req.body.url;

    const delUserPublishFoundInfo = 'DELETE FROM foundlist WHERE foundImageUrl = ?';

    fs.unlink(url, (err) => {
        if (err) {
            console.error('删除失败:', err);
        } else {
            connection.query(delUserPublishFoundInfo, [url], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.status(200).json({ message: '删除成功' })
                }
            })
        }
    });
})

//提供用户自己发布的失物信息
app.post('/userLostList', (req, res) => {
    const username = req.body.username;

    const getUserLostListInfo = 'SELECT * FROM lostlist WHERE username = ?';

    connection.query(getUserLostListInfo, [username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            for (item of result) {
                item.lostImageUrl = item.lostImageUrl.replace('node\\', '') //删除原图片路径中的'node\'
            }

            res.status(200).json({ data: result })
        }
    })
})

//处理用户发布的失物信息
app.post('/userPublishLost', uploadLostImage.single('file'), (req, res) => {
    const { lostName, lostTime, lostPublishTime, descripText, myContact, username } = req.body;

    const publish_status = 'false'; // 未审核状态

    const relativeImagePath = 'lostImages\\' + req.file.originalname;//获取上传图片的相对地址

    const setUserPublishLostInfo = 'INSERT INTO lostlist (lostImageUrl, lostName, lostTime, lostPublishTime, descripText, losersContact, username, publish_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    connection.query(setUserPublishLostInfo, [relativeImagePath, lostName, lostTime, lostPublishTime, descripText, myContact, username, publish_status], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '发布成功' })
        }
    })
})

//处理用户删除自己发布的失物信息(管理员删除用户的发布的失物信息)
app.post('/userDeletePublishLostInfo', (req, res) => {
    const url = req.body.url;

    const delUserPublishLostInfo = 'DELETE FROM lostlist WHERE lostImageUrl = ?';

    fs.unlink(url, (err) => {
        if (err) {
            console.error('删除失败:', err);
        } else {
            connection.query(delUserPublishLostInfo, [url], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.status(200).json({ message: '删除成功' })
                }
            })
        }
    });
})

//提供用户发布的反馈信息
app.post('/userFeedbackInfo', (req, res) => {
    const username = req.body.username;

    const getUserFeedbackInfo = 'SELECT * FROM users_feedback WHERE username = ?'

    connection.query(getUserFeedbackInfo, [username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ data: result })
        }
    })
})

//处理用户发布反馈信息
app.post('/userPublishFeedbackInfo', (req, res) => {
    const userFeedbackInfo = req.body;

    const setUserFeedbackInfo = 'INSERT INTO users_feedback (username, name, gender, age, phoneNumber, email, suggestion, feedTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    connection.query(setUserFeedbackInfo, [
        userFeedbackInfo.username,
        userFeedbackInfo.name,
        userFeedbackInfo.gender,
        userFeedbackInfo.age,
        userFeedbackInfo.phoneNumber,
        userFeedbackInfo.email,
        userFeedbackInfo.suggestion,
        userFeedbackInfo.feedTime
    ], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '发布成功' })
        }
    })
})

//处理用户删除自己发布的反馈信息(管理员删除用户的发布的反馈信息)
app.post('/userDeleteFeedbackInfo', (req, res) => {
    const suggestion = req.body.suggestion;

    const delUserFeedbackInfo = 'DELETE FROM users_feedback WHERE suggestion = ?';

    connection.query(delUserFeedbackInfo, [suggestion], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '删除成功' })
        }
    })
})

// (管理员)提供用户账户信息
app.get('/usersAccountInfo', (req, res) => {
    const getUsersAccountInfo = 'SELECT * FROM users';

    connection.query(getUsersAccountInfo, [], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' })
        } else {
            res.status(200).json({ data: result })
        }
    })
})

// (管理员)删除用户账户信息
app.post('/delUsersAccountInfo', (req, res) => {
    const username = req.body.username;

    const delUserAccount = 'DELETE FROM users WHERE username = ?';// 删除用户账户

    const delUserInfo = 'DELETE FROM usersinfo WHERE username = ?';// 删除用户个人信息

    const getUserPublishLostImageUrl = 'SELECT lostImageUrl FROM lostlist WHERE username = ?'; // 获取用户发布的失物图片

    const delUserPublishLostInfo = 'DELETE FROM lostlist WHERE username = ?'; // 删除用户发布的失物信息

    const getUserPublishFoundImageUrl = 'SELECT foundImageUrl FROM foundlist WHERE username = ?'; // 获取用户发布的失物图片

    const delUserPublishFoundInfo = 'DELETE FROM foundlist WHERE username = ?'; // 删除用户发布的招领信息

    connection.query(getUserPublishLostImageUrl, [username], (err, result) => {// 处理删除用户发布的失物信息的逻辑
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' })
        } else {
            for (let i = 0; i < result.length; i++) {// 删除所有用户发布的失物图片
                const lostUrl = result[i].lostImageUrl;// 获取用户发布的失物图片
                if (lostUrl) {
                    fs.unlink(lostUrl, (err) => {
                        if (err) {
                            console.error('删除失败:', err);
                        }
                    })
                }
            }
            handleUserAccount(res, delUserPublishLostInfo, username);
        }
    })


    connection.query(getUserPublishFoundImageUrl, [username], (err, result) => {// 处理删除用户发布的招领信息的逻辑
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' })
        } else {
            for (let i = 0; i < result.length; i++) {// 删除所有用户发布的招领物图片
                const foundUrl = result[i].foundImageUrl;// 获取用户发布的招领物图片
                if (foundUrl) {
                    fs.unlink(foundUrl, (err) => {
                        if (err) {
                            console.error('删除失败:', err);
                        }
                    })
                }
            }
            handleUserAccount(res, delUserPublishFoundInfo, username);
            handleUserAccount(res, delUserAccount, username);
            handleUserAccount(res, delUserInfo, username);
            res.status(200).json({ message: '删除成功' })
        }
    })
})

// 封装管理员删除用户账户信息所用到的数据库方法
function handleUserAccount(res, sql, username) {
    connection.query(sql, [username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' })
        }
    })
}

//(管理员)控制用户的登录权限
app.post('/changeUsersLoginStatus', (req, res) => {
    const {login_status, username} = req.body;

    const changeLoginStatus = 'UPDATE users SET login_status = ? WHERE username = ?';

    connection.query(changeLoginStatus, [login_status, username], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '改变成功' })
        }
    })
})

//(管理员)改变用户发布的失物招领信息的展示状态
app.post('/changeUsersPublishStatus', (req, res) => {
    const info = req.body;

    const changeLostPublishInfo = 'UPDATE lostlist SET publish_status = ? WHERE lostImageUrl = ?'// 失物信息

    const changeFoundPublishInfo = 'UPDATE foundlist SET publish_status = ? WHERE foundImageUrl = ?'// 招领物信息

    if (info.lostImageUrl) {
        connection.query(changeLostPublishInfo, [info.publish_status, info.lostImageUrl], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.status(200).json({ message: '改变成功' })
            }
        })
    } else if (info.foundImageUrl) {
        connection.query(changeFoundPublishInfo, [info.publish_status, info.foundImageUrl], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                res.status(200).json({ message: '改变成功' })
            }
        })
    }
})

//(管理员)获取用户发布的反馈信息
app.get('/users_feedback', (req, res) => {
    const getUserFeedbackInfo = 'SELECT * FROM users_feedback';

    connection.query(getUserFeedbackInfo, [], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ data: result })
        }
    })
})

//提供管理员发布的通知信息
app.get('/getInfo', (req, res) => {
    const getInfo = 'SELECT * FROM admin_sendInfo';

    connection.query(getInfo, [], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: result[0] })
        }
    })
})

// 处理管理员发布通知
app.post('/sendMsg', (req, res) => {
    const msg = req.body.msg;

    const updateInfo = 'UPDATE admin_sendInfo SET information = ?';

    connection.query(updateInfo, [msg], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.status(200).json({ message: '发布成功' })
        }
    })
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