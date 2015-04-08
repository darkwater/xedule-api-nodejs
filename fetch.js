var https   = require('https');
var qs      = require('querystring');

var objects = require('./objects.js');
var utils   = require('./utils.js');

var fetch = module.exports = {};

fetch.page = function (path, callback)
{
    var req = https.request(
    {
        hostname: 'summacollege.xedule.nl',
        path: path,
        method: 'GET'
    },
    function (res)
    {
        var data = '';

        res.on('data', function (_d)
        {
            data += _d;
        });

        res.on('end', function ()
        {
            callback(data);
        });
    });

    req.end();

    req.on('error', function (err)
    {
        console.error(err);
    });
};

fetch.organisations = function ()
{
    fetch.page('/', function (page)
    {
        var results;
        var regex = /.Organisatie.OrganisatorischeEenheid.([0-9]+)\?Code=([^"]+)/g;

        var saveObjCallback = function (err, obj)
        {
            if (err) throw err;

            obj.save();
        };

        while ((results = regex.exec(page)) !== null)
        {
            objects.models.Organisation.findOneAndUpdate(
                { id: results[1] },
                {
                    id: results[1],
                    name: qs.unescape(results[2])
                },
                { upsert: true },
                saveObjCallback);
        }
    });
};

fetch.locations = function (organisationId, callback)
{
    fetch.page('/Organisatie/OrganisatorischeEenheid/' + organisationId, function (page)
    {
        var results;
        var regex = /.OrganisatorischeEenheid.Attendees.([0-9]+)\?Code=([^&]+)/g;

        var locations = [];
        var count = 0;

        var saveObjCallback = function (err, obj)
        {
            if (err) throw err;

            obj.save(function (err)
            {
                if (err) throw err;

                count--;

                if (count <= 0)
                    callback(locations);
            });
        };

        while ((results = regex.exec(page)) !== null)
        {
            count++;

            var location =
            {
                id: results[1],
                name: qs.unescape(results[2]),
                organisation: organisationId,
                weeks: []
            };

            locations.push(location);

            objects.models.Location.findOneAndUpdate(
                { id: location.id },
                location,
                { upsert: true },
                saveObjCallback);
        }

        if (count <= 0)
        {
            callback([]);
        }
    });
};

fetch.attendees = function (locationId, callback)
{
    var needToGetWeeks = false;
    var nowGettingWeeks = false;

    objects.models.Location.findOne({ id: locationId }, function (err, loc)
    {
        if (loc.weeks.length == 0)
        {
            needToGetWeeks = true;
        }
    });

    fetch.page('/OrganisatorischeEenheid/Attendees/' + locationId, function (page)
    {
        var results;           //      1: URL, ,2: Attendee id ,3: Name          ,4: Type
        var regex = new RegExp('option value="(([0-9]+)\\?Code=([^&]+)&amp;attId=([1-3])&amp;OreId=' + locationId + ')"', 'g');

        var attendees = [];
        var count = 0;

        var saveObjCallback = function (err, obj)
        {
            if (err) throw err;

            obj.save(function (err)
            {
                if (err) throw err;

                count--;

                if (count <= 0)
                    callback(attendees);
            });
        };

        while ((results = regex.exec(page)) !== null)
        {
            count++;

            if (needToGetWeeks && !nowGettingWeeks)
            {
                nowGettingWeeks = true;

                fetch.page('/Attendee/ScheduleCurrent/' + results[1].replace(/&amp;/g, '&'), function (attpage)
                {
                    var regex = /<option( selected="selected")? value="(20[0-9]{2}\/[0-9]{1,2})">/g;
                    var weeks = [];

                    while ((results = regex.exec(attpage)) !== null)
                    {
                        weeks.push(results[2]);
                    }

                    console.log(weeks);

                    objects.models.Location.findOneAndUpdate(
                        { id: locationId },
                        { $set: { weeks: weeks } }).exec();
                });
            }

            var attendee =
            {
                id: results[2],
                name: qs.unescape(results[3]),
                location: locationId,
                type: results[4]
            };

            attendees.push(attendee);

            objects.models.Attendee.findOneAndUpdate(
                { id: attendee.id },
                attendee,
                { upsert: true },
                saveObjCallback);
        }

        if (count <= 0)
        {
            callback([]);
        }
    });
};

fetch.schedule = function (attendeeId, year, week, callback)
{
    fetch.page('/Calendar/iCalendarICS/' + attendeeId + '?year=' + year + '&week=' + week, function (agenda)
    {
        var lines = agenda.split('\r\n');
        var curevent, days = [];

        lines.forEach(function (line)
        {
            if (line == 'BEGIN:VEVENT')
            {
                curevent = {};
            }
            else if (line == 'END:VEVENT')
            {
                var start = utils.fixISODate(curevent.dtstart);
                var end   = utils.fixISODate(curevent.dtend);

                var day = start.getDay() - 1 % 7; // Shift sunday - saturday to monday - sunday (SMTWTFS to MTWTFSS)
                if (!days[day])
                    days[day] =
                    {
                        date: start.toDateString(),
                        events: []
                    };

                if (curevent.attendees == null) curevent.attendees = [];
                if (curevent.location.length >= 1) curevent.attendees = curevent.attendees.concat(curevent.location.split('\\, '));

                var eventObj =
                {
                    start: start.getHours() + ':' + utils.padZero(start.getMinutes()),
                    end: end.getHours() + ':' + utils.padZero(end.getMinutes()),
                    classes: curevent.attendees,
                    description: curevent.summary
                };

                days[day].events.push(eventObj);

                curevent = null;
            }
            else if (curevent)
            {
                line = line.split(':');
                var key = line[0], value = line[1];

                if (key.substring(0, 8) == 'ATTENDEE')
                {
                    if (!curevent.attendees) curevent.attendees = [];
                    var name = key.substring(12);
                    name = name.replace(/^"|"$/g, ''); // fuck off stenden
                    curevent.attendees.push(name);
                }
                else curevent[key.toLowerCase()] = value;
            }
        });

        days.forEach(function (day)
        {
            day.events.sort(function (a, b)
            {
                return a.start.replace(':', '') - b.start.replace(':', '');
            });
        });

        var schedule =
        {
            attendee: attendeeId,
            week: week,
            year: year,
            days: days
        };

        new objects.models.WeekSchedule(schedule).save(function (err, fuck)
        {
            callback(schedule);
        });
    });
};
