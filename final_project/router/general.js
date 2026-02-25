const express = require("express");
const axios = require("axios");
let books = require("./booksdb.js");
const { users, isAlNum, isSaneUserName, isSanePassword, isValidChars, hash_password, findBookID } = require("./auth_users.js");
const public_users = express.Router();

pretty = (res, obj, code=200) => res.status(code).end(JSON.stringify(obj, null, 4));

// Моки для демонстрации HTTP API книг
const mockBooksAPI = "http://localhost:3001/books";

public_users.post("/register", (req,res) => {
  let username = req.body.username;
  let password = req.body.password;
  if (!username) return pretty(res, {message: "Username required"}, 400)
  else if (!isAlNum(username)) return pretty(res, {message: "Invalid username, must be alphanumeric."}, 400)
  else if (!isSaneUserName(username)) return pretty(res, {message: "Invalid username, must be alphanumeric and 4-16 characters long."}, 400)
  else if (users[username]) return pretty(res, {message: `User ${username} already exists`}, 400)
  else if (!password) return pretty(res, {message: "Password required"}, 400)
  else if (!isSanePassword(password)) return pretty(res, {message: "Invalid password, must be alphanumeric and 8-64 characters long."}, 400)
  else {
    users[username] = hash_password(password);
    return pretty(res, {message: `User ${username} created`});
}});

// Get the book list available in the shop - через Axios
public_users.get("/", (req, res) => {
  axios.get(`${mockBooksAPI}`)
    .then(response => {
      const booksData = response.data;
      if (Object.keys(booksData).length === 0) {
        return pretty(res, {message: "No books available"}, 404);
      }
      pretty(res, booksData);
    })
    .catch(error => {
      console.error("Error fetching books:", error.message);
      pretty(res, {message: "Failed to fetch books from API"}, 500);
    });
});

// Get book details based on ISBN - через Axios
public_users.get("/isbn/:isbn", (req, res) => {
  let isbn = req.params.isbn.toUpperCase();
  
  if (!isbn) {
    axios.get(`${mockBooksAPI}`)
      .then(response => {
        let books_ = Object.values(response.data).filter(book => !book.isbn);
        return books_.length > 0 ? 
          pretty(res, books_) : 
          pretty(res, {message: "No books without ISBN found"}, 404);
      })
      .catch(error => {
        console.error("Error fetching books:", error.message);
        pretty(res, {message: "API Error"}, 500);
      });
  } 
  else if (!isAlNum(isbn)) {
    return pretty(res, {message: "Invalid ISBN"}, 400);
  }
  else {
    axios.get(`${mockBooksAPI}/isbn/${isbn}`)
      .then(response => {
        pretty(res, response.data);
      })
      .catch(error => {
        if (error.response?.status === 404) {
          pretty(res, {message: "Book not found"}, 404);
        } else {
          console.error("Error fetching book:", error.message);
          pretty(res, {message: "Failed to fetch book from API"}, 500);
        }
      });
  }
});

// Get book details based on author - через Axios с промисами
public_users.get("/author/:author", (req, res) => {
  let author = req.params.author;
  
  if (!author) return pretty(res, {message: "Author required"}, 400);
  else if (!isValidChars(author)) return pretty(res, {message: "Invalid author name"}, 400);
  
  axios.get(`${mockBooksAPI}`)
    .then(response => {
      let books_ = Object.values(response.data).filter(book => book.author === author);
      return books_.length > 0 ? 
        pretty(res, books_) : 
        pretty(res, {message: "No books by author found"}, 404);
    })
    .catch(error => {
      console.error("Error fetching books by author:", error.message);
      pretty(res, {message: "Failed to fetch books from API"}, 500);
    });
});

// Get all books based on title - через Axios
public_users.get("/title/:title", (req, res) => {
  let title = req.params.title;
  
  if (!title) return pretty(res, {message: "Title required"}, 400);
  else if (!isValidChars(title)) return pretty(res, {message: "Invalid title"}, 400);
  
  axios.get(`${mockBooksAPI}`)
    .then(response => {
      let books_ = Object.values(response.data).filter(book => book.title === title);
      return books_.length > 0 ? 
        pretty(res, books_) : 
        pretty(res, {message: "No books with title found"}, 404);
    })
    .catch(error => {
      console.error("Error fetching books by title:", error.message);
      pretty(res, {message: "Failed to fetch books from API"}, 500);
    });
});

// Get book review - через Axios
public_users.get("/review/:isbn", (req, res) => {
  let isbn = req.params.isbn.toUpperCase();
  let book_id = findBookID(isbn);
  
  if (!book_id) {
    return pretty(res, {message: "Book not found"}, 404);
  }
  
  axios.get(`${mockBooksAPI}/${book_id}/reviews`)
    .then(response => {
      pretty(res, response.data);
    })
    .catch(error => {
      if (error.response?.status === 404) {
        pretty(res, {message: "Reviews not found"}, 404);
      } else {
        console.error("Error fetching reviews:", error.message);
        pretty(res, {message: "Failed to fetch reviews from API"}, 500);
      }
    });
});

module.exports.general = public_users;
