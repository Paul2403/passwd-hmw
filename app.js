const express = require('express');
const app = express();
const {Client} = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require("nodemailer");
const CryptoJS = require('crypto-js');
const bcrypt = require('bcrypt');
const otpDetails = {
  otp: '',
  expiryTime: ''
};

app.use(bodyParser.json());

app.use(cors({
    origin: 'http://localhost:4200'
  }));

const env = {
  SMTP_HOST:'smtp.gmail.com',
  SMTP_PORT:'587',
  SMTP_MAIL:'callbackcoding08@gmail.com',
  SMTP_PASSWORD:'lzwrknuwnbqgojbn'
} 

const client = new Client({
    host: "localhost",
    user: "postgres",
    port:5432,
    password: "postgres",
    database: "postgres"
});

const otpGenerator = require("otp-generator");



generateOTP = () => {
  const OTP = otpGenerator.generate(6,{
    upperCaseAlphabets: false,
    specialChars: false,
    
  });

  return OTP;
};







client.connect();

app.post('/user/otp' , (req,res) => {
  const data = req.body;
  console.log('DATA',data);

  var transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_MAIL,
      pass: env.SMTP_PASSWORD,
    }
  });

  const otp = generateOTP();
  const otpValidityInMinutes = 0.5; // Set OTP validity time to 5 minutes
  const otpExpiryTime = new Date();
  otpExpiryTime.setTime(otpExpiryTime.getTime() + otpValidityInMinutes * 60 * 1000); // Add 5 minutes to current time
  otpDetails.otp = otp;
  otpDetails.expiryTime = otpExpiryTime;



  var mailOptions = {
    from: 'pwdauthenticator@gmail.com',
    to: req.body.email_id,
    subject: "OTP for Password Updation",
    // text: `Your OTP is: ${otp}`,
    html: '<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2"><div style="margin:50px auto;width:70%;padding:20px 0"><div style="border-bottom:1px solid #eee"><a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Password Updation Tool</a></div><p style="font-size:1.1em">Hi,</p><p>Thank you for choosing Password Updation Tool. Use the following OTP to complete your Password Updation procedures. OTP is valid for 5 minutes</p><h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">'+otp+'</h2><p style="font-size:0.9em;">Regards,<br />Password Updation Tool Team</p><hr style="border:none;border-top:1px solid #eee" /><div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300"><p>Password Updation Tool Team</p><p>Saskatoon</p><p>Canada</p></div></div></div>'
  };


 transporter.sendMail(mailOptions, function(error,info){
  if(error){
    console.log(error);
  }
  else{
    console.log('Email sent: ' + info.response);
  }
 })

});

app.post('/user/otpConfirm' , (req,res) => {
  const currentTime = new Date();
  if (otpDetails.otp === req.body.otp && otpDetails.expiryTime > currentTime) {
      // Generate a salt
    // const salt = bcrypt.genSaltSync(10);
    // const password = req.body.passwd;
    // const hashedPassword = bcrypt.hashSync(password, salt);
    // req.body.passwd = hashedPassword;
    const data = JSON.stringify(req.body);
    console.log('DATA', data);
    const dbFunction = `SELECT update_password ('${data}')`;
    console.log(JSON.stringify(dbFunction));
    client.query(dbFunction, (err, dbRes) => {
      if (!err) {
        console.log('DBRES',dbRes);
        console.log('RASCAL123', JSON.stringify(dbRes.rows[0].update_password));
        if(dbRes.rows[0].update_password.status==200){
          res.send({status:200, data:dbRes.rows[0].update_password.data})
        }
        else{
          res.send({status:400, data:"Password Updation Failed!"})
        }
        // if (dbRes.rows[0].update_password.status == 200) {
        //   res.send({ status: 200, data: dbRes.rows[0].update_password.data[0] });
        // } else {
        //   res.send({ status: 400, data: 'Data not found' });
        // }
      } else {
        console.log(err.message);
      }
      
    });
  } else if(otpDetails.otp === req.body.otp && otpDetails.expiryTime < currentTime) {
    res.send({status:100, data:"OTP Expired!"})
  }
  else if(otpDetails.otp !== req.body.otp && otpDetails.expiryTime > currentTime) {
    res.send({status:300, data:"Invalid OTP!"})
  }
    
})




// app.post('/user/login' , (req,res) => {
//     const data = JSON.stringify(req.body);
//     console.log('DATA',data);
//     const dbFunction= `SELECT get_credentials ('${data}')`;
//     console.log(JSON.stringify(dbFunction));
//     client.query(`SELECT get_credentials ('${data}')`, (err, res)=>{
//     if(!err){
//         console.log('RASCAL',res.rows[0]);
//         if(res.rows[0].get_credentials){
            
//             return res.rows[0].get_credentials ; 
//         }
//         else{
//             return { status: 200, data: 'Data not found' } ; 
//         }
//     }
//     else{
//         console.log(err.message);
//     }
//     client.end;
// })
    
// })



app.post('/user/login', (req, res) => {
  // res.send({ status: 200, data: 1 });
  const data = JSON.stringify(req.body);
  console.log('DATA', data);
  const dbFunction = `SELECT id,current_password FROM public.login_credentials where email_id=('${req.body.email_id}')`;
  client.query(dbFunction, (err, dbRes) => {
    if (!err) {
      if(dbRes.rows[0].current_password){
        console.log('passssss', req.body.current_password);
        if(dbRes.rows[0].current_password == req.body.current_password){
          const identity = dbRes.rows[0].id;
          console.log('Passwords MAtch');
          console.log('HEYYYLO',req.body);
          const newData = {
            id: identity,
            typedPass : req.body.typedPass
          }
          const newData1 = JSON.stringify(newData);
          const dbFunction = `SELECT old_password_check ('${newData1}')`;
          console.log(dbFunction);
          client.query(dbFunction, (err, dbRes) => {
            if (!err) {
              if(dbRes.rows[0].old_password_check.status == 200){
                res.send({ status: 200, data: identity});
              }
              else{
                res.send({ status: 300, data: 'Password Already Exists!'});
              }
            
            } else {
              console.log(err.message);
            }
            
          });
          // 
          // if(this.checkIfOldPasswords(data) == true){

          // }
        }
        else{
          res.send({ status: 400, data: 'Data not found' });
        }
        // if (passwordMatches == true) {
        //   console.log('Passwords match!');
        //   res.send({ status: 200, data: dbRes.rows[0].id });
        // } else {
        //   console.log('Passwords don\'t match');
        //   res.send({ status: 400, data: 'Data not found' });
        // }
        // const hashedPassword = req.body.current_password;;
        // console.log('HASHED PASSWORD',hashedPassword);
        // const plaintextPassword = req.body.current_password;
        // const storedPAssword = dbRes.rows[0].current_password;
        // console.log('PLAIN TEXT PSSWROD',storedPAssword);
        // const storedPassword = response.data.password;
        // bcrypt.compare(hashedPassword, storedPAssword, (err, result) => {
        //   console.log
        //   if (err) {
        //     console.error(err);
        //     return;
        //   }
        //   if (result) {
        //     console.log('Password match');
        //     res.send({ status: 200, data: dbRes.rows[0].id });
        //   } else {
        //     console.log('Password does not match');
        //     res.send({ status: 400, data: 'Data not found' });
        //   }
        // });
      }
      console.log('RASCAL542', dbRes.rows[0]);
      // if (dbRes.rows[0].get_credentials.status == 200) {
      //   res.send({ status: 200, data: dbRes.rows[0].get_credentials.data[0] });
      // } else {
      //   res.send({ status: 400, data: 'Data not found' });
      // }
    } else {
      console.log(err.message);
    }
    
  });
   
});





app.listen(3000, (req,res) => {
    console.log('Express API is running at port 3000');
})