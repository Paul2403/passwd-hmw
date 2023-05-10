const express = require('express');
const app = express();
const {Client} = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.use(cors({
    origin: 'http://localhost:4200'
  }));

const client = new Client({
    host: "localhost",
    user: "postgres",
    port:5432,
    password: "postgres",
    database: "postgres"
})

client.connect();



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
  const data = JSON.stringify(req.body);
  console.log('DATA', data);
  const dbFunction = `SELECT get_credentials ('${data}')`;
  console.log(JSON.stringify(dbFunction));
  client.query(dbFunction, (err, dbRes) => {
    if (!err) {
      console.log('RASCAL', dbRes.rows[0]);
      if (dbRes.rows[0].get_credentials.status == 200) {
        res.send({ status: 200, data: dbRes.rows[0].get_credentials.data[0] });
      } else {
        res.send({ status: 400, data: 'Data not found' });
      }
    } else {
      console.log(err.message);
    }
    
  });
});





app.listen(3000, (req,res) => {
    console.log('Express API is running at port 3000');
})