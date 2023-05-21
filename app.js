require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require('md5');
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
var FacebookStrategy = require('passport-facebook');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://0.0.0.0:27017/userDB", {useNewUrlParser: true});
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
});
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect("/secrets");
    }
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}})
    .then(function(foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers});
    })
    .catch(function(err){
        console.log(err);
    });
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
    const secretOwnerId = req.user.id;
    User.findById(secretOwnerId)
    .then(function(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save()
        .then(function(){
            res.redirect("/secrets");
        });
    })
    .catch(function(err){
        console.log(err);
    });
});

app.get("/logout", function(req, res){
    req.logout(function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
    
});

app.post("/register", function(req, res){
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    //     newUser.save()
    //     .then(function(){
    //         res.render("secrets");
    //     })
    //     .catch(function(err){
    //         console.log(err);
    //     });
    // });
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) { 
            console.log(err);
            res.redirect("/register");
         }
        else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
        
});

/*app.post("/login", function(req, res){
    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({email: username})
    // .then(function(foundUser){
    //     bcrypt.compare(password, foundUser.password, function(err, result) {
    //         if(result === true){
    //             res.render("secrets");
    //         }
    //     });
    // })
    // .catch(function(err){
    //     console.log(err);
    // });
    
});*/
app.post('/login',

  passport.authenticate('local', { failureRedirect: '/login' }),

  function(req, res) {

    res.redirect('/secrets');

  });

app.listen(3000, function(){
    console.log("Server started on port 3000.");
});





// .env
// SECRET=Thisisourlittkesecret.
// CLIENT_ID=249070281881-021j4hs0fp48hp6trll74h3ou5hu88o7.apps.googleusercontent.com
// CLIENT_SECRET=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
// FACEBOOK_APP_ID=942274270224450
// FACEBOOK_APP_SECRET=4389256f5f3746a41d872fe08c1a0399
