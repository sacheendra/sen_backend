var assert = require('assert')
var pg = require('pg')
var async = require('async')
var bcrypt = require('bcrypt')

var conString = "postgres://sengroup@localhost/senproj"

var interviewDbFactory = require(__dirname + '/../interviewdb')

var destroyDb = function destroyDb(callback) {
    var client, release_client
    async.waterfall([
        function(callback) {
            pg.connect(conString, callback)
        },
        function(cl, done, callback) {
            client = cl
            release_client = done

            client.query('\
                DROP TABLE events CASCADE;\
            ', callback)
        },
        function(result, callback) {
            client.query('\
                DROP TABLE people CASCADE;\
            ', callback)
        },
        function(result, callback) {
            client.query('\
                DROP TABLE registered CASCADE;\
            ', callback)
        },
        function(result, callback) {
            client.query('\
                DROP TABLE registerforevent CASCADE;\
            ', callback)
        },
        function(result, callback) {
            client.query('\
                DROP TABLE interviews CASCADE;\
            ', callback)
        }
    ], callback)
}

describe('interviewDb', function() {
    describe('#interviewDbFactory', function() {
        it('should not return error', interviewDbFactory)
    })
})

describe('interviewDb', function() {
    var interviewDb

    before(function(done) {
        interviewDbFactory(function(err, interviewDb_temp) {
            if (err) return done(err)
            interviewDb = interviewDb_temp
            done()
        })
    })

    after(destroyDb)

    describe('#createEvent', function() {
        it('should not return error', function(done) {
            interviewDb.createEvent('event1', {}, {}, done)
        })
        it('should not return error', function(done) {
            interviewDb.createEvent('event2', {}, {}, done)
        })
    })

    describe('#getEvents', function() {
        it('should return ["event1"]', function(done) {
            interviewDb.getEvents(function(err, events) {
                assert.deepEqual(events, ["event1", "event2"])
                done()
            })
        })
    })

    describe('#getEvent', function() {
        it('should return an event object', function(done) {
            interviewDb.getEvent('event1', function(err, event) {
                assert.deepEqual(event, { name: 'event1', criteria: {}, details: {} })
                done()
            })
        })
    })

    describe('#deleteEvent', function() {
        it('should delete an event', function(done) {
            interviewDb.deleteEvent('event1', done)
        })
    })

    describe('#createUser', function() {
        it('should not return error', function(done) {
            interviewDb.createUser('abc@def.com', 'password', 'interviewee', {}, done)
        })
        it('should not return error', function(done) {
            interviewDb.createUser('ijk@xyz.com', 'password', 'interviewer', {}, done)
        })
    })

    describe('#getUser', function() {
        it('should return a user object', function(done) {
            interviewDb.getUser('abc@def.com', function(err, user) {
                var password_match = bcrypt.compareSync('password', user.password)
                assert.deepEqual(password_match, true)

                delete user.password
                assert.deepEqual(user, { email: 'abc@def.com', role: 'interviewee', details: {} })
                done()
            })
        })
    })

    describe('#registerForEvent', function() {
        it('should not return error', function(done) {
            interviewDb.registerForEvent('abc@def.com', 'event2', done)
        })
        it('should not return error', function(done) {
            interviewDb.registerForEvent('ijk@xyz.com', 'event2', done)
        })
    })

    describe('#getRegistrations', function() {
        it('should return 1 registration', function(done) {
            interviewDb.getRegistrations('event2', function(err, registrations) {
                assert.deepEqual(registrations, ["abc@def.com", "ijk@xyz.com"])
                done()
            })
        })
    })

    describe('#acceptRegistration', function() {
        it('should accept 1 registration', function(done) {
            interviewDb.acceptRegistration('event2', 'abc@def.com', done)
        })
        it('should accept 1 registration', function(done) {
            interviewDb.acceptRegistration('event2', 'ijk@xyz.com', done)
        })
    })

    describe('#getRegisteredUsers', function() {
        it('should return 2 registration', function(done) {
            interviewDb.getRegisteredUsers('event2', function(err, registrations) {
                assert.deepEqual(registrations, ["abc@def.com", "ijk@xyz.com"])
                done()
            })
        })
    })

    describe('#createInterview', function() {
        it('should not return error', function(done) {
            interviewDb.createInterview('abc@def.com', 'ijk@xyz.com', 'event2', (new Date()).toISOString(), done)
        })
    })

})