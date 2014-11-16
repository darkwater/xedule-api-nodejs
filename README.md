Unofficial Xedule API
=====================

Lists are generally, but not guaranteed, ordered by name, alphabetically.


Methods:

- /organisations.json
- /locations.#.json
- /attendees.#.json
- /weekschedule.#.json?year=####&week=##

Global parameters:

- indent=#
- reload

- - - - - - - - - - -

Methods
-------

### /organisations.json

#### Description

Gets a list of all organisations. Fetched on server startup and cannot be
manually reloaded.

#### Returned object

    [
        {
            id:     Number,     // ID as used by Xedule
            name:   String      // Name of organisation
        }
    ]

#### Example

/organisations.json

    [
        {
            "id": 6,
            "name": "Alfa - College"
        },
        {
            "id": 2,
            "name": "SiNT Lucas"
        },
        ...
    ]

- - - - - - - - - - -

### /locations.#.json

#### Description

Gets all locations of a single organisation.

#### Returned object

    [
        {
            id:     Number,     // ID of location
            name:   String      // Name of location
        }
    ]

#### Example

/locations.6.json

    [
        {
            "id": 34,
            "name": "Boumaboulevard"
        },
        {
            "id": 26,
            "name": "Hardenberg"
        },
        ...
    ]

- - - - - - - - - - -

### /attendees.#.json

#### Description

Gets all classes, staffs and facilities (classrooms etc.) for a single
location.

#### Returned object

    [
        {
            id:     Number,     // ID of attendee
            type:   Number,     // Attendee type
            name:   String      // Name of attendee
        }
    ]

#### Types

The type field is a number indicating whether the attendee is a class, staff,
or facility:

1.  Class
2.  Staff
3.  Facility

#### Example

/attendees.34.json

    [
        {
            "id": 14392,
            "name": "B-DH2-1a",
            "type": 1
        },
        {
            "id": 14368,
            "name": "ABD",
            "type": 2
        },
        {
            "id": 13476,
            "name": "BA4.34",
            "type": 3
        },
        ...
    ]

- - - - - - - - - - -

### /weekschedule.#.json

#### Description

Gets all events for one week for one attendee. The year and week parameters are
required.

The parent location MUST be requested at least once before or else all staffs
will be treated like classes. This is because in the source .ics file the
parser uses, they're both treated as attendees. Therefore we need a list of all
attendees and their types to check which is which.

#### Returned object

    [
        {
            date:           String,
            events:
            [
                {
                    start:          String,
                    end:            String,
                    classes:        [ String ],
                    staffs:         [ String ],
                    facilities:     [ String ],
                    description:    String
                }
            ]
        }
    ]

#### Example

/weekschedule.14293.json?year=2014&week=46

    [
        {
            "date": "Mon Nov 10 2014",
            "events":
            [
                {
                    "start": "8:30",
                    "end": "10:00",
                    "description": "rek",
                    "facilities":
                    [
                        "BA6.34"
                    ],
                    "staffs":
                    [
                        "HOD"
                    ],
                    "classes":
                    [
                        "B-ITA4-3a",
                        "B-ITB4-3a"
                    ]
                },
                ...
            ]
        },
        ...
    ]
