const express = require("express");
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require("path");
const mysql = require("mysql");

const app = express();
const dotenv = require("dotenv");

const flash = require('connect-flash');



dotenv.config({ path: "./.env" });

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

app.use('/styles', express.static(path.join(__dirname, 'public/styles')));
app.use('/scripts', express.static(path.join(__dirname, 'public/scripts')));


const hbs = exphbs.create({
    // ... your existing configuration
    helpers: {
        getAttendance: function(rollNo, date, options) {
            console.log("Roll No:", rollNo);
            console.log("Date:", date);
            
            // const attendanceData = options.data.root.organizedData.attendanceDataByRollNo[rollNo];
            
            // // Check if attendanceData is an array
            // if (Array.isArray(attendanceData)) {
            //     const attendance = attendanceData.find(entry => entry.date === date);
            //     return attendance ? (attendance.status === 'Present' ? 'P' : (attendance.status === 'Absent' ? 'A' : 'L')) : '';
            // }

            // return ''; // Return an empty string if attendanceData is not an array
        },
         
            jsonStringify: (data) => JSON.stringify(data)
            // other helpers...
            ,
            isEqual: function (a, b, options) {
                return a === b ? options.fn(this) : options.inverse(this);
            },
            inc: function (value, options) {
                return parseInt(value) + 1;
            }

        
    }
});


// parse URL-encoded bodies(as Sent by HTML forms)
app.set("view engine", "hbs");

// Register Handlebars as the view engine
app.engine('hbs', hbs.engine);

db.connect((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Mysql Connected");
    }
});

// Define routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

app.listen(8080, () => {
    console.log("Server started on port 8080");
});
