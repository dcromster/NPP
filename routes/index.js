var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { user : req.user });
});

router.get('/register', function(req, res) {
    res.render('register', { });
});

router.post('/register', function(req, res) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
          return res.render("register", {info: "Sorry. That username already exists. Try again."});
        }

        passport.authenticate('local')(req, res, function () {
            res.redirect('/');
        });
    });
});

router.get('/login', function(req, res) {
  res.render('login', { user : req.user });
});

router.post('/login', passport.authenticate('local'), function(req, res) {
  res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/password_reset', function(req, res){
  res.render('password_reset', {
    user: req.user
  });
});
/*
extends layout

block content
  .container
    h1 Password reset
    br
    form(role='form', action="/password_reset",method="post", style='max-width: 300px;')
      .form-group
          input.form-control(type='text', name="username", placeholder='Enter Username')
      button.btn.btn-default(type='submit') Submit
      &nbsp;
      a(href='/')
        button.btn.btn-primary(type="button") Cancel*/
router.post('/password_reset', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      Account.findOne({ username: req.body.email }, function(err, user) {

        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/password_reset');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.save(function(err) {
          done(err, token, user);
        });
      });
/*
      Account.findOne({ username: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/password_reset');
        }

        user['resetPasswordToken'] = token;
        user['resetPasswordExpires'] = Date.now() + 3600000; // 1 hour
//        user.resetPasswordToken = token;
//        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        console.log(user);

        user.save(function(err) {
          done(err, token, user);
//          console.log('Token');
//          console.log(token);
        });
      });
*/
    },
    function(token, user, done) {
      // отправка сгенерированного пароля
      var smtpTransport = nodemailer.createTransport('SMTP', {
        service: 'Yandex',
          auth: {
            host: 'smtp.yandex.ru',
            pass: 'yjdfz240',
            user: 'dc-rom@yandex.ru'
        }
      });

      var mailOptions = {
        to: user.username,
        from: 'dc-rom@yandex.ru',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        // ,html: ''
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
        done(err, 'done');
      });
      /* // send mail with defined transport object
      smtpTransport.sendMail(mailOptions, function(error, info){
        if(error){
          return console.log(error);
        }
        req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });*/
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/password_reset');
  });
});

router.get('/reset/:token', function(req, res) {
//  console.log(req.params);
  Account.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/password_reset');
    }
    res.render('reset', {
      user: req.user
    });
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      Account.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport('SMTP', {
        service: 'Yandex',
          auth: {
            host: 'smtp.yandex.ru',
            pass: 'yjdfz240',
            user: 'dc-rom@yandex.ru'
        }
      });

      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

//-----------------------------------------------------------------------------
//router.get('/ping', function(req, res){
//    res.status(200).send("pong!");
//});

router.get('*', function(req, res){
  res.render('404', 404);
});

router.post('*', function(req, res){
  res.render('404', 404);
});

module.exports = router;


/*
var express = require('express');
var router = express.Router();

// GET home page.
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
*/
