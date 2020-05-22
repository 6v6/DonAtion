const express = require('express')
const app = express()
const path = require('path')
var request = require('request')
var mysql      = require('mysql');
var jwt = require('jsonwebtoken')
const DATE_FORMATER = require('dateformat');
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
            client_id : 'a4VYuap4YmsWUp8gRiFKHvnT2s7wNTD90mbRkuGN',
            client_secret : 'uzdgS8WDa2yfraBa2ooGbi8lBnbpwGhzL1OpPXKY',
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

//기부리스트 get방식
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


//기부리스트 post방식
app.post('/charityList', function(req, res) {
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
            res.json(result);
        }
    })
})

//기부처 상세보기
app.get('/charityDetail/:charityid', function(req, res) {
    var charityid = req.params.charityid;
    var sql = "SELECT * FROM charity where charityid = ?"
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
    var sql = "SELECT u.name, u.email, c.title, c.charityid, uc.amount from user u, charity c, userCharity uc WHERE u.id = uc.id AND c.charityid = uc.charityid AND uc.id = ?;"
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

//------------------ 나의 기부현황 ------------------//

app.get('/myCharity', function(req, res){
    res.render('myCharity')
})

app.post('/myCharity', auth, function(req, res){
    var userId = req.decoded.userId;

    var sql = "SELECT u.name, u.email, c.title, c.charityid, uc.amount, uc.charitydate from user u, charity c, userCharity uc WHERE u.id = uc.id AND c.charityid = uc.charityid AND uc.id = ?;"
    connection.query(sql, [userId], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            for (var i = 0; i < result.length; i++) {
                result[i].charitydate = DATE_FORMATER(result[i].charitydate, "yyyy-mm-dd");
            }
            res.json(result);
        }
    })
})





//------------------ 더치페이 기능 없이 기부하기 ------------------//
app.get('/charitySend/:charityid', function(req, res) {
    var charityid = req.params.charityid;
    var sql = "SELECT * FROM charity where charityid = ?"
    console.log(charityid);
    connection.query(sql, [charityid], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            res.render('charitySend', {data : result});
        }
    })
})

app.post('/charitySend', auth, function(req, res){
    var userId = req.decoded.userId;
    var charityid = req.body.charityid;
    var amount = req.body.amount;

    let today = new Date();
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();  // 날짜

    var day = year + '/' + month + '/' + date;

    var sql = "SELECT * FROM userCharity where id = ?"
    connection.query(sql, [userId], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            var sql = "INSERT into userCharity SET id = ?, charityid = ?, amount = ?, charitydate = ?"
            connection.query(sql, [userId, charityid, amount, day], function(err, result) {
                if(err){
                    console.error(err)
                    throw err
                }
                else {
                    res.json(1);
                }
            })
        }
    })
})


//------------------ 요청받은 더치페이 금액 송금 ------------------//
app.get('/sendConfirm',function(req,res){
    res.render('sendConfirm');
})

//http://localhost:3000/send?dutchAmount=6430&user_id=2&host_use_num=199162898057883850732824
app.get('/send',function(req,res){
    var dutchAmount = req.query.dutchAmount;
    var user_id = req.query.user_id;
    var host_use_num = req.query.host_use_num;
    host_use_num = host_use_num.toString();
    console.log(host_use_num+'!!!!!!!!!!');
    var requestInfo = {
        dutchAmount : dutchAmount,
        user_id : user_id,
        host_use_num : host_use_num
    }
    console.log(requestInfo);
    res.render('send', {requestInfo});
})

app.post('/send', auth, function(req, res) {
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
app.post('/withdraw', auth, function(req, res) {
    // 은행거래고유번호 생성
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991628980U" + countnum;
    
    // fin_use_num
    var fin_use_num = req.body.fin_use_num;

    // tran_amt : 거래금액
    var tran_amt = req.body.tran_amt;
    
    // tran_dtime : 현재시간 14자리 형식
    var now = new Date();
    var now_time = DATE_FORMATER(now, "yyyymmddHHMMss")
    
    // DB에서 accessToken 가져오기
    var userId = req.decoded.userId;
    var sql = "SELECT * FROM user WHERE id = ?" 
    connection.query(sql, [userId], function(err, result) {
        if(err) {
            console.error(err);
            throw err;
        }
        else {
            console.log(result);

            var option = {
                method : "POST",
                url : "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
                headers : {
                    'Content-Type' : 'application/json; charset=UTF-8',
                    Authorization : 'Bearer ' + result[0].accesstoken // accessToken
                },
                json : {
                    "bank_tran_id" : transId, // 이용기관코드
                    "cntr_account_type" : "N",
                    "cntr_account_num": "3638010471", // 약정 계좌번호
                    "dps_print_content": result[0].name + '송금', // 입금계좌 인지내역
                    "fintech_use_num": fin_use_num,
                    "wd_print_content": "돈에이션", // 출금계좌 인지내역
                    "tran_amt": tran_amt, // 거래금액
                    "tran_dtime": now_time,
                    "req_client_name": result[0].name, // 요청고객 성명
                    "req_client_bank_code" : "097", 
                    "req_client_account_num" : "1101230000678", // 요청고객 계좌번호
                    "req_client_num": "DONATION1234", // 요청고객 회원번호 -> 그냥 통일함
                    "transfer_purpose" : "TR",
                    "recv_client_name": "돈에이션",
                    "recv_client_bank_code": "097",
                    "recv_client_account_num": "232000067812"
                }
                
            }
        
            request(option, function(err, response, body) {
                if(err) {
                    console.error(err);
                    throw err;
                }
                else {
                    console.log(body);
                    if(body.rsp_code == "A0000"){
                        res.json(body)
                    }
                }
            })
        }
    })
})



//------------------ 입금이체 API ------------------//
app.post('/deposit', auth, function(req, res) {
    // 은행거래고유번호 생성
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991628980U" + countnum;
    
    // fin_use_num
    var fin_use_num = req.body.fin_use_num;
    fin_use_num = fin_use_num.toString();
    console.log(fin_use_num+'??????????');

    // tran_amt : 거래금액
    var tran_amt = req.body.tran_amt;
    
    // tran_dtime : 현재시간 14자리 형식
    var now = new Date();
    var now_time = DATE_FORMATER(now, "yyyymmddHHMMss")
    
    // DB에서 accessToken 가져오기
    var userId = req.decoded.userId;
    var sql = "SELECT * FROM user WHERE id = ?" 
    connection.query(sql, [userId], function(err, result) {
        if(err) {
            console.error(err);
            throw err;
        }
        else {
            console.log(result);

            var option = {
                method : "POST",
                url : "https://testapi.openbanking.or.kr/v2.0/transfer/deposit/fin_num",
                headers : {
                    'Content-Type' : 'application/json; charset=UTF-8',
                    Authorization : 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJUOTkxNjI4OTgwIiwic2NvcGUiOlsib29iIl0sImlzcyI6Imh0dHBzOi8vd3d3Lm9wZW5iYW5raW5nLm9yLmtyIiwiZXhwIjoxNTk3ODA1MzMxLCJqdGkiOiIxNzI1YTliYS1jODU1LTRhODMtYWU5OS03OWE4Y2MwZDkzODYifQ.y3ieHZ77WNd5HNRk23U3JVpAjDdKRjlxRw8lsFII0Bw' // 이용기관accessToken
                },
                json : {
                    "cntr_account_type": "N",
                    "cntr_account_num": "5074073519", // 약정 계좌번호
                    "wd_pass_phrase": "NONE",
                    "wd_print_content": "더치금액 송금", // 입금계좌 인지내역
                    "name_check_option": "off",
                    "tran_dtime": now_time,
                    "req_cnt": "1",
                    "req_list": [
                        {
                        "tran_no": "1",
                        "bank_tran_id": transId,
                        "fintech_use_num": "199162898057883850881758", // 타입 변환 해결 후, fin_use_num으로 바꿔야 함
                        "print_content": "돈에이션",
                        "tran_amt": tran_amt,
                        "req_client_name": "개설자",
                        "req_client_bank_code": "097",
                        "req_client_account_num": "00012300000678",
                        "req_client_num": "DONATION1234",
                        "transfer_purpose": "TR"
                        }
                    ]
                }
                
            }
        
            request(option, function(err, response, body) {
                if(err) {
                    console.error(err);
                    throw err;
                }
                else {
                    console.log(body);
                    if(body.rsp_code == "A0000"){
                        res.json(body)
                    }
                }
            })
        }
    })
})

//------------------ 송금완료시 db저장 기부금액,아이디,현재시간 ------------------//
app.post('/sendConfirms', function(req, res){
    //data req get db store

    var id = req.body.id
    var amount = req.body.amount
    var charityid=req.body.charityid
    console.log(id);
    console.log(amount);
    var sql="INSERT INTO donation.userCharity (id, amount,charityid) VALUES(?,?,?)"
    connection.query(
        sql, 
        [id,amount,charityid], // ? <-value
        function(err,result){
            if(err){
                console.error(err);
                throw err;
            }
            else {
                 res.json(1)   
            }
        })
})


app.listen(3000);