// facultyController.js

const facultyController = {};

const mysql = require("mysql");
const moment = require('moment');


const db=mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


facultyController.getFacultyProfile = (req, res) => {
    // Access faculty information from req.user
    const { email } = req.user;

    // Retrieve the success message from req.flash
    const successMessage = req.flash('successMessage')[0];

    // Retrieve attendance data from query parameters
    const attendanceData = req.query.attendanceData ? JSON.parse(req.query.attendanceData) : [];

    // Query the database to get additional faculty information
    db.query('SELECT name, facultyid FROM facultyuser WHERE email = ?', [email], (error, facultyResults) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        if (facultyResults.length === 0) {
            return res.status(404).send('Faculty not found');
        }

        const { name, facultyid } = facultyResults[0];

        // Query the database to get the courses taught by the faculty
        db.query('SELECT cname FROM courses WHERE facultyid = ?', [facultyid], (error, courseResults) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            const coursesTaught = courseResults.map(course => course.cname);
            console.log(attendanceData);

            // Render the faculty profile template with faculty information, courses taught, attendance data, and flash messages
            res.render('faculty', { facultyName: name, facultyEmail: email, facultyID: facultyid, coursesTaught, successMessage, attendanceData });
        });
    });
};



// facultyController.js

facultyController.getAttendance = (req, res) => {
    const { course, startDate, endDate } = req.body;

    // Query the database to get attendance data based on course and date range
    const query = `
        SELECT rollno, attendance_date, status
        FROM attendance
        WHERE cname = ? AND attendance_date BETWEEN ? AND ?
    `;

    db.query(query, [course, startDate, endDate], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        console.log('Result',results );

        // Organize the attendance data for rendering in the attendance view
        const organizedData = organizeAttendanceData(results);

        console.log('Organized Data:', organizedData);
        console.log("Dates:", organizedData.dates);
        console.log("Attendance Data:", organizedData.attendanceDataByRollNo);


        // Render the attendance view with the organized data
        res.render('attendance', { organizedData });
    });
};

// Helper function to organize attendance data for rendering


function organizeAttendanceData(attendanceData) {
    const organizedData = {
        dates: [], // Array to store unique dates
        attendanceDataByRollNo: {} // Object to organize attendance data by roll number
    };

    // Organize data structure
    attendanceData.forEach(data => {
        const formattedDate = moment(data.attendance_date).format('YYYY-MM-DD');

        // Collect unique formatted dates
        if (!organizedData.dates.includes(formattedDate)) {
            organizedData.dates.push(formattedDate);
        }

        // Organize attendance data by roll number
        if (!organizedData.attendanceDataByRollNo[data.rollno]) {
            organizedData.attendanceDataByRollNo[data.rollno] = [];
        }

        organizedData.attendanceDataByRollNo[data.rollno].push({
            date: formattedDate,
            status: data.status
        });
    });

    // Sort dates in ascending order
    organizedData.dates.sort();

    return organizedData;
}

// Function to handle file upload and save file paths in the database
facultyController.handleFileUpload = async (courseName, date, imagePaths) => {
    const insertQuery = 'INSERT INTO faculty_images (cname, date, image_path) VALUES (?, ?, ?)';

    // Insert each image path into the database
    for (const imagePath of imagePaths) {
        await new Promise((resolve, reject) => {
            db.query(insertQuery, [courseName, date, imagePath], (error, results) => {
                if (error) {
                    console.error('Error inserting image path into database:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }
};

module.exports = facultyController;
