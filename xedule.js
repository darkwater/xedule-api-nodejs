var express  = require('express');
var app      = express();
var server   = require('http').createServer(app);

var fs       = require('fs');
var mongoose = require('mongoose');
var markdown = require('markdown').markdown;

var fetch    = require('./fetch.js');
var objects  = require('./objects.js');
var utils    = require('./utils.js');


mongoose.connect('mongodb://localhost:2710/xedule');

app.set('trust proxy', true);


fetch.organisations();


var sockpath = __dirname + '/http.sock';
fs.unlink(sockpath, function ()
{
    app.listen(sockpath);
    fs.chmod(sockpath, 0775);
});

app.use('*', function (req, res, next)
{
    // Log all the requests!
    console.log(new Date(), req.ip, req.originalUrl);

    // Allow requests from other origins
    res.set("Access-Control-Allow-Origin", "*");

    // Set empty arguments to true so you can just do things like ?reload
    for (var key in req.query) if (req.query[key] === '') req.query[key] = true;

    // Sanitize optional indent parameter to 0-8
    if (req.query.indent) req.query.indent = Math.min(Math.abs(Number(req.query.indent)), 8);

    // Alias refresh to reload
    if (req.query.refresh) req.query.reload = true;

    next();
});

app.get('/', function (req, res)
{
    if (req.query.html)
        fs.readFile(__dirname + '/README.md', function (err, data)
        {
            res.status(200).end(markdown.toHTML(data.toString()));
        });

    else res.sendFile(__dirname + '/README.md');
});

app.get('/organisations.json', function (req, res)
{
    objects.models.Organisation.find(function (err, organisations)
    {
        if (err) throw err;

        var out = organisations.map(utils.toObject);

        utils.removeMetadata(out);

        res.end(JSON.stringify(out, null, req.query.indent));
    });
});

app.route('/locations.:org.json')
.get(function (req, res, next)
{
    if (req.query.reload)
    {
        // User requested a reload of this data
        // TODO: Rate-limit these requests

        fetch.locations(req.params.org, function (locations)
        {
            req.locations = locations;
            next();
        });
    }
    else
    {
        objects.models.Location.find(
        {
            organisation: req.params.org
        },
        'id name weeks',
        function (err, locations)
        {
            if (err) throw err; // TODO: Catch errors like these

            if (locations.length <= 0)
            {
                // No data found, fetch it.
                // TODO: On first request, entire documents (id, name, organisation)
                //  are returned instead of just the selected fields (id, name)

                fetch.locations(req.params.org, function (locations)
                {
                    req.locations = locations;
                    next();
                });
            }
            else
            {
                // Send known data

                req.locations = locations.map(utils.toObject);
                next();
            }
        });
    }
})
.get(function (req, res)
{
    var out = req.locations;

    utils.removeMetadata(out);

    res.end(JSON.stringify(out, null, req.query.indent));
});

app.route('/attendees.:loc.json')
.get(function (req, res, next)
{
    if (req.query.reload)
    {
        fetch.attendees(req.params.loc, function (attendees)
        {
            req.attendees = attendees;
            next();
        });
    }
    else
    {
        objects.models.Attendee.find(
        {
            location: req.params.loc
        },
        'id name type',
        function (err, attendees)
        {
            if (err) throw err;

            if (attendees.length <= 0)
            {
                fetch.attendees(req.params.loc, function (attendees)
                {
                    req.attendees = attendees;
                    next();
                });
            }
            else
            {
                req.attendees = attendees.map(utils.toObject);
                next();
            }
        });
    }
})
.get(function (req, res)
{
    var out = req.attendees;

    utils.removeMetadata(out);

    res.end(JSON.stringify(out, null, req.query.indent));
});

app.route('/weekschedule.:attendee.json')
.get(function (req, res, next)
{
    if (req.query.reload)
    {
        fetch.schedule(req.params.attendee, req.query.year, req.query.week, function (schedule)
        {
            req.schedule = schedule;
            next();
        });
    }
    else
    {
        objects.models.WeekSchedule.findOne(
        {
            attendee: req.params.attendee,
            year: req.query.year,
            week: req.query.week
        },
        function (err, schedule)
        {
            if (err) throw err;

            if (!schedule)
            {
                fetch.schedule(req.params.attendee, req.query.year, req.query.week, function (schedule)
                {
                    req.schedule = schedule.toObject();
                    next();
                });
            }
            else
            {
                req.schedule = schedule.toObject();
                next();
            }
        });
    }
})
.get(function (req, res)
{
    var out = req.schedule.days;

    utils.removeMetadata(out);

    res.end(JSON.stringify(out, null, req.query.indent));
});


app.use(express.static(__dirname + '/static'));
