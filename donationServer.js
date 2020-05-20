const express = require('express')
const app = express()
const path = require('path')
var request = require('request')
var mysql      = require('mysql');
var jwt = require('jsonwebtoken')
const DATE_FORMATER = require( 'dateformat' );
var auth = require('./lib/auth')



var connection = mysql.createConnection({
  host     : 'fintech.cxyonwbiekau.ap-northeast-2.rds.amazonaws.com', //'DB-hostname을 입력해주세요',
  user     : 'fintech',
  password : '1q2w3e4r!', //'DB-password를 입력해주세요',
  database : 'donation'
});
 
connection.connect();


app.set('views', path.join(__dirname, 'views')); // ejs file location
app.set('view engine', 'ejs'); //select view template engine


app.use(express.static(path.join(__dirname, 'public'))); // to use static asset (design)
app.use(express.json());
app.use(express.urlencoded({extended:false}));//ajax로 데이터 전송하는 것을 허용

// root 라우터
app.get('/', function (req, res) {
    res.render('index');
})

// main 라우터
app.get('/main', function (req, res) {
    res.render('index');
})



//------------------ 회원가입/로그인/인증 ------------------//

//회원가입 창
app.get('/signup', function(req, res){
    res.render('signup');
})

//회원가입 요청
app.post('/signup', function(req, res){
    //data req get db store
    var userName = req.body.userName;
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var userAccessToken = req.body.userAccessToken;
    var userRefreshToken = req.body.userRefreshToken;
    var userSeqNo = req.body.userSeqNo; 
    console.log(userName, userAccessToken, userSeqNo);
    var sql = "INSERT INTO donation.user (name, email, password, accesstoken, refreshtoken, userseqno) VALUES (?,?,?,?,?,?)";
    connection.query(sql, 
        [userName, userEmail, userPassword, userAccessToken, userRefreshToken, userSeqNo],
        function(err, result){
            if(err){
                console.error(err);
                res.json(0);
                throw err;
            }
            else{
                res.json(1);
            }
        });

})


//로그인 창
app.get('/login', function(req, res){
    res.render('login');
})


//로그인 요청
app.post('/login', function(req, res){
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var sql = "SELECT * FROM user WHERE email=?";
    connection.query(sql, [userEmail], function(err, result){
        if(err){
            console.error(err);
            res.json(0);
            throw err;
        }
        else{
            if(result.length == 0){
            res.json(3);
            }
            else{
                var dbPassword = result[0].password;
                if(dbPassword == userPassword){
                    var tokenKey = "f@i#n%tne#ckfhlafkd0102test!@#%"
                    jwt.sign(
                    {
                        userId : result[0].id,
                        userEmail : result[0].user_email
                    },
                    tokenKey,
                    {
                        expiresIn : '10d',
                        issuer : 'fintech.admin',
                        subject : 'user.login.info'
                    },
                    function(err, token){
                        console.log('로그인 성공', token)
                        res.json(token)
                    }
                    )
                }
                else{
                    res.json(2);
                }
            }
        }
    })

})


// 사용자 인증 요청
app.get('/authResult',function(req, res){
    var authCode = req.query.code;
    console.log(authCode);
    var option = {
        method : "POST",
        url : "https://testapi.openbanking.or.kr/oauth/2.0/token",
        header : {
            'Content-Type' : 'application/x-www-form-urlencoded',
        },
        form : {
            code : authCode,
            client_id : '9Gd2iGZ6uC8C73Sx4StubaH1UIklincOEJAnkf18',
            client_secret : 'c3p6daWMkdGvM24WRCb0W2xdbXEqdCyGdcne7PlC',
            redirect_uri : 'http://localhost:3000/authResult',
            grant_type : 'authorization_code'
        }
    }
    request(option, function(err, response, body){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            var accessRequestResult = JSON.parse(body);
            console.log(accessRequestResult);
            res.render('resultChild', {data : accessRequestResult} )
        }
    })
})



//------------------ 더치페이 요청 ------------------//

// dutchRequest : 더치페이 요청 페이지
app.get('/dutchRequest', function(req, res) {
    res.render('dutchRequest');
})


// dutchRequest : 더치페이 요청 사용자 정보 요청
app.post('/dutchRequest', auth, function(req, res) {
    var userId = req.decoded.userId;
     var sql = "SELECT * FROM user WHERE id = ?"
     connection.query(sql, [userId], function(err, result){
         if(err){
             console.error(err);
             throw err;
         }
         else{

     var option = {
         method : "GET",
         url : "https://testapi.openbanking.or.kr/v2.0/user/me",
         headers : {
             Authorization : 'Bearer ' + result[0].accesstoken
         },
         qs : {
             user_seq_no : result[0].userseqno
         }
     }
     console.log(option);
     request(option, function(err, response, body){
         if(err){
             console.error(err);
             throw err;
         }
         else {
            var accessRequestResult = JSON.parse(body);
            console.log(accessRequestResult);
            var reusultAll = {
                result : result,
                accessRequestResult : accessRequestResult
            }
            console.log(reusultAll);
            res.json(reusultAll);
         }
     })
         }
     })

})
    

// searchPeer: 사용자 정보 검색
app.post('/searchPeer', function(req, res) {
    var keyword = '%' + req.body.keyword + '%'
    console.log(req.body.keyword);

    var sql = "SELECT * FROM user WHERE name LIKE ?";
    connection.query(sql, [keyword], function(err, result) {
        if(err) {
            console.error(err);
            throw err;
        }
        else {
            console.log(result);
            res.json(result);

        }
    })
})



//------------------ 기부처 관련 정보 ------------------//

//기부리스트
app.get('/charityList', function(req, res) {
    var sql = "SELECT * FROM charity"
    connection.query(sql, function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            console.log(result);
            for(var i = 0; i < result.length; i++){
                result[i].startdate = DATE_FORMATER(result[i].startdate, "yyyy-mm-dd" );
                result[i].enddate = DATE_FORMATER( result[i].enddate, "yyyy-mm-dd" );
                result[i].percent = Math.round((result[i].current_amount / result[i].target_amount) * 100);
            }
            res.render('charityList', {charityList : result});
        }
    })
})

//기부처 상세보기
app.get('/charityDetail/:charityid', function(req, res) {
    var charityid = req.params.charityid;
    var sql = "SELECT * FROM charity where idcharity = ?"
    console.log(charityid);
    connection.query(sql, [charityid], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            console.log(result);
            result[0].startdate = DATE_FORMATER(result[0].startdate, "yyyy-mm-dd" );
            result[0].enddate = DATE_FORMATER( result[0].enddate, "yyyy-mm-dd" );
            result[0].percent = Math.round((result[0].current_amount / result[0].target_amount) * 100);
            res.render('charityDetail', {charity : result});
        }
    })
})

//-------------마이 페이지 관련 기능-----------//

app.get('/profile', function(req, res) {
    res.render('profile');
})

app.get('/modify', function(req, res) {
    res.render('modify');
})

app.post('/profile', auth, function(req, res) {
    var userId = req.decoded.userId;
    console.log(userId)
    var sql = "SELECT u.name, u.email, c.title, c.idcharity from user u, charity c, userCharity uc WHERE uc.id = u.id and uc.idcharity = c.idcharity;"
    connection.query(sql, [userId], function(err, result){
        if(err) {
            console.error(err)
            throw err
        }
        else {
            console.log(result)
            res.json(result)
        }
    })
})

app.post('/modify', auth, function(req, res){
    var userId = req.decoded.userId;
    var userName = req.body.userName;
    var userPassword = req.body.userPassword;

    var sql = "UPDATE user SET name = ?, password = ? WHERE id = ?"
    connection.query(sql, [userName, userPassword, userId], function(err, result) {
        if(err){
            console.error(err)
            throw err
        }
        else {
            res.json(1);
        }
    })
})

//------------------ 요청받은 더치페이 금액 송금 ------------------//
//http://localhost:3000/send?dutchAmount=2000&user_id=2
app.get('/sendConfirm',function(req,res){
    res.render('sendConfirm');
})

//http://localhost:3000/send?dutchAmount=5000&user_id=2&host_use_num=199162899057883851849312
app.get('/send',function(req,res){
    var dutchAmount = req.query.dutchAmount;
    var user_id = req.query.user_id;
    var host_use_num = req.query.host_use_num;
    var requsetInfo = {
        dutchAmount : dutchAmount,
        user_id : user_id,
        host_use_num : host_use_num
    }
    console.log(requsetInfo);
    res.render('send', {requsetInfo});
})

app.post('/sendConfirm', auth, function(req, res) {
    var userId = req.decoded.userId;
     var sql = "SELECT * FROM user WHERE id = ?"
     connection.query(sql, [userId], function(err, result){
         if(err){
             console.error(err);
             throw err;
         }
         else{

     var option = {
         method : "GET",
         url : "https://testapi.openbanking.or.kr/v2.0/user/me",
         headers : {
             Authorization : 'Bearer ' + result[0].accesstoken
         },
         qs : {
             user_seq_no : result[0].userseqno
         }
     }
     console.log(option);
     request(option, function(err, response, body){
         if(err){
             console.error(err);
             throw err;
         }
         else {
            var accessRequestResult = JSON.parse(body);
            console.log(accessRequestResult);
            var reusultAll = {
                result : result,
                accessRequestResult : accessRequestResult
            }
            console.log(reusultAll);
            res.json(reusultAll);
         }
     })
         }
     })

})



//------------------ 출금이체 API ------------------//
app.get('/withdraw', function(req, res) {
    res.render('withdraw');
})

app.post('/withdraw', auth, function (req, res) {
    var userId = req.decoded.userId;
    var fin_use_num = req.body.fin_use_num;

    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991629050U" + countnum; //이용기과번호 본인것 입력

    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql,[userId], function(err , result){
        if(err){
            console.error(err);
            throw err
        }
        else {
            console.log(result);
            var option = {
                method : "POST",
                url : "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
                headers : {
                    Authorization : 'Bearer ' + result[0].accesstoken,
                    "Content-Type" : "application/json"
                },
                json : {
                    "bank_tran_id": transId,
                    "cntr_account_type": "N",
                    "cntr_account_num": "3052771786",
                    "dps_print_content": "쇼핑몰 환불",
                    "fintech_use_num": fin_use_num,
                    "tran_amt": "10000",
                    "tran_dtime": "20200515150000",
                    "req_client_name": "송진호",
                    "req_client_fintech_use_num" : "199162905057883967751277",
                    "req_client_num": "SONGJINHO",
                    "transfer_purpose": "TR",
                    "recv_client_name": "김오픈",
                    "recv_client_bank_code": "097",
                    "recv_client_account_num": "6495532459"
                }
            }
            request(option, function(err, response, body){
                if(err){
                    console.error(err);
                    throw err;
                }
                else {
                    console.log(body);
                    if(body.rsp_code == 'A0000'){
                        res.json(body)
                    }
                }
            })
        }
    })
})



app.listen(3000);