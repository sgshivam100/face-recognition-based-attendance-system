const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db=mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


exports.register = (req, res) => {
    const { name, email, password, passwordConfirm, userType, facultyId, rollNo } = req.body;

    // Function to check if email exists in either studentuser or facultyuser table
    const checkEmailExists = () => {
        return new Promise((resolve, reject) => {
            db.query('SELECT email FROM studentuser WHERE email=?', [email], (error, studentResults) => {
                if (error) {
                    reject(error);
                }

                db.query('SELECT email FROM facultyuser WHERE email=?', [email], (error, facultyResults) => {
                    if (error) {
                        reject(error);
                    }

                    if (studentResults.length > 0 || facultyResults.length > 0) {
                        // Email already exists
                        resolve(true);
                    } else {
                        // Email does not exist
                        resolve(false);
                    }
                });
            });
        });
    };

    checkEmailExists().then((emailExists) => {
        if (emailExists) {
            return res.render('register', {
                message: 'That email is already in use'
            });
        } else if (password !== passwordConfirm) {
            return res.render('register', {
                message: 'Passwords do not match'
            });
        }

        let hashedPassword;

        // Insert data based on user type
        if (userType === 'faculty') {
            hashedPassword = bcrypt.hashSync(password, 8);
            db.query('INSERT INTO facultyuser SET ?', { facultyid: facultyId, name, email, password: hashedPassword }, (error, results) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(results);
                    return res.render('register', {
                        message: 'Faculty registered successfully'
                    });
                }
            });
        } else if (userType === 'student') {
            hashedPassword = bcrypt.hashSync(password, 8);
            db.query('INSERT INTO studentuser SET ?', { rollno: rollNo, name, email, password: hashedPassword }, (error, results) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(results);
                    return res.render('register', {
                        message: 'Student registered successfully'
                    });
                }
            });
        } else {
            return res.render('register', {
                message: 'Invalid user type'
            });
        }
    }).catch((error) => {
        console.log(error);
        return res.render('register', {
            message: 'An error occurred during registration'
        });
    });
};


exports.login = (req, res) => {
    const { email, password, loginType } = req.body;

    let tableName;
    if (loginType === 'faculty') {
        tableName = 'facultyuser';
    } else if (loginType === 'student') {
        tableName = 'studentuser';
    } else {
        return res.render('login', {
            message: 'Invalid login type.'
        });
    }

    // Check if the email exists in the specified table
    db.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email], async (error, results) => {
        if (error) {
            console.log(error);
            return res.render('login', {
                message: 'An error occurred while checking the email.'
            });
        }

        if (results.length === 0) {
            return res.render('login', {
                message: 'Email not found.'
            });
        }

        // Check if the provided password matches the stored hashed password
        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.render('login', {
                message: 'Incorrect password.'
            });
        }

        // If login is successful, create a JWT token
        const token = jwt.sign({ id: user.id, email: user.email, userType: loginType }, '123', {
            expiresIn: '1h' // You can adjust the expiration time
        });

        // Store the token in cookies or send it in the response, depending on your implementation
        res.cookie('jwt', token, { httpOnly: true });

        // Redirect or render the appropriate page based on login type
        if (loginType === 'faculty') {
            res.redirect('/faculty');
        } else if (loginType === 'student') {
            res.redirect('/student');
        }
    });
};
