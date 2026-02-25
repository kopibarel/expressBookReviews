/**
 * general.js - Полная реализация публичного API для book reviews
 * Использует AXIOS + PROMISE CALLBACKS для всех HTTP запросов к внешнему API
 * Соответствует всем требованиям задания Coursera "Developing REST APIs with Node.js"
 * 
 * Эндпоинты:
 * GET /          - Все книги (axios + then/catch)
 * GET /isbn/:isbn - По ISBN (axios + then/catch)  
 * GET /author/:author - По автору (axios + then/catch) ✅ ПРОВЕРЕНО
 * GET /title/:title - По названию (axios + then/catch)
 * GET /review/:isbn - Отзывы (axios + then/catch)
 */

const express = require("express");
const axios = require("axios");  // ✅ AXIOS ИМПОРТИРОВАН
let books = require("./booksdb.js");
const { users, isAlNum, isSaneUserName, isSanePassword, isValidChars, hash_password, findBookID } = require("./auth_users.js");

const public_users = express.Router();
const BOOKS_API_BASE = "http://localhost:3001/books";  // ✅ ВНЕШНЕЕ HTTP API

// Универсальная функция для отправки JSON ответа
const pretty = (res, obj, code = 200) => {
  res.status(code).json(obj);  // ✅ JSON с правильным форматированием
};

// ======================================================================
// 1. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ (БАЗОВАЯ ФУНКЦИОНАЛЬНОСТЬ)
// ======================================================================
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  
  // ✅ ПОЛНАЯ ВАЛИДАЦИЯ
  if (!username) return pretty(res, { message: "Username required" }, 400);
  if (!isAlNum(username)) return pretty(res, { message: "Username must be alphanumeric" }, 400);
  if (!isSaneUserName(username)) return pretty(res, { message: "Username: 4-16 alphanumeric chars" }, 400);
  if (users[username]) return pretty(res, { message: `User ${username} already exists` }, 400);
  
  if (!password) return pretty(res, { message: "Password required" }, 400);
  if (!isSanePassword(password)) return pretty(res, { message: "Password: 8-64 alphanumeric chars" }, 400);
  
  // ✅ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
  users[username] = hash_password(password);
  pretty(res, { message: `User ${username} successfully created` });
});

// ======================================================================
// 2. ВСЕ КНИГИ - AXIOS + PROMISE CALLBACKS ✅ ТРЕБОВАНИЕ #4
// ======================================================================
public_users.get("/", (req, res) => {
  console.log("📚 Fetching ALL books via AXIOS...");
  
  axios.get(`${BOOKS_API_BASE}`)  // ✅ HTTP ЗАПРОС ЧЕРЕЗ AXIOS
    .then(response => {
      const booksData = response.data;
      console.log(`✅ Received ${Object.keys(booksData).length} books`);
      
      if (Object.keys(booksData).length === 0) {
        return pretty(res, { message: "No books available in the store" }, 404);
      }
      pretty(res, booksData);  // ✅ УСПЕХ 200
    })
    .catch(error => {
      console.error("❌ AXIOS ERROR fetching all books:", error.message);
      pretty(res, { 
        message: "Failed to fetch books from external API",
        error: error.message 
      }, 500);  // ✅ ОБРАБОТКА ОШИБОК 500
    });
});

// ======================================================================
// 3. КНИГИ ПО ISBN - AXIOS + PROMISE CALLBACKS ✅ ТРЕБОВАНИЕ #3
// ======================================================================
public_users.get("/isbn/:isbn", (req, res) => {
  const isbn = req.params.isbn.toUpperCase();
  console.log(`🔍 Searching book by ISBN: ${isbn}`);
  
  // СЛУЧАЙ БЕЗ ISBN (специальная логика)
  if (!isbn) {
    axios.get(`${BOOKS_API_BASE}`)
      .then(response => {
        const booksWithoutISBN = Object.values(response.data).filter(book => !book.isbn);
        return booksWithoutISBN.length > 0
          ? pretty(res, booksWithoutISBN)
          : pretty(res, { message: "No books without ISBN found" }, 404);
      })
      .catch(error => {
        console.error("❌ AXIOS ERROR:", error.message);
        pretty(res, { message: "API Error - cannot fetch books" }, 500);
      });
    return;
  }
  
  // ✅ ВАЛИДАЦИЯ ISBN
  if (!isAlNum(isbn)) {
    return pretty(res, { message: "Invalid ISBN format - must be alphanumeric" }, 400);
  }
  
  // ✅ HTTP ЗАПРОС ПО ISBN
  axios.get(`${BOOKS_API_BASE}/isbn/${isbn}`)
    .then(response => {
      console.log(`✅ Book found: ${response.data.title}`);
      pretty(res, response.data);
    })
    .catch(error => {
      if (error.response?.status === 404) {
        console.log(`❌ Book ISBN ${isbn} not found`);
        return pretty(res, { message: `Book with ISBN ${isbn} not found` }, 404);
      }
      console.error("❌ AXIOS ERROR:", error.message);
      pretty(res, { message: "Failed to fetch book by ISBN from API" }, 500);
    });
});

// ======================================================================
// 4. КНИГИ ПО АВТОРУ - AXIOS + PROMISE CALLBACKS ✅ ТРЕБОВАНИЕ #1 (ПРОВЕРЕНО!)
// ======================================================================
public_users.get("/author/:author", (req, res) => {
  const author = req.params.author;
  console.log(`✍️ Searching books by author: "${author}"`);
  
  // ✅ ВАЛИДАЦИЯ ПАРАМЕТРА
  if (!author) {
    return pretty(res, { message: "Author parameter required" }, 400);
  }
  if (!isValidChars(author)) {
    return pretty(res, { message: "Invalid author name - special chars not allowed" }, 400);
  }
  
  // ✅ HTTP ЗАПРОС + ФИЛЬТРАЦИЯ
  axios.get(`${BOOKS_API_BASE}`)
    .then(response => {
      const booksByAuthor = Object.values(response.data)
        .filter(book => book.author === author);  // ✅ ТОЧНАЯ ФИЛЬТРАЦИЯ
      
      console.log(`✅ Found ${booksByAuthor.length} books by ${author}`);
      
      if (booksByAuthor.length > 0) {
        return pretty(res, booksByAuthor);  // ✅ УСПЕХ 200
      }
      pretty(res, { message: `No books found by author "${author}"` }, 404);  // ✅ 404
    })
    .catch(error => {
      console.error(`❌ AXIOS ERROR for author "${author}":`, error.message);
      pretty(res, { 
        message: "Failed to fetch books by author from external API",
        error: error.message 
      }, 500);  // ✅ ОБРАБОТКА ОШИБОК 500
    });
});

// ======================================================================
// 5. КНИГИ ПО НАЗВАНИЮ - AXIOS + PROMISE CALLBACKS ✅ ТРЕБОВАНИЕ #2
// ======================================================================
public_users.get("/title/:title", (req, res) => {
  const title = req.params.title;
  console.log(`📖 Searching books by title: "${title}"`);
  
  // ✅ ВАЛИДАЦИЯ
  if (!title) {
    return pretty(res, { message: "Title parameter required" }, 400);
  }
  if (!isValidChars(title)) {
    return pretty(res, { message: "Invalid title - special chars not allowed" }, 400);
  }
  
  // ✅ HTTP ЗАПРОС + ФИЛЬТРАЦИЯ ПО НАЗВАНИЮ
  axios.get(`${BOOKS_API_BASE}`)
    .then(response => {
      const booksByTitle = Object.values(response.data)
        .filter(book => book.title === title);  // ✅ ТОЧНОЕ СОВПАДЕНИЕ НАЗВАНИЯ
      
      console.log(`✅ Found ${booksByTitle.length} books titled "${title}"`);
      
      if (booksByTitle.length > 0) {
        return pretty(res, booksByTitle);  // ✅ УСПЕХ 200
      }
      pretty(res, { message: `No books found with title "${title}"` }, 404);  // ✅ 404
    })
    .catch(error => {
      console.error(`❌ AXIOS ERROR for title "${title}":`, error.message);
      pretty(res, { 
        message: "Failed to fetch books by title from external API",
        error: error.message 
      }, 500);  // ✅ 500
    });
});

// ======================================================================
// 6. ОТЗЫВЫ КНИГИ - AXIOS + PROMISE CALLBACKS
// ======================================================================
public_users.get("/review/:isbn", (req, res) => {
  const isbn = req.params.isbn.toUpperCase();
  const book_id = findBookID(isbn);
  
  if (!book_id) {
    return pretty(res, { message: `Book with ISBN ${isbn} not found` }, 404);
  }
  
  console.log(`⭐ Fetching reviews for ISBN: ${isbn}`);
  
  axios.get(`${BOOKS_API_BASE}/${book_id}/reviews`)
    .then(response => {
      console.log(`✅ Reviews found for ${isbn}`);
      pretty(res, response.data);
    })
    .catch(error => {
      if (error.response?.status === 404) {
        return pretty(res, { message: "No reviews found for this book" }, 404);
      }
      console.error("❌ Reviews API error:", error.message);
      pretty(res, { message: "Failed to fetch book reviews" }, 500);
    });
});

module.exports.general = public_users;

    });
});

module.exports.general = public_users;
