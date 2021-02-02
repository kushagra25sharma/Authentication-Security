
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({// initializing session
  secret : "This is our little secret.",
  resave : false,
  saveUninitialized: true,
}));

//using passport to manage our session
//passport will maintain persistant login sessions. Its sole purpose is to authenticate request
app.use(passport.initialize());// sets up passport for us
app.use(passport.session());// use passport to set up our session

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set("useCreateIndex", true); // to avoid deprecation warning

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose); // hash and salt our password and save data in databse

//const secret = "ThisIsOurLittleSecret";// we will encrypt our password by using this string
//userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});//its a plugin and it encrypts every field
//but we don't want that we just want our password to be encrypted so we add the encryptedFields parameter

//using environment variables to encrypt password
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields:["password"]});

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());// create local login strategy

passport.serializeUser(User.serializeUser());// creates a cookie and stores user info
passport.deserializeUser(User.deserializeUser());// crumbles the cookie & gget info about user
//                                               & all the idetification to authenticate them
app.get('/', function(req, res){
  res.render("home");
});

app.get('/login', function(req, res){
  res.render("login");
});

app.get('/register', function(req, res){
  res.render("register");
});


app.get('/secrets', function(req, res){
  if(req.isAuthenticated()){// checking if user is authenticated
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post('/register', function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){// "local" is the type of authentication
        res.redirect("/secrets");
      });// this callback func triggers when we have authenticated the user and cookie is created
    }
  });
});


app.post("/login", function(req, res){
  const user = new User({
    username : req.body.username,
    password : req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});


// app.post('/register', function(req, res){
//   const newUser = new User({
//     email: req.body.username,
//     password: md5(req.body.password)
//   });
//
//   newUser.save(function(err){
//     if(err){
//       res.send("Oops! Something went wrong." + err);
//     } else {
//       res.render("secrets");
//     }
//   });
//
// });
//
//
// app.post('/login', function(req, res){
//
//   User.findOne({email: req.body.username}, function(err, foundResult){
//     if(err){
//       res.send("Oops! Something went wrong." + err);
//     } else {
//       if(foundResult){
//         if(foundResult.password === md5(req.body.password)){
//           res.render("secrets");
//         } else {
//           res.send("Wrong email or password");
//         }
//
//       } else {
//         res.send("You are not authorized to view this page. Please register or check your credentials.");
//       }
//     }
//   });
//
// });


app.listen(3000, function(){
  console.log("Server is running on port 3000");
});
