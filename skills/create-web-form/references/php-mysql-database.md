# PHP MySQL Database Reference

A consolidated reference for working with MySQL databases in PHP, covering connections,
CRUD operations, prepared statements, and query techniques.

---

## Table of Contents

1. [MySQL Introduction](#1-mysql-introduction)
2. [Connect to MySQL](#2-connect-to-mysql)
3. [Create a Database](#3-create-a-database)
4. [Create a Table](#4-create-a-table)
5. [Insert Data](#5-insert-data)
6. [Get Last Inserted ID](#6-get-last-inserted-id)
7. [Insert Multiple Records](#7-insert-multiple-records)
8. [Prepared Statements](#8-prepared-statements)
9. [Select Data](#9-select-data)
10. [Select with WHERE](#10-select-with-where)
11. [Select with ORDER BY](#11-select-with-order-by)
12. [Delete Data](#12-delete-data)
13. [Update Data](#13-update-data)
14. [Select with LIMIT](#14-select-with-limit)

---

## 1. MySQL Introduction

> **Source:** <https://www.w3schools.com/php/php_mysql_intro.asp>

### What is MySQL?

MySQL is the most popular open-source relational database management system. Together with PHP,
MySQL is used to create dynamic, data-driven web applications.

### Key Points

- **MySQL** is a database system used on the web.
- **MySQL** runs on a server (typically alongside a web server such as Apache).
- It is ideal for both small and large applications.
- It is very fast, reliable, and easy to use.
- It uses standard **SQL** (Structured Query Language).
- It is free to download and use.
- MySQL is developed, distributed, and supported by Oracle Corporation.

### Data in MySQL

- Data in MySQL is stored in **tables**.
- A table is a collection of related data consisting of **columns** and **rows**.
- Databases are useful for storing information categorically. For example, a company may have
  databases for Employees, Products, and Customers.

### PHP + MySQL Database System

- PHP combined with MySQL is cross-platform (runs on Windows, Linux, macOS, etc.).
- The PHP code for querying a MySQL database is executed on the server, and the HTML result
  is sent to the browser.

### PHP MySQL APIs

PHP offers three ways to connect to and interact with MySQL:

| API | Description |
|-----|-------------|
| **MySQLi (Object-Oriented)** | MySQL Improved extension - OO interface |
| **MySQLi (Procedural)** | MySQL Improved extension - procedural interface |
| **PDO (PHP Data Objects)** | Works with 12 different database systems |

**Recommendation:** Use **MySQLi** or **PDO**. The older `mysql_*` functions are deprecated and
removed as of PHP 7.0.

**MySQLi vs PDO:**

- **PDO** works on 12 different database systems; **MySQLi** only works with MySQL.
- If you need to switch your project to another database, PDO makes the process easier -- you
  only have to change the connection string and a few queries.
- Both support **Prepared Statements**, which protect against SQL injection.

---

## 2. Connect to MySQL

> **Source:** <https://www.w3schools.com/php/php_mysql_connect.asp>

### Open a Connection to MySQL

Before accessing data in the MySQL database, you need to connect to the server.

### MySQLi Object-Oriented Connection

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";

// Create connection
$conn = new mysqli($servername, $username, $password);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
echo "Connected successfully";
?>
```

### MySQLi Procedural Connection

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";

// Create connection
$conn = mysqli_connect($servername, $username, $password);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
echo "Connected successfully";
?>
```

### PDO Connection

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";

try {
    $conn = new PDO("mysql:host=$servername;dbname=myDB", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully";
} catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>
```

**Note:** In the PDO example, a database (`myDB`) is specified. PDO requires a valid database
to connect to. If no database is specified, an exception is thrown.

### Closing the Connection

The connection is automatically closed when the script ends. To close it before that:

```php
// MySQLi Object-Oriented
$conn->close();

// MySQLi Procedural
mysqli_close($conn);

// PDO
$conn = null;
```

---

## 3. Create a Database

> **Source:** <https://www.w3schools.com/php/php_mysql_create.asp>

The `CREATE DATABASE` statement is used to create a database in MySQL.

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";

// Create connection
$conn = new mysqli($servername, $username, $password);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database
$sql = "CREATE DATABASE myDB";
if ($conn->query($sql) === TRUE) {
    echo "Database created successfully";
} else {
    echo "Error creating database: " . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";

// Create connection
$conn = mysqli_connect($servername, $username, $password);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Create database
$sql = "CREATE DATABASE myDB";
if (mysqli_query($conn, $sql)) {
    echo "Database created successfully";
} else {
    echo "Error creating database: " . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";

try {
    $conn = new PDO("mysql:host=$servername", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = "CREATE DATABASE myDBPDO";
    // Use exec() because no results are returned
    $conn->exec($sql);
    echo "Database created successfully<br>";
} catch(PDOException $e) {
    echo $sql . "<br>" . $e->getMessage();
}

$conn = null;
?>
```

**Tip:** When creating a database, you only need to specify the first three arguments to the
`mysqli` object (servername, username, and password). To select a specific database, add a
fourth argument.

---

## 4. Create a Table

> **Source:** <https://www.w3schools.com/php/php_mysql_create_table.asp>

The `CREATE TABLE` statement is used to create a table in MySQL.

### Key SQL Concepts for Table Creation

- **NOT NULL** - Each row must contain a value for that column; null values are not allowed.
- **DEFAULT value** - Set a default value that is added when no other value is passed.
- **UNSIGNED** - Used for number types, limits the stored data to positive numbers and zero.
- **AUTO_INCREMENT** - MySQL automatically increases the value of the field by 1 each time a
  new record is added.
- **PRIMARY KEY** - Used to uniquely identify the rows in a table. The column with PRIMARY KEY
  setting is often an ID number and is used with `AUTO_INCREMENT`.

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// SQL to create table
$sql = "CREATE TABLE MyGuests (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    firstname VARCHAR(30) NOT NULL,
    lastname VARCHAR(30) NOT NULL,
    email VARCHAR(50),
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "Table MyGuests created successfully";
} else {
    echo "Error creating table: " . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// SQL to create table
$sql = "CREATE TABLE MyGuests (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    firstname VARCHAR(30) NOT NULL,
    lastname VARCHAR(30) NOT NULL,
    email VARCHAR(50),
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if (mysqli_query($conn, $sql)) {
    echo "Table MyGuests created successfully";
} else {
    echo "Error creating table: " . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // SQL to create table
    $sql = "CREATE TABLE MyGuests (
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        firstname VARCHAR(30) NOT NULL,
        lastname VARCHAR(30) NOT NULL,
        email VARCHAR(50),
        reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";

    // Use exec() because no results are returned
    $conn->exec($sql);
    echo "Table MyGuests created successfully";
} catch(PDOException $e) {
    echo $sql . "<br>" . $e->getMessage();
}

$conn = null;
?>
```

---

## 5. Insert Data

> **Source:** <https://www.w3schools.com/php/php_mysql_insert.asp>

The `INSERT INTO` statement is used to add new records to a MySQL table.

### SQL Syntax

```sql
INSERT INTO table_name (column1, column2, column3, ...)
VALUES (value1, value2, value3, ...)
```

**Important rules:**

- SQL queries must be quoted in PHP.
- String values inside the SQL query must be quoted.
- Numeric values must NOT be quoted.
- The word NULL must NOT be quoted.

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('John', 'Doe', 'john@example.com')";

if ($conn->query($sql) === TRUE) {
    echo "New record created successfully";
} else {
    echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('John', 'Doe', 'john@example.com')";

if (mysqli_query($conn, $sql)) {
    echo "New record created successfully";
} else {
    echo "Error: " . $sql . "<br>" . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = "INSERT INTO MyGuests (firstname, lastname, email)
    VALUES ('John', 'Doe', 'john@example.com')";
    // Use exec() because no results are returned
    $conn->exec($sql);
    echo "New record created successfully";
} catch(PDOException $e) {
    echo $sql . "<br>" . $e->getMessage();
}

$conn = null;
?>
```

**Note:** The `id` column and `reg_date` column do not need values specified, as `id` is
`AUTO_INCREMENT` and `reg_date` has a default of `CURRENT_TIMESTAMP`.

---

## 6. Get Last Inserted ID

> **Source:** <https://www.w3schools.com/php/php_mysql_insert_lastid.asp>

If you perform an INSERT on a table with an AUTO_INCREMENT column, you can retrieve the ID of
the last inserted row immediately.

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('John', 'Doe', 'john@example.com')";

if ($conn->query($sql) === TRUE) {
    $last_id = $conn->insert_id;
    echo "New record created successfully. Last inserted ID is: " . $last_id;
} else {
    echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('John', 'Doe', 'john@example.com')";

if (mysqli_query($conn, $sql)) {
    $last_id = mysqli_insert_id($conn);
    echo "New record created successfully. Last inserted ID is: " . $last_id;
} else {
    echo "Error: " . $sql . "<br>" . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = "INSERT INTO MyGuests (firstname, lastname, email)
    VALUES ('John', 'Doe', 'john@example.com')";
    // Use exec() because no results are returned
    $conn->exec($sql);
    $last_id = $conn->lastInsertId();
    echo "New record created successfully. Last inserted ID is: " . $last_id;
} catch(PDOException $e) {
    echo $sql . "<br>" . $e->getMessage();
}

$conn = null;
?>
```

**Key methods:**

- MySQLi OO: `$conn->insert_id`
- MySQLi Procedural: `mysqli_insert_id($conn)`
- PDO: `$conn->lastInsertId()`

---

## 7. Insert Multiple Records

> **Source:** <https://www.w3schools.com/php/php_mysql_insert_multiple.asp>

Multiple SQL statements can be executed with the `multi_query()` method (MySQLi) or by
grouping values (PDO).

### MySQLi Object-Oriented (multi_query)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('John', 'Doe', 'john@example.com');";
$sql .= "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('Mary', 'Moe', 'mary@example.com');";
$sql .= "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('Julie', 'Dooley', 'julie@example.com')";

if ($conn->multi_query($sql) === TRUE) {
    echo "New records created successfully";
} else {
    echo "Error: " . $sql . "<br>" . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural (multi_query)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('John', 'Doe', 'john@example.com');";
$sql .= "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('Mary', 'Moe', 'mary@example.com');";
$sql .= "INSERT INTO MyGuests (firstname, lastname, email)
VALUES ('Julie', 'Dooley', 'julie@example.com')";

if (mysqli_multi_query($conn, $sql)) {
    echo "New records created successfully";
} else {
    echo "Error: " . $sql . "<br>" . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO (Using Prepared Statements for Multiple Inserts)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Begin a transaction
    $conn->beginTransaction();

    // Prepare the statement
    $stmt = $conn->prepare("INSERT INTO MyGuests (firstname, lastname, email)
    VALUES (:firstname, :lastname, :email)");

    // Insert row 1
    $stmt->execute([
        ':firstname' => 'John',
        ':lastname' => 'Doe',
        ':email' => 'john@example.com'
    ]);

    // Insert row 2
    $stmt->execute([
        ':firstname' => 'Mary',
        ':lastname' => 'Moe',
        ':email' => 'mary@example.com'
    ]);

    // Insert row 3
    $stmt->execute([
        ':firstname' => 'Julie',
        ':lastname' => 'Dooley',
        ':email' => 'julie@example.com'
    ]);

    // Commit the transaction
    $conn->commit();
    echo "New records created successfully";
} catch(PDOException $e) {
    // Roll back the transaction if something failed
    $conn->rollBack();
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Note:** Each SQL statement in the `multi_query()` string must be separated by a **semicolon**.
The PDO version uses prepared statements and transactions for safer, more reliable batch inserts.

---

## 8. Prepared Statements

> **Source:** <https://www.w3schools.com/php/php_mysql_prepared_statements.asp>

Prepared statements are very useful against **SQL injection**. They are the recommended way to
execute queries with user-supplied data.

### What Are Prepared Statements?

A prepared statement is a feature used to execute the same (or similar) SQL statements
repeatedly with high efficiency. They work in two stages:

1. **Prepare:** A SQL statement template is created and sent to the database. Certain values
   are left unspecified, called **parameters** (labeled `?` or `:name`). Example:
   `INSERT INTO MyGuests VALUES(?, ?, ?)`
2. **Execute:** The database parses, compiles, and optimizes the SQL statement template, and
   stores the result without executing it. The application binds specific values to the
   parameters and executes the statement. The statement can be executed as many times as needed
   with different values.

### Benefits of Prepared Statements

- **Reduced parsing time:** The query is prepared only once even if it is executed multiple times.
- **Reduced bandwidth:** Only the parameters need to be sent each time, not the whole query.
- **Protection against SQL injection:** Parameter values are transmitted later using a different
  protocol and do not need to be escaped. If the original statement template is not derived from
  external input, SQL injection cannot occur.

### MySQLi Prepared Statement (with Bound Parameters)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO MyGuests (firstname, lastname, email) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $firstname, $lastname, $email);

// Set parameters and execute
$firstname = "John";
$lastname = "Doe";
$email = "john@example.com";
$stmt->execute();

$firstname = "Mary";
$lastname = "Moe";
$email = "mary@example.com";
$stmt->execute();

$firstname = "Julie";
$lastname = "Dooley";
$email = "julie@example.com";
$stmt->execute();

echo "New records created successfully";

$stmt->close();
$conn->close();
?>
```

**The `bind_param()` type string argument:**

| Character | Description |
|-----------|-------------|
| `i` | integer |
| `d` | double |
| `s` | string |
| `b` | BLOB (binary large object) |

Each parameter must have a type specified. By telling MySQL what type of data to expect, you
minimize the risk of SQL injection.

### PDO Prepared Statement (with Named Parameters)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Prepare SQL and bind parameters
    $stmt = $conn->prepare("INSERT INTO MyGuests (firstname, lastname, email)
    VALUES (:firstname, :lastname, :email)");
    $stmt->bindParam(':firstname', $firstname);
    $stmt->bindParam(':lastname', $lastname);
    $stmt->bindParam(':email', $email);

    // Insert row 1
    $firstname = "John";
    $lastname = "Doe";
    $email = "john@example.com";
    $stmt->execute();

    // Insert row 2
    $firstname = "Mary";
    $lastname = "Moe";
    $email = "mary@example.com";
    $stmt->execute();

    // Insert row 3
    $firstname = "Julie";
    $lastname = "Dooley";
    $email = "julie@example.com";
    $stmt->execute();

    echo "New records created successfully";
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Note:** In PDO, named parameters (`:firstname`) are used rather than `?` positional
placeholders (though PDO supports both). Named parameters are more readable.

---

## 9. Select Data

> **Source:** <https://www.w3schools.com/php/php_mysql_select.asp>

The `SELECT` statement is used to select data from one or more tables.

### SQL Syntax

```sql
SELECT column_name(s) FROM table_name

-- Or select all columns:
SELECT * FROM table_name
```

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT id, firstname, lastname FROM MyGuests";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // Output data of each row
    while($row = $result->fetch_assoc()) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} else {
    echo "0 results";
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "SELECT id, firstname, lastname FROM MyGuests";
$result = mysqli_query($conn, $sql);

if (mysqli_num_rows($result) > 0) {
    // Output data of each row
    while($row = mysqli_fetch_assoc($result)) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} else {
    echo "0 results";
}

mysqli_close($conn);
?>
```

### PDO (with Prepared Statement)

```php
<?php
echo "<table style='border: solid 1px black;'>";
echo "<tr><th>Id</th><th>Firstname</th><th>Lastname</th></tr>";

class TableRows extends RecursiveIteratorIterator {
    function __construct($it) {
        parent::__construct($it, self::LEAVES_ONLY);
    }

    function current() {
        return "<td style='width:150px;border:1px solid black;'>" . parent::current() . "</td>";
    }

    function beginChildren() {
        echo "<tr>";
    }

    function endChildren() {
        echo "</tr>" . "\n";
    }
}

$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $conn->prepare("SELECT id, firstname, lastname FROM MyGuests");
    $stmt->execute();

    // Set the resulting array to associative
    $result = $stmt->setFetchMode(PDO::FETCH_ASSOC);
    foreach(new TableRows(new RecursiveArrayIterator($stmt->fetchAll())) as $k => $v) {
        echo $v;
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
echo "</table>";
?>
```

**Simpler PDO Select (common pattern):**

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $conn->prepare("SELECT id, firstname, lastname FROM MyGuests");
    $stmt->execute();

    // Fetch all results as an associative array
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Key methods:**

- `$result->num_rows` -- returns the number of rows in the result set (MySQLi OO).
- `$result->fetch_assoc()` -- fetches a result row as an associative array (MySQLi OO).
- `$stmt->fetchAll(PDO::FETCH_ASSOC)` -- returns an array of all rows (PDO).

---

## 10. Select with WHERE

> **Source:** <https://www.w3schools.com/php/php_mysql_select_where.asp>

The `WHERE` clause is used to filter records and extract only those that fulfill specified
conditions.

### SQL Syntax

```sql
SELECT column_name(s) FROM table_name WHERE column_name operator value
```

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT id, firstname, lastname FROM MyGuests WHERE lastname='Doe'";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // Output data of each row
    while($row = $result->fetch_assoc()) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} else {
    echo "0 results";
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "SELECT id, firstname, lastname FROM MyGuests WHERE lastname='Doe'";
$result = mysqli_query($conn, $sql);

if (mysqli_num_rows($result) > 0) {
    while($row = mysqli_fetch_assoc($result)) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} else {
    echo "0 results";
}

mysqli_close($conn);
?>
```

### PDO (with Prepared Statement -- Recommended)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $conn->prepare("SELECT id, firstname, lastname FROM MyGuests WHERE lastname = :lastname");
    $stmt->bindParam(':lastname', $lastname);

    $lastname = "Doe";
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($results as $row) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Common WHERE operators:**

| Operator | Description |
|----------|-------------|
| `=` | Equal |
| `<>` or `!=` | Not equal |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `BETWEEN` | Between an inclusive range |
| `LIKE` | Search for a pattern |
| `IN` | To specify multiple possible values for a column |

**Important:** Always use prepared statements with bound parameters when using user-supplied
values in WHERE clauses to prevent SQL injection.

---

## 11. Select with ORDER BY

> **Source:** <https://www.w3schools.com/php/php_mysql_select_orderby.asp>

The `ORDER BY` clause is used to sort the result-set in ascending or descending order. By
default, it sorts in **ascending** order. Use the `DESC` keyword to sort in descending order.

### SQL Syntax

```sql
SELECT column_name(s) FROM table_name ORDER BY column_name ASC|DESC
```

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT id, firstname, lastname FROM MyGuests ORDER BY lastname";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} else {
    echo "0 results";
}

$conn->close();
?>
```

### Descending Order Example

```php
$sql = "SELECT id, firstname, lastname FROM MyGuests ORDER BY lastname DESC";
```

### Multiple Column Sorting

You can order by more than one column. When ordering by multiple columns, the second column is
only used when the first column values are the same:

```sql
SELECT * FROM MyGuests ORDER BY lastname ASC, firstname ASC
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "SELECT id, firstname, lastname FROM MyGuests ORDER BY lastname";
$result = mysqli_query($conn, $sql);

if (mysqli_num_rows($result) > 0) {
    while($row = mysqli_fetch_assoc($result)) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} else {
    echo "0 results";
}

mysqli_close($conn);
?>
```

### PDO

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $conn->prepare("SELECT id, firstname, lastname FROM MyGuests ORDER BY lastname");
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($results as $row) {
        echo "id: " . $row["id"] . " - Name: " . $row["firstname"] . " " . $row["lastname"] . "<br>";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

---

## 12. Delete Data

> **Source:** <https://www.w3schools.com/php/php_mysql_delete.asp>

The `DELETE` statement is used to delete records from a table.

### SQL Syntax

```sql
DELETE FROM table_name WHERE some_column = some_value
```

**Important:** The `WHERE` clause specifies which records should be deleted. If you omit the
WHERE clause, **ALL records will be deleted!**

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// SQL to delete a record
$sql = "DELETE FROM MyGuests WHERE id=3";

if ($conn->query($sql) === TRUE) {
    echo "Record deleted successfully";
} else {
    echo "Error deleting record: " . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// SQL to delete a record
$sql = "DELETE FROM MyGuests WHERE id=3";

if (mysqli_query($conn, $sql)) {
    echo "Record deleted successfully";
} else {
    echo "Error deleting record: " . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO (with Prepared Statement)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Prepare the delete statement
    $stmt = $conn->prepare("DELETE FROM MyGuests WHERE id = :id");
    $stmt->bindParam(':id', $id);

    $id = 3;
    $stmt->execute();

    echo "Record deleted successfully";
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Warning:** Be very careful when deleting records. You cannot undo this statement!

---

## 13. Update Data

> **Source:** <https://www.w3schools.com/php/php_mysql_update.asp>

The `UPDATE` statement is used to update existing records in a table.

### SQL Syntax

```sql
UPDATE table_name SET column1=value1, column2=value2, ... WHERE some_column=some_value
```

**Important:** The `WHERE` clause specifies which record(s) should be updated. If you omit the
WHERE clause, **ALL records will be updated!**

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "UPDATE MyGuests SET lastname='Doe' WHERE id=2";

if ($conn->query($sql) === TRUE) {
    echo "Record updated successfully";
} else {
    echo "Error updating record: " . $conn->error;
}

$conn->close();
?>
```

### MySQLi Procedural

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "UPDATE MyGuests SET lastname='Doe' WHERE id=2";

if (mysqli_query($conn, $sql)) {
    echo "Record updated successfully";
} else {
    echo "Error updating record: " . mysqli_error($conn);
}

mysqli_close($conn);
?>
```

### PDO (with Prepared Statement)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $conn->prepare("UPDATE MyGuests SET lastname = :lastname WHERE id = :id");
    $stmt->bindParam(':lastname', $lastname);
    $stmt->bindParam(':id', $id);

    $lastname = "Doe";
    $id = 2;
    $stmt->execute();

    echo "Record updated successfully";
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Note:** The `$conn->query($sql)` returns `TRUE` on success. To check how many rows were
affected, use `$conn->affected_rows` (MySQLi) or `$stmt->rowCount()` (PDO).

---

## 14. Select with LIMIT

> **Source:** <https://www.w3schools.com/php/php_mysql_select_limit.asp>

The `LIMIT` clause is used to specify the number of records to return. This is useful for
paginating results or displaying a fixed number of records per page.

### SQL Syntax

```sql
SELECT column_name(s) FROM table_name LIMIT number

-- With offset (for pagination):
SELECT column_name(s) FROM table_name LIMIT offset, count
```

**Note:** The first row starts at offset `0` (not `1`).

### MySQLi Object-Oriented

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT * FROM Orders LIMIT 30";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo "id: " . $row["id"] . "<br>";
    }
} else {
    echo "0 results";
}

$conn->close();
?>
```

### Using LIMIT with an Offset (Pagination)

The `LIMIT` clause can take two values: `LIMIT offset, count`.

- The **offset** specifies where to start returning records (first record is 0).
- The **count** specifies the maximum number of records to return.

```sql
-- Return records 16-30 (start from offset 15, return 15 records):
SELECT * FROM Orders LIMIT 15, 15
```

### Pagination Example

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Number of results per page
$results_per_page = 10;

// Current page (from URL parameter)
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;

// Calculate the offset
$offset = ($page - 1) * $results_per_page;

// Select records with LIMIT and OFFSET
$sql = "SELECT * FROM Orders LIMIT $offset, $results_per_page";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo "id: " . $row["id"] . "<br>";
    }
} else {
    echo "0 results";
}

$conn->close();
?>
```

### PDO with LIMIT (Prepared Statement)

```php
<?php
$servername = "localhost";
$username = "username";
$password = "password";
$dbname = "myDBPDO";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $limit = 10;
    $offset = 0;

    $stmt = $conn->prepare("SELECT * FROM Orders LIMIT :offset, :limit");
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($results as $row) {
        echo "id: " . $row["id"] . "<br>";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}

$conn = null;
?>
```

**Important:** When using LIMIT with prepared statements in PDO, you must explicitly bind
the values as integers using `PDO::PARAM_INT`, otherwise PDO treats them as strings and wraps
them in quotes, which causes a SQL error.

---

## Quick Reference Summary

### Connection Patterns

| Method | Connect | Close |
|--------|---------|-------|
| MySQLi OO | `new mysqli($host, $user, $pass, $db)` | `$conn->close()` |
| MySQLi Proc | `mysqli_connect($host, $user, $pass, $db)` | `mysqli_close($conn)` |
| PDO | `new PDO("mysql:host=$host;dbname=$db", $user, $pass)` | `$conn = null` |

### CRUD Operations

| Operation | SQL Command |
|-----------|-------------|
| **Create** | `INSERT INTO table (col1, col2) VALUES (val1, val2)` |
| **Read** | `SELECT col1, col2 FROM table WHERE condition` |
| **Update** | `UPDATE table SET col1=val1 WHERE condition` |
| **Delete** | `DELETE FROM table WHERE condition` |

### Query Modifiers

| Modifier | Purpose | Example |
|----------|---------|---------|
| `WHERE` | Filter rows | `WHERE id = 1` |
| `ORDER BY` | Sort results | `ORDER BY name ASC` |
| `LIMIT` | Restrict row count | `LIMIT 10` |
| `LIMIT offset, count` | Pagination | `LIMIT 20, 10` |

### MySQLi bind_param Types

| Type | Character |
|------|-----------|
| Integer | `i` |
| Double | `d` |
| String | `s` |
| BLOB | `b` |

### Security Best Practices

1. **Always** use prepared statements with bound parameters for user-supplied data.
2. **Never** insert user input directly into SQL query strings.
3. Use `PDO::ERRMODE_EXCEPTION` to handle errors properly.
4. Validate and sanitize all user input before processing.
5. Use the principle of least privilege for database user accounts.
6. Store database credentials outside the web root and use environment variables when possible.

---

*This reference was consolidated from W3Schools PHP MySQL tutorial pages.*
*Source URLs are listed at the beginning of each section.*
