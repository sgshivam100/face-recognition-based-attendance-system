const express = require("express");
const mysql = require("mysql");

const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');
const facultyController = require('../controllers/facultyController');
const studentController = require('../controllers/studentController');

router.get('/',(req,res) => {
    res.render("index");
});

router.get('/register',(req,res) => {
    res.render("register");
});

router.get('/login',(req,res) => {
    res.render("login");
});

// Protected routes
router.get('/faculty', verifyToken, facultyController.getFacultyProfile);

router.get('/student', verifyToken, studentController.getStudentProfile);

router.get('/register-course', verifyToken, studentController.getCourseRegistrationPage);
router.post('/register-course', verifyToken, studentController.registerCourse);
// Route for handling the form submission to get attendance
router.post('/get-attendance', verifyToken, facultyController.getAttendance);
router.post('/get-attendance-student', verifyToken, studentController.getAttendance);

// router.post('/upload_attendance_images', verifyToken, facultyController.uploadAttendanceImages);

const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Set the destination folder dynamically based on the course name
        const courseName = req.body.uploadCourse;
        const uploadPath = path.join(__dirname, `../images/faculty_images/${courseName}`);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Set the filename dynamically based on the date and original filename
        const date = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
        const fileName = `${date}_${file.originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });
const axios = require('axios');
// Route to handle form submission and file upload
const db=mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});
function filterAndSort(jsonArray, key) {
    const uniqueObjects = [];
    const encounteredKeys = new Set();

    // Sort the array based on the specified key
    const sortedArray = jsonArray.sort((a, b) => a[key].localeCompare(b[key]));

    for (const obj of sortedArray) {
        const keyValue = obj[key];

        if (!encounteredKeys.has(keyValue)) {
            uniqueObjects.push(obj);
            encounteredKeys.add(keyValue);
        }
    }

    return uniqueObjects;
}

router.post('/upload_attendance_images', upload.array('imageUpload', 4), async (req, res) => {
    const courseName = req.body.uploadCourse;
    const date = new Date().toISOString().slice(0, 10);
    const imagePaths = req.files.map(file => path.join(`faculty_images/${courseName}`, file.filename));

    try {
        // Call the function in facultyController to handle file paths
        await facultyController.handleFileUpload(courseName, date, imagePaths);

        // Make a POST request to the Flask API
        const flaskApiUrl = 'http://127.0.0.1:5000/detect_faces'; //  Flask API URL
        const response = await axios.post(flaskApiUrl, {});

        // Assuming the Flask API returns attendance data in the response
         attendanceData = response.data;

        // Extract roll numbers from attendanceData
        //  attendanceData = [
        //     { name: '2101AI34', status: 'Present' },
        //     { name: '2101AI08', status: 'Present' },
        //     { name: '2101AI01', status: 'Present' },
        //     { name: '2101AI08', status: 'Present' },
        //     { name: '2101AI30', status: 'Present' }
        // ];
        const uniqueAttendanceData = filterAndSort(attendanceData, 'name')
        attendanceData=uniqueAttendanceData;

        const rollNumbers = attendanceData.map(entry => entry.name);

        // Retrieve all enrolled roll numbers for the specified course
        const enrolledRollNumbersQuery = `SELECT rollno FROM enrolledcourse WHERE cname = ?`;
        db.query(enrolledRollNumbersQuery, [courseName], (err, results) => {
            if (err) {
                console.error('Error retrieving enrolled roll numbers:', err);
                // Handle the error and redirect to /faculty
                req.flash('errorMessage', 'Error retrieving enrolled roll numbers');
                res.redirect('/faculty');
            } else {
                const enrolledRollNumbersArray = results.map(entry => entry.rollno);
                console.log(enrolledRollNumbersArray);

                // Iterate through enrolled roll numbers and update the attendance table
                for (const rollno of enrolledRollNumbersArray) {
                    const status = rollNumbers.includes(rollno) ? 'Present' : 'Absent';

                    // Update or insert into the attendance table
                    const updateAttendanceQuery = `
                        INSERT INTO attendance (rollno, cname, attendance_date, status)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE status = VALUES(status)
                    `;
                    db.query(updateAttendanceQuery, [rollno, courseName, date, status], (err, results) => {
                        if (err) {
                            console.error('Error updating attendance:', err);
                            // Handle the error and redirect to /faculty
                            req.flash('errorMessage', 'Error updating attendance');
                            res.redirect('/faculty');
                        }
                    });
                }

                // Set success message using req.flash
                req.flash('successMessage', 'Files uploaded successfully & attendance recorded');

                // Redirect to /faculty
                
                res.redirect(`/faculty?attendanceData=${encodeURIComponent(JSON.stringify(attendanceData))}`);
            
            }
        });
    } catch (error) {
        // Handle any errors, e.g., database error
        console.error('Error handling file upload:', error);
        req.flash('errorMessage', 'Error uploading files');
        // Redirect to /faculty in case of an error
        res.redirect('/faculty');
    }
});




 
// Example logout route using express-session
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/');
        }
    });
});



module.exports = router;