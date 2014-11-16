var mongoose = require('mongoose');

var models = module.exports.models = {};
var schemes = module.exports.schemes = {};


/////////////////
// Organisation

schemes.organisation = new mongoose.Schema(
{
    id:     Number,
    name:   String
});

models.Organisation = mongoose.model('Organisation', schemes.organisation);


/////////////////
// Location

schemes.location = new mongoose.Schema(
{
    id:             Number,
    organisation:   Number,
    name:           String
});

models.Location = mongoose.model('Location', schemes.location);


/////////////////
// Attendee

schemes.attendee = new mongoose.Schema(
{
    id:             Number,
    location:       Number,
    type:           Number,
    name:           String
});

schemes.attendee.statics.TYPE_CLASS = 1;
schemes.attendee.statics.TYPE_STAFF = 2;
schemes.attendee.statics.TYPE_FACILITY = 3;

models.Attendee = mongoose.model('Attendee', schemes.attendee);


/////////////////
// DaySchedule

schemes.daySchedule = new mongoose.Schema(
{
    date:           String, // String (Mon Nov 10 2014) instead of Date because we don't want to mess
    events:                 //  with timezones - don't wanna confuse Monday 00:00 with Sunday 23:00.
    [
        {
            start:          String,
            end:            String,
            classes:        [ String ], // All attendees are stored in here for sorting
            staffs:         [ String ],
            facilities:     [ String ],
            description:    String
        }
    ]
});

schemes.daySchedule.pre('save', function (next)
{
    var needed = 0, done = 0;

    // At this point all attendees are put into events[].classes, we have
    // to cross-reference with the Attendees collection to put them in the
    // proper list.

    this.events.forEach(function (event)
    {
        if (event.classes) event.classes.forEach(function (attendee, k)
        {
            needed++;

            models.Attendee.findOne(
            {
                name: attendee
            },
            'type',
            function (err, data)
            {
                if (data.type == models.Attendee.TYPE_CLASS)
                    event.classes.push(attendee);

                if (data.type == models.Attendee.TYPE_STAFF)
                    event.staffs.push(attendee);

                done++;

                if (done >= needed) next();
            });
        }, this);

        event.classes = []; // Delete the temporary entries
    }, this);
});

models.DaySchedule = mongoose.model('DaySchedule', schemes.daySchedule);


/////////////////
// WeekSchedule

schemes.weekSchedule = new mongoose.Schema(
{
    attendee:       Number,
    week:           Number,
    year:           Number,
    days:           [ schemes.daySchedule ]
});

schemes.weekSchedule.pre('save', function (next)
{
    // Make sure this week schedule doesn't already exist

    models.WeekSchedule.remove(
    {
        attendee:   this.attendee,
        week:       this.week,
        year:       this.year
    }, function (err)
    {
        next();
    });
});

models.WeekSchedule = mongoose.model('WeekSchedule', schemes.weekSchedule);
