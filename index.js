import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "Bookstore",
  password: "2627",
  port: 5432,
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use('/styles', express.static('public/styles', {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));



app.set('view engine', 'ejs');

// Basic route


app.get("/", async (req, res) => {
  const { sort_by } = req.query;
  let sortQuery;
  switch (sort_by) {
    case 'rating':
      sortQuery = 'ORDER BY rating DESC';
     break;
   case 'date_read':
   default:
    sortQuery = 'ORDER BY date_read DESC';
}

  try{
    const result = await db.query(`SELECT * FROM books ${ sortQuery }`);
    res.render("index", {books: result.rows});
  } catch(error) {
    console.error("Error fetching books:", error);
    res.status(500).send("Server error");
  }
});



app.get("/add-book", (req, res) => {
  res.render("addBook", { error: null })
});



app.post("/", async (req, res) => {
  const { title, author, rating, review, date_read, isbn } = req.body;
  if (!title || !rating || !date_read) {
    return res.render('addBook', { error: 'Title, rating, and date read are required.' });
  }
  
  if (rating < 1 || rating > 5) {
    return res.status(400).send('Rating must be between 1 and 5.');
  }

  if (isbn && !/^(97(8|9))?\d{9}(\d|X)$/.test(isbn)) {
    return res.render('addBook', { error: 'Invalid ISBN format.' });
  }

  let cover_url = "/images/placeholder.png";

  if(isbn){
  try {
    const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
    if (response.status === 200) {
      cover_url = response.request.res.responseUrl;
    }
  } catch (error) {
    console.error('Error fetching cover:', error);
  } 
}

  try {
    await db.query(
      "INSERT INTO books (title, author, rating, review, date_read, cover_url) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, author, rating, review, date_read, cover_url]
    );
    res.redirect("/");
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).send("Server error");
  }
});


app.get("/edit-book/:id", async (req, res) => {
  const { id } = req.params;
  try{
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    if(result.rows.length > 0){
      res.render("editBook", { book: result.rows[0] });
    } else {
      res.status(404).send("Book not found");
    }
  } catch (error) {
    console.error("Error fetching book for editing", error);
    res.status(500).send("Server error");
  }
});


app.post("/update-book/:id", async (req, res) =>{
  const { id} = req.params;
  const { title, author, rating, review, date_read } = req.body;

  try{
    await db.query(
      "UPDATE books SET title = $1, author = $2, rating = $3, review = $4, date_read = $5 WHERE id = $6",
      [title, author, rating, review, date_read, id]
    );
    res.redirect("/");
  } catch (error) {
    console.error("Error updating books", error);
    res.status(500).send("Server error");
  }
});


app.get("/delete-book/:id", async (req, res) => {
  const { id } = req.params;
  try{
    await db.query("DELETE FROM books WHERE id = $1", [id] );
    res.redirect("/");
  } catch (error) {
    console.error("Error deleting books", error);
    res.status(500).send("Server error");
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

