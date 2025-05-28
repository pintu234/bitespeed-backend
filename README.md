# BiteSpeed Identity Resolution Backend

This is a backend service for resolving and merging user identities based on shared contact information (email or phone number). It supports both identifying and retrieving linked contacts using a RESTful API built with **Node.js**, **Express**, and **MySQL**.

---

## 📌 Features

- 🔍 Identity resolution via `/identify` (POST)
- 📂 Fetch resolved identities via `/identify` (GET)
- 🗃️ MySQL-based persistent storage
- 🔁 Merges contacts based on overlapping phone/email
- 🛠 Clean, modular code with separate route files

---

## 📁 Project Structure

├── db.js # MySQL connection setup
├── index.js # App entry point
├── .env # Environment variables
├── routes/
│ ├── identify.js # Handles /identify POST & GET
│ └── contacts.js # Optional route to see all contacts
└── README.md # This file

Setup Instructions

Clone the repo
git clone https://github.com/pintu234/bitespeed-backend.git
cd bitespeed-backend

Install dependencies
npm install
Set up .env

env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=bitespeed
Run the app

bash
node index.js
🗃️ MySQL Schema
sql

CREATE TABLE bitespeed (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phoneNumber VARCHAR(15),
  email VARCHAR(255),
  linkedId INT,
  linkPrecedence ENUM('primary', 'secondary'),
  createdAt DATETIME,
  updatedAt DATETIME,
  deletedAt DATETIME
);

👤 Author
Pintu Kumar Baranwal
Metallurgical Engineering, IIT (BHU)
GitHub: @pintu234

📄 License
This project was built for the BiteSpeed Backend Challenge.
