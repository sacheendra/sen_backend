var express = require('express')
var path = require('path')
var favicon = require('serve-favicon')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session')
var RedisStore = require('connect-redis')(session)

var routes = require('./routes/index')

var getInterviewDb = require('./interviewdb')

var app = express()

var interviewDb

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'))
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(session({
  store: new RedisStore(),
  secret: 'monty python',
  saveUninitialized: false,
  resave: false
}))

app.use(function(req, res, next) {
  if (interviewDb) {
    req.interviewDb = interviewDb
    next()
  } else {
    getInterviewDb(function(err, interviewDb_temp) {
      if (err) return next(err)
      else {
        interviewDb = interviewDb_temp
        req.interviewDb = interviewDb
        next()
      }
    })
  }
})

app.use('/', routes)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500)
    res.send({
      message: err.message,
      error: err
    })
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500)
  res.send({
    message: err.message
  })
})


module.exports = app
