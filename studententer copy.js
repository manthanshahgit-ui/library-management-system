const mysql = require('mysql2');
const express = require('express');
const app = express();
const path = require("path");
const methodOverride = require('method-override');

// Middleware
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// DB Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Pass1',
    database: 'collegedb'
});

// ===================== HOME =====================
app.get("/", (req, res) => {
    res.send("Server Running ✅");
});

// ===================== BOOK ISSUE =====================

// ISSUE BOOK (SIMPLE)
app.post("/issue-book", (req, res) => {

    let { student_id, book_id, issue_date, due_date } = req.body;

    // check student
    connection.query("SELECT * FROM student WHERE id = ?", [student_id], (err, s) => {
        if (err) return res.redirect('/book/issues?msg=error');
        if (s.length === 0) return res.redirect('/book/issues?msg=student_not_found');

        // check book
        connection.query("SELECT available_copies FROM book WHERE id = ?", [book_id], (err, b) => {
            if (err) return res.redirect('/book/issues?msg=error');
            if (b.length === 0) return res.redirect('/book/issues?msg=book_not_found');
            if (b[0].available_copies <= 0) return res.redirect('/book/issues?msg=book_not_available');

            // insert issue
            connection.query(
                "INSERT INTO book_issue (student_id, book_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, 'issued')",
                [student_id, book_id, issue_date, due_date],
                (err) => {
                    if (err) return res.redirect('/book/issues?msg=error');

                    // update book count
                    connection.query(
                        "UPDATE book SET available_copies = available_copies - 1 WHERE id = ?",
                        [book_id],
                        () => res.redirect('/book/issues?msg=issued')
                    );
                }
            );
        });
    });

});


// SHOW ISSUES PAGE
app.get('/book/issues', (req, res) => {

    let msg = req.query.msg || "";

    // update overdue
    connection.query(`
        UPDATE book_issue 
        SET status='overdue'
        WHERE due_date < CURDATE() AND status != 'returned'
    `);

    // get notifications
    let q2 = `
        SELECT student.first_name, book.title, book_issue.due_date
        FROM book_issue
        JOIN student ON book_issue.student_id = student.id
        JOIN book ON book_issue.book_id = book.id
        WHERE book_issue.status = 'overdue'
    `;

    connection.query(q2, (err, notifications) => {

        if (err) notifications = [];

        // get issue data
        connection.query(
            "SELECT * FROM book_issue WHERE status != 'returned'",
            (err, result) => {

                if (err) return res.send("Fetch error");

                res.render("book_issue copy.ejs", {
                    users: result,
                    notifications: notifications,
                    msg: msg
                });
            }
        );
    });
});


// ===================== UPDATE STATUS =====================
app.patch("/issue/:id", (req, res) => {

    let { id } = req.params;
    let { status } = req.body;

    if (status === "returned") {

        let return_date = new Date().toISOString().split("T")[0];

        connection.query("SELECT * FROM book_issue WHERE id = ?", [id], (err, result) => {

            if (result.length === 0) return res.redirect('/book/issues?msg=error');

            let issue = result[0];

            // move to returned_books
            connection.query(
                "INSERT INTO returned_books (student_id, book_id, issue_date, due_date, return_date) VALUES (?, ?, ?, ?, ?)",
                [issue.student_id, issue.book_id, issue.issue_date, issue.due_date, return_date]
            );

            // delete from issue
            connection.query("DELETE FROM book_issue WHERE id = ?", [id]);

            // increase book count
            connection.query(
                "UPDATE book SET available_copies = available_copies + 1 WHERE id = ?",
                [issue.book_id]
            );

            res.redirect("/book/issues?msg=returned");
        });

    } else {

        connection.query(
            "UPDATE book_issue SET status=? WHERE id=?",
            [status, id],
            () => res.redirect("/book/issues")
        );
    }
});


// ===================== SERVER =====================
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});