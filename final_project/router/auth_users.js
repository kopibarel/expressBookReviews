const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();
const crypto = require("crypto");

let users = {};
const hash_key = "customer_fingerprint"; // faking a secret key

const isAlNum = str => str.match(/^[a-zA-Z0-9]+$/);
const isSaneUserName = username => username.length >= 4 && username.length <= 16 && isAlNum(username);
const isSanePassword = password => password.length >= 8 && password.length <= 64 && isAlNum(password);
const isValidChars = input => {
  // This regex allows letters from any language, digits, spaces, and some common punctuation.
  // \p{L} matches any kind of letter from any language
  // \p{N} matches any kind of numeric character in any script
  // \p{P} matches any kind of punctuation character
  // \p{Z} matches any kind of whitespace or invisible separator
  const regex = /^[\p{L}\p{N}\p{P}\p{Z}]+$/u;
  return regex.test(input);
};

const hash_password = password => crypto.createHash("sha256").update(hash_key+password).digest("hex");

const findBookID = isbn => {
  const book_id = Object.keys(books).find(book_id => books[book_id].isbn === isbn);
  return book_id ? book_id : null;
};

const authenticatedUser = (username, password) => {
  if (!users[username]) return false;
  else return users[username] !== hash_password(password);
};

//only registered users can login
regd_users.post("/login", (req,res) => {
  let username = req.body.username;
  let password = req.body.password;
  if (!username) return res.status(400).json({message: "Username required."});
  else if (!isSaneUserName(username)) return res.status(400).json({message: "Invalid username."});
  else if (!users[username]) return res.status(400).json({message: `User ${username} does not exist.`});
  else if (!password) return res.status(400).json({message: "Password required."});
  else if (!isSanePassword(password)) return res.status(400).json({message: "Invalid password."});
  else if (authenticatedUser(username, password)) return res.status(401).json({message: "Invalid password."});
  else {
    // Generate JWT access token
    const token = jwt.sign({username: username}, hash_key, {expiresIn: "1h"});
    // Store access token and username in session
    req.session.authorization = {accessToken: token, username: username};
    return res.status(200).json({message: "Logged in.", token: token});
}});

// Add a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  let isbn = req.params.isbn.toUpperCase();
  let review = req.body.review;
  if (!isbn) return res.status(400).json({message: "ISBN required."});
  else if (!isAlNum(isbn)) return res.status(400).json({message: "Invalid ISBN."});
  else if (!review) return res.status(400).json({message: "Review required."});
  else if (!isValidChars(review) || review.length < 1) return res.status(400).json({message: "Invalid review."});
  else {
    try {
      const book_id = findBookID(isbn);
      if (!book_id) return res.status(404).json({message: "Book not found."});
      else {
        const username = req.session.authorization.username;
        books[book_id].reviews[username] = review;
      }
      return res.status(200).json({message: "Review added."});
    } catch (error) {
      return res.status(500).json({message: "Internal server error."});
}}});

// Remove a book review
regd_users.delete("/auth/review/:isbn", (req, res) => {
  let isbn = req.params.isbn.toUpperCase();
  if (!isbn) return res.status(400).json({message: "ISBN required."});
  else if (!isAlNum(isbn)) return res.status(400).json({message: "Invalid ISBN."});
  else {
    try {
      const book_id = findBookID(isbn);
      if (!book_id) return res.status(404).json({message: "Book not found."});
      else {
        const username = req.session.authorization.username;
        delete books[book_id].reviews[username];
      }
      return res.status(200).json({message: "Review removed."});
    } catch (error) {
      return res.status(500).json({message: "Internal server error."});
    }
  }
});

module.exports.authenticated = regd_users;
module.exports.isAlNum = isAlNum;
module.exports.isSaneUserName = isSaneUserName;
module.exports.isSanePassword = isSanePassword;
module.exports.isValidChars = isValidChars;
module.exports.hash_password = hash_password;
module.exports.users = users;
module.exports.findBookID = findBookID;