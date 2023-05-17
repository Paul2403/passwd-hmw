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

//adding the cors policy handler
app.use(cors({
    origin: 'http://localhost:4200'
  }));

//the host and port credentials for the OTP sending
const env = {
  SMTP_HOST:'smtp.gmail.com',
  SMTP_PORT:'587',
  SMTP_MAIL:'callbackcoding08@gmail.com',
  SMTP_PASSWORD:'lzwrknuwnbqgojbn'
} 

//database credentials
const client = new Client({
    host: "localhost",
    user: "postgres",
    port:5432,
    password: "postgres",
    database: "postgres"
});

const otpGenerator = require("otp-generator");


//Function to generate OTP
generateOTP = () => {
  const OTP = otpGenerator.generate(6,{
    upperCaseAlphabets: false,
    specialChars: false,
    
  });

  return OTP;
};


client.connect();


//Call to send OTP and do the rest
app.post('/user/otp' , (req,res) => {
  const data = req.body;

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
    html: '<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2"><div style="margin:50px auto;width:70%;padding:20px 0"><div style="border-bottom:1px solid #eee"><a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Password Updation Tool</a></div><p style="font-size:1.1em">Hi,</p><p>Thank you for choosing Password Updation Tool. Use the following OTP to complete your Password Updation procedures. OTP is valid for 30 seconds</p><h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">'+otp+'</h2><p style="font-size:0.9em;">Regards,<br />Password Updation Tool Team</p><hr style="border:none;border-top:1px solid #eee" /><div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300"><p>Password Updation Tool Team</p><p>Saskatoon</p><p>Canada</p></div></div></div>'
  };


 transporter.sendMail(mailOptions, function(error,info){
  if(error){
    console.log(error);
  }
  else{
    // console.log('Email sent: ' + info.response);
  }
 })

});

//Submit the OTP recieved to update the password
app.post('/user/otpConfirm' , (req,res) => {
  const currentTime = new Date();
  if (otpDetails.otp === req.body.otp && otpDetails.expiryTime > currentTime) {
    const data = JSON.stringify(req.body);
    const dbFunction = `SELECT update_password ('${data}')`;
    client.query(dbFunction, (err, dbRes) => {
      if (!err) {
        if(dbRes.rows[0].update_password.status==200){
          res.send({status:200, data:dbRes.rows[0].update_password.data})
        }
        else{
          res.send({status:400, data:"Password Updation Failed!"})
        }
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


//call to check if the user is there and the current password is correct
app.post('/user/login', (req, res) => {
  // res.send({ status: 200, data: 1 });
  const data = JSON.stringify(req.body);
  const dbFunction = `SELECT id,current_password FROM public.login_credentials where email_id=('${req.body.email_id}')`;
  client.query(dbFunction, (err, dbRes) => {
    if (!err) {
      if(dbRes.rows[0].current_password){
        if(dbRes.rows[0].current_password == req.body.current_password){
          const identity = dbRes.rows[0].id;
          const newData = {
            id: identity,
            typedPass : req.body.typedPass
          }
          const newData1 = JSON.stringify(newData);
          const dbFunction = `SELECT old_password_check ('${newData1}')`;
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
        }
        else{
          res.send({ status: 400, data: 'Data not found' });
        }  
      }
    } else {
      console.log(err.message);
    }
    
  });
   
});

//call to fetch the common passwords
app.post('/user/common-passwords', (req, res) => {
  const dbFunction = `SELECT * FROM public.common_passwords`;
  client.query(dbFunction, (err, dbRes) => {
    if (!err) {
      if(dbRes.rows){
        res.send({ status: 200, data: dbRes.rows});
      }
    } else {
      res.send({ status: 400, data: 'No Data Found'});
    }
    
  });
});





app.listen(3000, (req,res) => {
    console.log('Express API is running at port 3000');
})