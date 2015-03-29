var pg = require('pg')
var async = require('async')
var bcrypt = require('bcrypt')

var conString = "postgres://sengroup@localhost/senproj"

var initializeDb = function initializeDb(callback) {
  var client, release_client
  async.waterfall([
    function(callback) {
      pg.connect(conString, callback)
    },
    function(cl, done, callback) {
      client = cl
      release_client = done

      client.query('\
        CREATE TABLE IF NOT EXISTS events (\
            name text PRIMARY KEY,\
            criteria jsonb NOT NULL,\
            details jsonb\
        );\
      ', callback)
    },
    function(result, callback) {
      client.query('\
        CREATE TABLE IF NOT EXISTS people (\
            email text PRIMARY KEY,\
            password text NOT NULL,\
            role text NOT NULL,\
            details jsonb\
        );\
      ', callback)
    },
    function(result, callback) {
      client.query('\
        CREATE TABLE IF NOT EXISTS registered (\
            email text,\
            event text,\
            FOREIGN KEY (email) REFERENCES people\
            ON DELETE CASCADE,\
            FOREIGN KEY (event) REFERENCES events\
            ON DELETE CASCADE,\
            PRIMARY KEY (email, event)\
        );\
      ', callback)
    },
    function(result, callback) {
      client.query('\
        CREATE TABLE IF NOT EXISTS registerforevent (\
            email text,\
            event text,\
            FOREIGN KEY (email) REFERENCES people\
            ON DELETE CASCADE,\
            FOREIGN KEY (event) REFERENCES events\
            ON DELETE CASCADE,\
            PRIMARY KEY (email, event)\
        );\
      ', callback)
    },
    function(result, callback) {
      client.query('\
        CREATE TABLE IF NOT EXISTS interviews (\
            id serial,\
            interviewer text,\
            interviewee text,\
            event text,\
            time timestamp with time zone,\
            results jsonb,\
            FOREIGN KEY (interviewer) REFERENCES people\
            ON DELETE CASCADE,\
            FOREIGN KEY (interviewee) REFERENCES people\
            ON DELETE CASCADE,\
            FOREIGN KEY (event) REFERENCES events\
            ON DELETE CASCADE,\
            PRIMARY KEY (event, id)\
        );\
      ', callback)
    },
    function(result, callback) {
      release_client()
      callback()
    }
  ], callback)
}

var getInterviewDb = function getInterviewDb(callback) {
  var interviewDb = {}

  interviewDb.createEvent = function createEvent(event_name, criteria, details, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          INSERT INTO events (name, criteria, details) VALUES ($1, $2, $3);\
        ', [event_name, criteria, details], callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('003: Event already exists'))
      } else {
        callback()
      }
    })
  }

  interviewDb.getEvents = function getEvents(callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT array_agg(name) FROM events; \
        ', callback)
      },
      function(result, callback) {
        release_client()
        callback(null, result.rows[0].array_agg)
      }
    ], callback)
  }

  interviewDb.getEvent = function getEvent(event_name, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT * FROM events WHERE name=$1; \
        ', [event_name], callback)
      },
      function(result, callback) {
        release_client()
        if (result.rows.length == 1) {
          callback(null, result.rows[0])
        } else {
          callback(new Error('002:Event does not exist'))
        }
      }
    ], callback)
  }

  interviewDb.updateEvent = function updateEvent(event_name, criteria, details, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          UPDATE events SET (criteria, details)=($2, $3) WHERE name=$1\
        ', [event_name, criteria, details], callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('011: Unable to update'))
      } else {
        callback()
      }
    })
  }

  interviewDb.deleteEvent = function deleteEvent(event_name, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          DELETE FROM events WHERE name=$1; \
        ', [event_name], callback)
      },
      function(result, callback) {
        release_client()
        if(result.rowCount == 1) {
          callback(null)
        } else {
          callback(new Error('001:Event does not exist'))
        }
      }
    ], callback)
  }

  interviewDb.createUser = function createUser(email, password, role, details, callback) {
    var client, release_client, hashed_password
    async.waterfall([
      function(callback) {
        bcrypt.hash(password, 8, callback)
      },
      function(hashed_password_temp, callback) {
        hashed_password = hashed_password_temp
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          INSERT INTO people (email, password, role, details) VALUES ($1, $2, $3, $4);\
        ', [email, hashed_password, role, details], callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('004: Account already exists'))
      } else {
        callback()
      }
    })
  }

  interviewDb.authenticateUser = function authenticateUser(email, password, callback) {
    var client, release_client, user_data
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT * FROM people WHERE email=$1; \
        ', [email], callback)
      },
      function(result, callback) {
        release_client()
        if (result.rows.length == 1) {
          user_data = result.rows[0]
          var original_password = user_data.password
          delete user_data.password
          bcrypt.compare(password, original_password, callback)
        } else {
          callback(new Error('005:Account does not exist'))
        }
      },
      function(result, callback) {
        if (result) {
          callback(null, user_data)
        } else {
          callback(null, false)
        }
      }
    ], callback)
  }

  interviewDb.getUser = function getUser(email, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT * FROM people WHERE email=$1; \
        ', [email], callback)
      },
      function(result, callback) {
        release_client()
        if (result.rows.length == 1) {
          callback(null, result.rows[0])
        } else {
          callback(new Error('005:Account does not exist'))
        }
      }
    ], callback)
  }

  interviewDb.updateUser = function updateUser(email, details, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          UPDATE people SET (details)=($2) WHERE email=$1\
        ', [email, details], callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('010: Unable to update'))
      } else {
        callback()
      }
    })
  }

  interviewDb.registerForEvent = function registerForEvent(email, event, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          INSERT INTO registerforevent (email, event) VALUES ($1, $2);\
        ', [email, event], callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('006: Already Registered'))
      } else {
        callback()
      }
    })
  }

  interviewDb.getRegistrations = function getRegistrations(event_name, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT array_agg(email) FROM registerforevent WHERE event=$1; \
        ', [event_name], callback)
      },
      function(result, callback) {
        release_client()
        callback(null, result.rows[0].array_agg)
      }
    ], callback)
  }

  interviewDb.acceptRegistration = function acceptRegistration(event_name, email, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          BEGIN;\
        ', callback)
      },
      function(result, callback) {
        client.query('\
          INSERT INTO registered (email, event) VALUES ($1, $2);\
        ', [email, event_name], callback)
      },
      function(result, callback) {
        client.query('\
          DELETE FROM registerforevent WHERE email=$1 AND event=$2;\
        ', [email, event_name], callback)
      },
      function(result, callback) {
        client.query('\
          COMMIT;\
        ', callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('007: Already Registered'))
      } else {
        callback()
      }
    })
  }

  interviewDb.getRegisteredUsers = function getRegisteredUsers(event_name, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT array_agg(email) FROM registered WHERE event=$1; \
        ', [event_name], callback)
      },
      function(result, callback) {
        release_client()
        callback(null, result.rows[0].array_agg)
      }
    ], callback)
  }

  interviewDb.createInterview = function createInterview(interviewer, interviewee, event_name, timestamp, callback) {
    var client, release_client, interview_id
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          BEGIN;\
        ', callback)
      },
      function(result, callback) {
        client.query('\
          SELECT * FROM registered WHERE email=$1 AND event=$2;\
        ', [interviewer, event_name], callback)
      },
      function(result, callback) {
        if (result.rows.length !== 1) {
          callback(new Error('008: Interviewer has not registered for this event'))
        } else {
          client.query('\
            SELECT * FROM registered WHERE email=$1 AND event=$2;\
          ', [interviewee, event_name], callback)
        }
      },
      function(result, callback) {
        if (result.rows.length !== 1) {
          callback(new Error('008: Interviewer has not registered for this event'))
        } else {
          client.query('\
            INSERT INTO interviews (interviewer, interviewee, event, time) VALUES ($1, $2, $3, $4) RETURNING id;\
          ', [interviewer, interviewee, event_name, timestamp], callback)
        }
      },
      function(result, callback) {
        interview_id = result.rows[0].id;
        client.query('\
          COMMIT;\
        ', callback)
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], function(err) {
      if (err) {
        console.log(err)
        callback(new Error('007: Unable to schedule the interview'))
      } else {
        callback(null, interview_id)
      }
    })
  }

  interviewDb.updateInterview = function updateInterview(event_name, id, timestamp, results, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        if(timestamp) {
          client.query('\
            UPDATE interviews SET (time, results)=($1, $2) WHERE event=$3 AND id=$4\
          ', [timestamp, results, event_name, id], callback)
        } else {
          client.query('\
            UPDATE interviews SET (results)=($1) WHERE event=$2 AND id=$3\
          ', [results, event_name, id], callback)
        }
      },
      function(result, callback) {
        release_client()
        callback()
      }
    ], callback)
  }

  interviewDb.getInterview = function getInterview(event_name, id, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT * FROM interviews WHERE event=$1 AND id=$2; \
        ', [event_name, id], callback)
      },
      function(result, callback) {
        release_client()
        if (result.rows.length == 1) {
          callback(null, result.rows[0])
        } else {
          callback(new Error('012: Interview does not exist'))
        }
      }
    ], callback)
  }

  interviewDb.deleteInterview = function deleteInterview(event_name, id, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          DELETE FROM interviews WHERE event=$1 AND id=$2; \
        ', [event_name, id], callback)
      },
      function(result, callback) {
        release_client()
        if(result.rowCount == 1) {
          callback(null)
        } else {
          callback(new Error('008:Interview does not exist'))
        }
      }
    ], callback)
  }

  interviewDb.getScheduleOfUser = function getScheduleOfUser(email, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT * FROM interviews WHERE interviewer=$1 OR interviewee=$1; \
        ', [email], callback)
      },
      function(result, callback) {
        release_client()
        callback(null, result.rows)
      }
    ], callback)
  }

  interviewDb.getScheduleOfEvent = function getScheduleOfEvent(event_name, callback) {
    var client, release_client
    async.waterfall([
      function(callback) {
        pg.connect(conString, callback)
      },
      function(cl, done, callback) {
        client = cl
        release_client = done

        client.query('\
          SELECT * FROM interviews WHERE event=$1; \
        ', [event_name], callback)
      },
      function(result, callback) {
        release_client()
        callback(null, result.rows)
      }
    ], callback)
  }

  initializeDb(function(err) {
    if (err) {
      callback(err)
    } else {
      callback(null, interviewDb)
    }
  })
}

module.exports = getInterviewDb