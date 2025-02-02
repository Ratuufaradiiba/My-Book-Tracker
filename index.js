import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import pg from 'pg';

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'booktracker',
  password: '123',
  port: 5432,
});

db.connect();

async function getCoverAPI(title) {
  try {
    const response = await axios.get(`https://openlibrary.org/search.json?q=${title}`);
    const bookData = response.data.docs[0].cover_i;
    console.log(bookData);

    const cover = bookData ? `https://covers.openlibrary.org/b/id/${bookData}-M.jpg` : null;
    console.log(cover);

    return cover;
  } catch (error) {
    console.error(error.message);
  }
}

app.get('/', async (req, res) => {
    try {
        const sort = req.query.sort || 'title-asc'; // Default sorting: Nama (A-Z)
    
        let orderBy;
        switch (sort) {
          case 'title-asc':
            orderBy = 'title ASC';
            break;
          case 'title-desc':
            orderBy = 'title DESC';
            break;
          case 'rating-desc':
            orderBy = 'rating DESC';
            break;
          case 'rating-asc':
            orderBy = 'rating ASC';
            break;
          case 'date-desc':
            orderBy = 'finish_date DESC';
            break;
          case 'date-asc':
            orderBy = 'finish_date ASC';
            break;
          default:
            orderBy = 'title ASC';
        }
    
        const books = await db.query(`SELECT * FROM books ORDER BY ${orderBy}`);
        res.render('index.ejs', { books: books.rows, sort });
      } catch (error) {
        console.log(error.message);
        res.status(500).send("Terjadi kesalahan saat mengambil data buku.");
      }
});

app.get('/add-book', (req, res) => {
  res.render('add-book.ejs');
});

app.post('/new-books', async (req, res) => {
  try {
    const { title, author, rating, review, finish_date } = req.body;

    const cover_url = await getCoverAPI(title);

    await db.query(`INSERT INTO books (title, author, rating, review, finish_date, cover_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [title, author, rating, review, finish_date, cover_url]);
    res.redirect('/');
  } catch (error) {
    console.error(error.message);
  }
});

app.get('/books/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const bookData = await db.query('SELECT * FROM books WHERE id = $1', [id]);
    const result = bookData.rows[0];

    res.render('book-detail.ejs', { book: result });
  } catch (error) {
    console.log(error.message);
  }
});

app.get('/books/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id);
  const book = await db.query(`SELECT * FROM books WHERE id = $1`, [id]);
  res.render('edit-book.ejs', { book: book.rows[0] });
});

app.post('/books/update', async (req, res) => {
  try {
    const id = parseInt(req.body.id);
    const { title, author, rating, review, finish_date } = req.body;

    const cover_url = await getCoverAPI(title);

    await db.query(`UPDATE books SET title = $1, author = $2, rating = $3, review = $4, finish_date = $5 , cover_url = $6 WHERE id = $7 RETURNING *`, [title, author, rating, review, finish_date, cover_url, id]);
    res.redirect(`/books/${id}`);
  } catch (error) {
    console.log(error.message);
  }
});

app.post('/books/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  const deleteBook = await db.query(`DELETE FROM books WHERE id = $1 RETURNING *`, [id]);
  console.log(deleteBook);

  res.redirect('/');
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
