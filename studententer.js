
const mysql = require('mysql2');
const express = require('express');
const app = express();
const path = require("path");
const methodOverride = require('method-override');
const nodemailer = require('nodemailer');

// Middleware
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));


// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Pass1',
    database: 'collegedb'
});

// Connect DB
connection.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("MySQL Connected ✅");
    }
});

// Email configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Replace with your email
        pass: 'your-app-password' // Replace with your app password
    }
});


//main page
app.get("", (req, res) => {
    res.render("library.ejs");
});

// ✅ GET → show tables
app.get("/r", (req, res) => {
    connection.query('SHOW TABLES', (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error");
        }

        res.send(result); // only one response
    });
});
app.get("/ry", (req, res) => {
    res.send('server runing succ')
});


// ✅ POST → receive form data
app.get("/studententer", (req, res) => {

    res.render("studententer.ejs")

    // res.send("Data received successfully");
});


//book reg

app.get('/bookreg', (req, res) => {
    res.render("bookenter.ejs");
})
app.post('/book-register', (req, res) => {
    let { title, author, isbn, genre, total_copies, available_copies } = req.body;

    let q = `INSERT INTO book 
(title, author, isbn, genre, total_copies, available_copies) 
VALUES 
('${title}', '${author}', '${isbn}', '${genre}', '${total_copies}', '${available_copies}')`;
    try {
        connection.query(q, (err, result) => {
            if (err) throw err;
            // res.send('insert successfully');
            res.render('bookenter.ejs')
        })
    }
    catch {
        res.send('error database');
    }
})





app.patch('/book/register', (req, res) => {
    let q = 'select * from student'
    connection.query(q, (err, result) => {
        console.log(count);
        res.send(result);
    })
    res.send('err')
})




//student table querys
app.get("/studententer", (req, res) => {

    res.render("studententer.ejs")

    // res.send("Data received successfully");
});


app.get("/student/data", (req, res) => {
    let q = "SELECT * FROM student";

    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        res.render("student.ejs", { users: result });
    });
});
//bookenter data
app.get("/book/data", (req, res) => {
    let q = "SELECT * FROM book";

    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        res.render("book.ejs", { users: result });
    });
});


app.post('/student-enter', (req, res) => {
    let { first_name, last_name, Smail, DOB, Snumber, Pnumber, year, Saddress, DOR } = req.body;

    let q = `INSERT INTO student 
(first_name,last_name, email, dob,year, student_phone, parent_phone, address, registration_date) 
VALUES 
('${first_name}','${last_name}', '${Smail}','${DOB}','${year}',  '${Snumber}', '${Pnumber}', '${Saddress}', '${DOR}')`;
    try {
        connection.query(q, (err, result) => {
            if (err) throw err;
            // res.send("inserted successfully")
            res.render('studententer.ejs');

        })
    }
    catch (err) {
        res.send("error in database");
    }

});





app.get('/book/issues', (req, res) => {

    // 1. Update overdue
    let q1 = `
        UPDATE book_issue
        SET status = 'overdue'
        WHERE due_date < CURDATE()
        AND status != 'returned'
    `;

    connection.query(q1, (err) => {

        if (err) {
            console.log(err);
            return res.send("Update error");
        }

        // 2. Get notifications with email
        let q2 = `
            SELECT 
                student.first_name,
                student.email,
                book.title,
                book_issue.due_date
            FROM book_issue
            JOIN student ON book_issue.student_id = student.id
            JOIN book ON book_issue.book_id = book.id
            WHERE book_issue.status = 'overdue'
        `;

        connection.query(q2, (err2, notifications) => {

            if (err2) notifications = [];

            // Send emails to overdue students
            notifications.forEach(student => {
                const mailOptions = {
                    from: 'your-email@gmail.com', // Replace with your email
                    to: student.email,
                    subject: 'Book Due Date Reminder',
                    text: `Dear ${student.first_name},\n\nThis is a reminder that the book "${student.title}" was due on ${student.due_date}. Please return it as soon as possible to avoid any penalties.\n\nThank you,\nLibrary Management System`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Error sending email:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });
            });

            // 3. Get all issue data
            let q3 = "SELECT * FROM book_issue";

            connection.query(q3, (err3, result) => {

                if (err3) {
                    console.log(err3);
                    return res.send("Fetch error");
                }

                res.render("book_issue copy.ejs", {
                    users: result,
                    notifications: notifications
                });

            });

        });

    });
});

app.post('/book/register', (req, res) => {
    let q = 'SELECT * FROM student';

    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send('err');
        }

        console.log(result);
        res.send(result);
    });
});



//book issue table querys
app.get("/bookissue", (req, res) => {
    res.render("bookissue.ejs");
});
app.post("/issue-book", (req, res) => {

    let { student_id, book_id, issue_date, due_date, status } = req.body;

    let q = `INSERT INTO book_issue 
(student_id, book_id, issue_date, due_date, status) 
VALUES ('${student_id}', '${book_id}', '${issue_date}', '${due_date}', '${status}')`;
    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database error");
        }

        // res.send("Successfully inserted ✅");
        res.render('bookissue.ejs')
    });
});


// //change the status

app.get("/user/:id/edit", (req, res) => {

    let { id } = req.params;

    let q = `
    SELECT 
        book_issue.*,
        CONCAT(student.first_name, ' ', student.last_name) AS studentName,
        book.title AS bookTitle,
        book.author,
        book.isbn,
        book.genre
    FROM book_issue
    JOIN student ON book_issue.student_id = student.id
    JOIN book ON book_issue.book_id = book.id
    WHERE book_issue.id = ?
    `;

    connection.query(q, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("DB error");
        }

        if (result.length === 0) {
            return res.send("No record found");
        }

        let issue = result[0];

        res.render("edit.ejs", { issue });
    });
});



app.patch("/issue/:id", (req, res) => {

    let { id } = req.params;
    let { status, return_date } = req.body;

    // AUTO SET RETURN DATE IF RETURNED
    if (status === "returned") {
        return_date = new Date().toISOString().split("T")[0];
    }

    let q = `
        UPDATE book_issue 
        SET status = ?, return_date = ?
        WHERE id = ?
    `;

    connection.query(q, [status, return_date, id], (err, result) => {

        if (err) {
            console.log(err);
            return res.send("DB error");
        }

        res.redirect("/book/issue/data"); // change if your route is different
    });
});



// Server
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});