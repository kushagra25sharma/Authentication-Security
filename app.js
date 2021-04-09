
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));//to be able to access static files in "public" folder (our css folder)
app.set('view engine', 'ejs');

app.use(session({// initializing session
  secret : process.env.MY_SECRET,// for computing the hash
  resave : false,
  saveUninitialized: true,
}));

//using passport to manage our session
//passport will maintain persistant login sessions. Its sole purpose is to authenticate request
app.use(passport.initialize());// sets up passport for us
app.use(passport.session());// use passport to set up our session

mongoose.connect(process.env,CONNECTION_URL, {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set("useCreateIndex", true); // to avoid deprecation warning

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose); // hash and salt our password and save data in databse
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());// create local login strategy

// passport.serializeUser(User.serializeUser());// creates a cookie and stores user info
// passport.deserializeUser(User.deserializeUser());// crumbles the cookie & gget info about user
// //                                               & all the idetification to authenticate them

// These are for all types local google facebook
passport.serializeUser(function(user, done) {// creates a cookie and stores user info
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {// crumbles the cookie & get info about user
//                                               & all the idetification to authenticate them
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfilURL: "https://www.googleapis.com/oauth/v3/userinfo"
  },
  // this func trigers when we click on sign up with google
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    // if user is already registered in our database its ok  otherwise create account
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', function(req, res){
  res.render("home");
});

app.get('/auth/google',passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

app.get('/login', function(req, res){
  res.render("login");
});

app.get('/register', function(req, res){
  res.render("register");
});

//when we take them to static page it verifys if user is loged in or not
// app.get('/secrets', function(req, res){// if he is authenticated  allow him to view the page which has our seecret
//   if(req.isAuthenticated()){// checking if user is authenticated
//     res.render("secrets");
//   } else {
//     res.redirect("/login");
//   }
// });

// now we want that every user whether logged in or not can view the secrets submitted by other users & by them
// we wont check for autheentication
app.get('/secrets', function(req, res){
  User.find({"secret" : {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    } else {
      if(foundUsers){
        res.render("secrets", {userWithSecret : foundUsers});
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});


app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  //console.log(req.user.id);// req.user save the details of current user

  User.findById(req.user.id, function(err, foundUser){// find user by id an add there secret
    if(err){
      console.log(err);
    } else {
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(err){
          if(!err){
            res.redirect("/secrets");
          }
        });
      }
    }
  });
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
      passport.authenticate("local", { successRedirect: '/secrets',failureRedirect: '/register'})(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});


app.listen(3000, function(){
  console.log("Server is running on port 3000");
});
