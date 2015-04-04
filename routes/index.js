var express = require('express')
var async = require('async')
var _ = require('underscore')
var router = express.Router()

router.post('/login', function(req, res, next) {
  if (req.session.user_data) {
    var err = new Error('104: Already Logged In')
    err.status=400
    next(err)
  } else {
    async.waterfall([
      function(callback) {
          req.interviewDb.authenticateUser(req.body.email, req.body.password, callback)
      },
      function(result, callback) {
          if(!result) {
              callback(new Error('101: Wrong Password'))
          } else {
              req.session.user_data = result
              req.session.save(callback)
          }
      }
    ], function(err) {
      if(err) return next(err)
      res.send({authenticated: true})
    })
  }
})

router.get('/logout', function(req, res) {
  if (!req.session.user_data) {
    var err = new Error('111: Not Logged In')
    err.status=400
    next(err)
  } else {
    req.session.destroy(function() {
      res.send({logout: true})
    })
  }
})

router.get('/session', function(req, res) {
  if (req.session.user_data) {
      res.send(req.session.user_data)
    } else {
	var err = new Error('111: Not Logged In')
    err.status=400
    next(err)
}
})

router.put('/users', function(req, res, next) {
  var user = req.body
  if (!user.email || !user.password || !user.role) {
    var err = new Error('102: Insufficient Information. Require email, password, role')
    err.status=400
    next(err)
  } else {
    req.interviewDb.createUser(user.email, user.password, user.role, _.omit(user, 'email', 'password', 'role'), function(err, result) {
      if(err) return next(err)
      else {
        res.send({created: true})
      }
    })
  }
})

router.get('/users/:email', function(req, res, next) {
  req.interviewDb.getUser(req.params.email, function(err, result) {
    if(err) return next(err)
    else {
      res.send(result)
    }
  })
})

router.patch('/users/:email', function(req, res, next) {
  if (_.isEmpty(req.body)) {
    var err = new Error('107: Insufficient Information. Empty body')
    err.status=400
    next(err)
  } else {
    if (req.session.user_data && req.session.user_data.email === req.params.email) {
      req.interviewDb.updateUser(req.params.email, _.omit(req.body, 'email', 'password', 'role'), function(err, result) {
        if(err) return next(err)
        else {
          res.send({updated: true})
        }
      })
    } else {
      var err = new Error('106: Not Authorized')
      err.status=401
      next(err)
    }
  }
})

router.put('/events', function(req, res, next) {
  if (req.session.user_data && req.session.user_data.role === "admin") {
    var event = req.body
    if (!event.name || !event.criteria) {
      var err = new Error('104: Insufficient Information. Require name, criteria')
      err.status=400
      next(err)
    } else {
      req.interviewDb.createEvent(event.name, event.criteria, event.details, function(err, result) {
        if(err) return next(err)
        else {
          res.send({created: true})
        }
      })
    }
  } else {
    var err = new Error('105: Not Authorized')
    err.status=401
    next(err)
  }
})

router.get('/events', function(req, res, next) {
  req.interviewDb.getEvents(function(err, result) {
    if(err) return next(err)
    else {
      res.send(result)
    }
  })
})

router.get('/events/:event_name', function(req, res, next) {
  req.interviewDb.getEvent(req.params.event_name, function(err, result) {
    if(err) return next(err)
    else {
      res.send(result)
    }
  })
})

router.patch('/events/:event_name', function(req, res, next) {
  if (_.isEmpty(req.body) || (_.isEmpty(req.body.criteria) && _.isEmpty(req.body.details))) {
    var err = new Error('108: Insufficient Information. Empty criteria and details')
    err.status=400
    next(err)
  } else {
    if (req.session.user_data && req.session.user_data.role === "admin") {
      req.interviewDb.updateEvent(req.params.event_name, req.body.criteria, req.body.details, function(err, result) {
        if(err) return next(err)
        else {
          res.send({updated: true})
        }
      })
    } else {
      var err = new Error('110: Not Authorized')
      err.status=401
      next(err)
    }
  }
})

router.post('/events/:event_name/register', function(req, res, next) {
  if (req.session.user_data && req.session.user_data.email) {
    req.interviewDb.registerForEvent(req.session.user_data.email, req.params.event_name, function(err, result) {
      if(err) return next(err)
      else {
        res.send({registered: true})
      }
    })
  } else {
    var err = new Error('112: Not Logged In')
    err.status=401
    next(err)
  }
})

router.get('/events/:event_name/registrations', function(req, res, next) {
  if (req.session.user_data && req.session.user_data.role === "admin") {
    req.interviewDb.getRegistrations(req.params.event_name, function(err, result) {
      if(err) return next(err)
      else {
        res.send(result)
      }
    })
  } else {
    var err = new Error('113: Not Authorized')
    err.status=401
    next(err)
  }
})

router.post('/events/:event_name/approve', function(req, res, next) {
  if (!req.body.email) {
    var err = new Error('115: Insufficient Information. Empty email field')
    err.status=400
    next(err)
  } else {
    if (req.session.user_data && req.session.user_data.role === "admin") {
      req.interviewDb.acceptRegistration(req.params.event_name, req.body.email, function(err, result) {
        if(err) return next(err)
        else {
          res.send({approved: true})
        }
      })
    } else {
      var err = new Error('114: Not Authorized')
      err.status=401
      next(err)
    }
  }
})

router.get('/events/:event_name/registered', function(req, res, next) {
  req.interviewDb.getRegisteredUsers(req.params.event_name, function(err, result) {
    if(err) return next(err)
    else {
      res.send(result)
    }
  })
})

router.put('/events/:event_name/interviews', function(req, res, next) {
  if (!req.body.interviewer || !req.body.interviewee || !req.body.timestamp) {
    var err = new Error('116: Insufficient Information. Require interviewer, interviwee, timestamp')
    err.status=400
    next(err)
  } else {
    if (req.session.user_data && (req.session.user_data.role === "admin" || req.session.user_data.email === req.body.interviewer)) {
      req.interviewDb.createInterview(req.body.interviewer, req.body.interviewee, req.params.event_name, req.body.timestamp, function(err, result) {
        if(err) return next(err)
        else {
          res.send({create: true, id: result})
        }
      })
    } else {
      var err = new Error('117: Not Authorized')
      err.status=401
      next(err)
    }
  }
})

router.get('/events/:event_name/interviews/:id', function(req, res, next) {
  if (req.session.user_data) {
    req.interviewDb.getInterview(req.params.event_name, req.params.id, function(err, result) {
      if(err) return next(err)
      else {
        if (req.session.user_data.role === "admin" || req.session.user_data.email === result.interviewee || req.session.user_data.email === result.interviewer)
        res.send(result)
      }
    })
  } else {
    var err = new Error('121: Not Authorized')
    err.status=401
    next(err)
  }
})

router.patch('/events/:event_name/interviews/:id', function(req, res, next) {
  if (!req.body.timestamp && !req.body.results) {
    var err = new Error('118: Insufficient Information. Missing both timestamp and results')
    err.status=400
    next(err)
  } else {
    req.interviewDb.getInterview(req.params.id, function(err, result) {
      if(err) return next(err)
      else {
        if (req.session.user_data && (req.session.user_data.role === "admin" || req.session.user_data.email === result.interviewer)) {
          req.interviewDb.updateInterview(req.params.event_name, req.params.id, req.body.timestamp, req.body.results, function(err, result) {
            if(err) return next(err)
            else {
              res.send({updated: true})
            }
          })
        } else {
          var err = new Error('119: Not Authorized')
          err.status=401
          next(err)
        }
      }
    })
  }
})

router.get('/users/:email/interviews', function(req, res, result) {
  if (req.session.user_data && (req.session.user_data.role === "admin" || req.session.user_data.email === req.params.email)) {
    req.interviewDb.getScheduleOfUser(req.params.email, function(err, result) {
      if(err) return next(err)
      else {
        res.send(result)
      }
    })
  } else {
    var err = new Error('120: Not Authorized')
    err.status=401
    next(err)
  }
})

router.get('/events/:event_name/interviews', function(req, res, result) {
  if (req.session.user_data && req.session.user_data.role === "admin") {
    req.interviewDb.getScheduleOfEvent(req.params.event_name, function(err, result) {
      if(err) return next(err)
      else {
        res.send(result)
      }
    })
  } else {
    var err = new Error('122: Not Authorized')
    err.status=401
    next(err)
  }
})

module.exports = router
