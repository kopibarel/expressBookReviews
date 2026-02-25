const express = require("express");
let books = require("./booksdb.js");
const { users, isAlNum, isSaneUserName, isSanePassword, isValidChars, hash_password, findBookID } = require("./auth_users.js");
const public_users = express.Router();

pretty = (res, obj, code=200) => res.status(code).end(JSON.stringify(obj, null, 4));

public_users.post("/register", (req,res) => {
  let username = req.body.username;
  let password = req.body.password;
  if (!username) return pretty(res, {message: "Username required"}, 400)
  else if (!isAlNum(username)) return pretty(res, {message: "Invalid username, must be alphanumeric."}, 400)
  else if (!isSaneUserName(username)) return pretty(res, {message: "Invalid username, must be alphanumeric and 4-16 cgaracters long."}, 400)
  else if (users[username]) return pretty(res, {message: `User ${username} already exists`}, 400)
  else if (!password) return pretty(res, {message: "Password required"}, 400)
  else if (!isSanePassword(password)) return pretty(res, {message: "Invalid password, must be alphanumeric and 8-64 characters long."}, 400)
  else {
    users[username] = hash_password(password);
    return pretty(res, {message: `User ${username} created`});
}});

// Get the book list available in the shop
public_users.get("/", (req, res) => Object.keys(books).length === 0 ? pretty(res, {message: "No books available"}, 404) : pretty(res, books));

// Get book details based on ISBN
public_users.get("/isbn/:isbn", (req, res) => {
  let isbn = req.params.isbn.toUpperCase();
  if (!isbn) { // Get books that have no ISBN
    let books_ = Object.values(books).filter(book => !book.isbn);
    return books_ ? pretty(res, books_) : pretty(res, {message: "No book not found"}, 404);}
  else if (!isAlNum(isbn)) return pretty(res, {message: "Invalid ISBN"}, 400)
  else {
    let book = Object.values(books).find(book => book.isbn === isbn);
    return book ? pretty(res, book) : pretty(res, {message: "Book not found"}, 404);
}});
  
// Get book details based on author
public_users.get("/author/:author", (req, res) => {
  let author = req.params.author;
  if (!author) return pretty(res, {message: "Author required"}, 400);
  else if (!isValidChars(author)) return pretty(res, {message: "Invalid author name"}, 400);
  else {
    let books_ = Object.values(books).filter(book => book.author === author);
    return books_.length > 0 ? pretty(res, books_) : pretty(res, {message: "No book not found"}, 404);
}});

// Get all books based on title
public_users.get("/title/:title", (req, res) => {
  let title = req.params.title;
  if (!title) return pretty(res, {message: "Title required"}, 400)
  else if (!isValidChars(title)) return pretty(res, {message: "Invalid title"}, 400)
  else {
    let books_ = Object.values(books).filter(book => book.title === title);
    return books_.length > 0 ? pretty(res, books_) : pretty(res, {message: "No book not found"}, 404);
}});

//  Get book review
public_users.get("/review/:isbn", (req, res) => {
  let isbn = req.params.isbn.toUpperCase();
  let book_id = findBookID(isbn);
  return book_id ? pretty(res, books[book_id].reviews) : pretty(res, {message: "Book not found"}, 404);
});

module.exports.general = public_users;