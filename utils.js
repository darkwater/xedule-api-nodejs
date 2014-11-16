var utils = module.exports = {};

// YYYYMMDDTHHMMSSZ -> YYYY-MM-DDTHH:MM:SSZ
utils.fixISODate = function (d)
{
    return new Date
    (
        d.substring( 0,  4) + '-' +
        d.substring( 4,  6) + '-' +
        d.substring( 6, 11) + ':' +
        d.substring(11, 13) + ':' +
        d.substring(13, 16)
    );
};

// Removes indices starting with an underscore (_) (on the original object!)
utils.removeMetadata = function (obj, stack)
{
    if (typeof(stack) != 'number') stack = 100;

    if (stack <= 0) return;

    for (var key in obj)
    {
        if (/^(_|\$)/.test(key))
        {
            delete obj[key];
            continue;
        }

        if (typeof(obj[key]) == 'object' || obj[key] instanceof Array)
        {
            utils.removeMetadata(obj[key], stack - 1);
        }
    }
};

// '0' -> '00'
utils.padZero = function (str)
{
    return (str < 10) ? '0' + str : str;
};

// Use like: mongooseResultSet.map(utils.toObject);
utils.toObject = function (v)
{
    return v.toObject();
};
