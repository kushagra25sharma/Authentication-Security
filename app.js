require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const md5 = require('md5');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//const secret = "ThisIsOurLittleSecret";// we will encrypt our password by using this string
//userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});//its a plugin and it encrypts every field
//but we don't want that we just want our password to be encrypted so we add the encryptedFields parameter

//using environment variables to encrypt password
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:["password"]});

const User = mongoose.model("User", userSchema);

app.get('/', function(req, res){
  res.render("home");
});

app.get('/login', function(req, res){
  res.render("login");
});

app.get('/register', function(req, res){
  res.render("register");
});


app.post('/register', function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password)
  });

  newUser.save(function(err){
    if(err){
      res.send("Oops! Something went wrong." + err);
    } else {
      res.render("secrets");
    }
  });

});


app.post('/login', function(req, res){

  User.findOne({email: req.body.username}, function(err, foundResult){
    if(err){
      res.send("Oops! Something went wrong." + err);
    } else {
      if(foundResult){
        if(foundResult.password === md5(req.body.password)){
          res.render("secrets");
        } else {
          res.send("Wrong email or password");
        }

      } else {
        res.send("You are not authorized to view this page. Please register or check your credentials.");
      }
    }
  });

});


app.listen(3000, function(){
  console.log("Server is running on port 3000");
});
