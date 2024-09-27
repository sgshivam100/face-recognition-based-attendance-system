// studentController.js

const studentController = {};

const mysql = require("mysql");

const db=mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


studentController.getStudentProfile = (req, res) => {
    // Access student information from req.user
    const { email } = req.user;

    // Query the database to get additional student information
    db.query('SELECT name, rollno FROM studentuser WHERE email = ?', [email], (error, studentResults) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        if (studentResults.length === 0) {
            return res.status(404).send('Student not found');
        }

        const { name, rollno } = studentResults[0];

        // Query the enrolledcourse table to get the registered courses
        db.query('SELECT cname FROM enrolledcourse WHERE rollno = ?', [rollno], (error, courseResults) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            const registeredCourses = courseResults.map(course => course.cname);

            // Initialize an object to store course-wise attendance percentages
            const attendancePercentages = {};

            // Iterate over each registered course
            registeredCourses.forEach(course => {
                // Query the attendance table to get attendance entries for the current course and rollno
                db.query('SELECT COUNT(*) AS total, SUM(CASE WHEN status = "Present" THEN 1 ELSE 0 END) AS present FROM attendance WHERE rollno = ? AND cname = ?', [rollno, course], (error, attendanceResults) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).send('Internal Server Error');
                    }

                    const { total, present } = attendanceResults[0];
                    const percentage = (present / total) * 100 || 0;

                    // Store the percentage in the object
                    attendancePercentages[course] = percentage;

                    // Check if this is the last course
                    if (Object.keys(attendancePercentages).length === registeredCourses.length) {
                        console.log(attendancePercentages);
                        // Render the student profile template with student, course, and attendance information
                        res.render('student', { studentName: name, studentEmail: email, rollno: rollno, registeredCourses, attendancePercentages});
                    }
                });
            });
        });
    });
};

studentController.getCourseRegistrationPage = (req, res) => {
    // Query the database to get the list of available courses
    db.query('SELECT cname FROM courses', (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        const courses = results.map(course => course.cname);

        // Render the course registration page with the list of available courses
        res.render('course-registration', { courses });
    });
};

studentController.registerCourse = (req, res) => {
    const { course } = req.body;
    const { email } = req.user;

    // Perform the registration logic (insert into enrolledcourse table)
    db.query('INSERT INTO enrolledcourse (cname, rollno) VALUES (?, (SELECT rollno FROM studentuser WHERE email = ?))', [course, email], (error) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        // Redirect back to the student profile page after successful registration
        res.redirect('/student');
    });
};


const moment = require('moment');

// Assuming the student's roll number is stored in req.user.rollno

studentController.getAttendance = (req, res) => {
    const { course, startDate, endDate } = req.body;
    // Access student information from req.user
    const { email } = req.user;

    // Query the database to get additional student information
    db.query('SELECT name, rollno FROM studentuser WHERE email = ?', [email], (error, studentResults) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        if (studentResults.length === 0) {
            return res.status(404).send('Student not found');
        }

        const { name, rollno } = studentResults[0];

    // Query the database to get attendance data based on course, date range, and student roll number
    const query = `
        SELECT attendance_date, status
        FROM attendance
        WHERE cname = ? AND rollno = ? AND attendance_date BETWEEN ? AND ?
    `;

    db.query(query, [course, rollno, startDate, endDate], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        console.log('Result', results);

        // Organize the attendance data for rendering in the attendance view
        const organizedData = organizeAttendanceData(results,rollno);

        console.log('Organized Data:', organizedData);
        console.log("Dates:", organizedData.dates);
        console.log("Attendance Data:", organizedData.attendanceData);

        // Render the attendance view with the organized data
        console.log(course);
        console.log(rollno);
        res.render('attendance_student', { organizedData, course, rollno });

    });

});
};
// Helper function to organize attendance data for rendering


function organizeAttendanceData(attendanceData) {
    const organizedData = {
        dates: [], // Array to store unique dates
        attendanceData: [] // Array to store attendance data
    };

    // Organize data structure
    attendanceData.forEach(data => {
        const formattedDate = moment(data.attendance_date).format('YYYY-MM-DD');

        // Collect unique formatted dates
        if (!organizedData.dates.includes(formattedDate)) {
            organizedData.dates.push(formattedDate);
        }

        // Push attendance data
        organizedData.attendanceData.push({
            date: formattedDate,
            status: data.status
        });
    });

    // Sort dates in ascending order
    organizedData.dates.sort();

    return organizedData;
}


module.exports = studentController;
