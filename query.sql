-- SQLite users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  id_no VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK 
    (role IN ('Executive','Finance','NOC','Admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
RENAME COLUMN password TO password_hash;

DROP TABLE IF EXISTS users;
select * from users;

select * from roles

ALTER TABLE users
DROP COLUMN username;

SELECT CURRENT_database()