# PHP Forms Reference

This reference consolidates key educational content from W3Schools covering PHP form handling, validation, required fields, URL/email validation, and a complete working example.

---

## PHP Form Handling

> **Source:** <https://www.w3schools.com/php/php_forms.asp>

### How PHP Forms Work

The PHP superglobals `$_GET` and `$_POST` are used to collect form data. When a user fills out a form and clicks submit, the form data is sent to a PHP file specified in the `action` attribute of the `<form>` tag.

### A Simple HTML Form

```html
<html>
<body>

<form action="welcome.php" method="post">
  Name: <input type="text" name="name"><br>
  E-mail: <input type="text" name="email"><br>
  <input type="submit">
</form>

</body>
</html>
```

When the user fills out the form and clicks submit, the form data is sent via HTTP POST to `welcome.php`. The processing file can then access the data:

```php
<html>
<body>

Welcome <?php echo $_POST["name"]; ?><br>
Your email address is: <?php echo $_POST["email"]; ?>

</body>
</html>
```

### Using the GET Method

```html
<form action="welcome_get.php" method="get">
  Name: <input type="text" name="name"><br>
  E-mail: <input type="text" name="email"><br>
  <input type="submit">
</form>
```

```php
<html>
<body>

Welcome <?php echo $_GET["name"]; ?><br>
Your email address is: <?php echo $_GET["email"]; ?>

</body>
</html>
```

### GET vs. POST

| Feature | GET | POST |
|---------|-----|------|
| Visibility | Data is visible in the URL (as query string parameters) | Data is NOT displayed in the URL |
| Bookmarking | Pages can be bookmarked with query string values | Pages cannot be bookmarked with submitted data |
| Data length | Limited (max URL length is approximately 2048 characters) | No limitations on data size |
| Security | Should NEVER be used for sending sensitive data (passwords, etc.) | More secure than GET for sensitive data |
| Caching | Requests can be cached | Requests are not cached |
| Browser history | Parameters remain in browser history | Parameters are not saved in browser history |
| Use case | Non-sensitive data, search queries, filter parameters | Sensitive data, form submissions that change data |

**Important:** Both `$_GET` and `$_POST` are superglobal arrays. They are always accessible regardless of scope, and you can access them from any function, class, or file without having to do anything special.

---

## PHP Form Validation

> **Source:** <https://www.w3schools.com/php/php_form_validation.asp>

### Think Security When Processing PHP Forms

These pages show how to process PHP forms with security in mind. Proper validation of form data is important to protect your form from hackers and spammers.

### The HTML Form

The form used throughout this tutorial:

- **Fields:** Name, E-mail, Website, Comment, Gender
- **Validation rules:**

| Field   | Validation Rules |
|---------|-----------------|
| Name    | Required. Must only contain letters and whitespace |
| E-mail  | Required. Must contain a valid email address (with `@` and `.`) |
| Website | Optional. If present, must contain a valid URL |
| Comment | Optional. Multi-line input field (textarea) |
| Gender  | Required. Must select one |

### The Form Element

```html
<form method="post" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>">
```

The `$_SERVER["PHP_SELF"]` variable returns the filename of the currently executing script. So the form data is sent to the page itself instead of a different page.

### What is `$_SERVER["PHP_SELF"]`?

`$_SERVER["PHP_SELF"]` is a superglobal variable that returns the filename of the currently executing script relative to the document root.

### Big Note on PHP Form Security

The `$_SERVER["PHP_SELF"]` variable can be exploited by hackers via **Cross-Site Scripting (XSS)** attacks.

**XSS** enables attackers to inject client-side script into web pages viewed by other users. For example, if the form is on a page called `test_form.php`, a user could enter the following URL:

```
http://www.example.com/test_form.php/%22%3E%3Cscript%3Ealert('hacked')%3C/script%3E
```

This translates to:

```html
<form method="post" action="test_form.php/"><script>alert('hacked')</script>
```

The `<script>` tag is added and the `alert` command is executed. This is just a simple example. Any JavaScript code can be added inside `<script>` tags, and a hacker could redirect the user to a file on another server that holds malicious code that can alter global variables or submit the form to another address.

### How to Avoid `$_SERVER["PHP_SELF"]` Exploits

Use `htmlspecialchars()`:

```php
<form method="post" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>">
```

The `htmlspecialchars()` function converts special characters to HTML entities. Now if a user tries to exploit `PHP_SELF`, the output is safely rendered as:

```html
<form method="post" action="test_form.php/&quot;&gt;&lt;script&gt;alert('hacked')&lt;/script&gt;">
```

The exploit attempt fails because the code is escaped and treated as plain text.

### Validate Form Data with PHP

1. Strip unnecessary characters (extra spaces, tabs, newlines) from user input with `trim()`
2. Remove backslashes from user input with `stripslashes()`
3. Convert special characters to HTML entities with `htmlspecialchars()`

### The `test_input()` Function

Create a reusable function to do all the checking:

```php
<?php
function test_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}
?>
```

### Processing the Form

```php
<?php
// Define variables and set to empty values
$name = $email = $gender = $comment = $website = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = test_input($_POST["name"]);
    $email = test_input($_POST["email"]);
    $website = test_input($_POST["website"]);
    $comment = test_input($_POST["comment"]);
    $gender = test_input($_POST["gender"]);
}
?>
```

**Important:** At the start of the script, we check whether the form has been submitted using `$_SERVER["REQUEST_METHOD"]`. If the `REQUEST_METHOD` is `POST`, then the form has been submitted and it should be validated.

---

## PHP Form Required Fields

> **Source:** <https://www.w3schools.com/php/php_form_required.asp>

### Making Fields Required

In the previous section, all input fields were optional. In this section, we add validation to make certain fields required and create error messages when needed.

### Adding Error Variables

Define error variables for each required field and initialize them as empty:

```php
<?php
// Define variables and set to empty values
$nameErr = $emailErr = $genderErr = $websiteErr = "";
$name = $email = $gender = $comment = $website = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (empty($_POST["name"])) {
        $nameErr = "Name is required";
    } else {
        $name = test_input($_POST["name"]);
    }

    if (empty($_POST["email"])) {
        $emailErr = "Email is required";
    } else {
        $email = test_input($_POST["email"]);
    }

    if (empty($_POST["website"])) {
        $website = "";
    } else {
        $website = test_input($_POST["website"]);
    }

    if (empty($_POST["comment"])) {
        $comment = "";
    } else {
        $comment = test_input($_POST["comment"]);
    }

    if (empty($_POST["gender"])) {
        $genderErr = "Gender is required";
    } else {
        $gender = test_input($_POST["gender"]);
    }
}
?>
```

### The `empty()` Function

The `empty()` function checks whether a variable is empty, null, or has a falsy value. It returns `true` for empty strings, `null`, `0`, `"0"`, `false`, and undefined variables.

### Displaying Error Messages

In the HTML form, display the error messages next to the corresponding fields:

```html
<form method="post" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>">

  Name: <input type="text" name="name">
  <span class="error">* <?php echo $nameErr; ?></span>
  <br><br>

  E-mail: <input type="text" name="email">
  <span class="error">* <?php echo $emailErr; ?></span>
  <br><br>

  Website: <input type="text" name="website">
  <span class="error"><?php echo $websiteErr; ?></span>
  <br><br>

  Comment: <textarea name="comment" rows="5" cols="40"></textarea>
  <br><br>

  Gender:
  <input type="radio" name="gender" value="female">Female
  <input type="radio" name="gender" value="male">Male
  <input type="radio" name="gender" value="other">Other
  <span class="error">* <?php echo $genderErr; ?></span>
  <br><br>

  <input type="submit" name="submit" value="Submit">

</form>
```

### Styling Error Messages

Use CSS to make error messages stand out:

```css
.error {
    color: #FF0000;
}
```

### Required Field Indicators

It is common to place an asterisk `*` next to required fields to indicate they must be filled out. The asterisk can be added directly in the HTML or dynamically with PHP.

---

## PHP Form URL and Email Validation

> **Source:** <https://www.w3schools.com/php/php_form_url_email.asp>

### Validating a Name

Check that the name field only contains letters, dashes, apostrophes, and whitespace using `preg_match()`:

```php
$name = test_input($_POST["name"]);
if (!preg_match("/^[a-zA-Z-' ]*$/", $name)) {
    $nameErr = "Only letters and white space allowed";
}
```

The `preg_match()` function searches a string for a pattern, returning `1` if the pattern was found and `0` if not.

### Validating an E-mail Address

Check that an e-mail address is well-formed using `filter_var()`:

```php
$email = test_input($_POST["email"]);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $emailErr = "Invalid email format";
}
```

The `filter_var()` function filters a variable with the specified filter. `FILTER_VALIDATE_EMAIL` validates whether the value is a valid email address.

### Validating a URL

Check that a URL is valid using `preg_match()`:

```php
$website = test_input($_POST["website"]);
if (!preg_match("/\b(?:https?|ftp):\/\/|www\.[-a-z0-9+&@#\/%?=~_|!:,.;]*[-a-z0-9+&@#\/%=~_|]/i", $website)) {
    $websiteErr = "Invalid URL";
}
```

Alternatively, `filter_var()` can also validate URLs:

```php
if (!filter_var($website, FILTER_VALIDATE_URL)) {
    $websiteErr = "Invalid URL";
}
```

### Combined Validation Logic

Incorporate all validation checks within the form processing block:

```php
<?php
$nameErr = $emailErr = $genderErr = $websiteErr = "";
$name = $email = $gender = $comment = $website = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (empty($_POST["name"])) {
        $nameErr = "Name is required";
    } else {
        $name = test_input($_POST["name"]);
        if (!preg_match("/^[a-zA-Z-' ]*$/", $name)) {
            $nameErr = "Only letters and white space allowed";
        }
    }

    if (empty($_POST["email"])) {
        $emailErr = "Email is required";
    } else {
        $email = test_input($_POST["email"]);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $emailErr = "Invalid email format";
        }
    }

    if (empty($_POST["website"])) {
        $website = "";
    } else {
        $website = test_input($_POST["website"]);
        if (!preg_match("/\b(?:https?|ftp):\/\/|www\.[-a-z0-9+&@#\/%?=~_|!:,.;]*[-a-z0-9+&@#\/%=~_|]/i", $website)) {
            $websiteErr = "Invalid URL";
        }
    }

    if (empty($_POST["comment"])) {
        $comment = "";
    } else {
        $comment = test_input($_POST["comment"]);
    }

    if (empty($_POST["gender"])) {
        $genderErr = "Gender is required";
    } else {
        $gender = test_input($_POST["gender"]);
    }
}
?>
```

### PHP Validation Functions Reference

| Function | Purpose |
|----------|---------|
| `preg_match(pattern, string)` | Tests whether a string matches a regular expression pattern. Returns `1` if matched, `0` if not. |
| `filter_var(value, filter)` | Filters a variable with a specified filter constant. Returns the filtered data on success, or `false` on failure. |
| `FILTER_VALIDATE_EMAIL` | Filter constant that validates an email address format. |
| `FILTER_VALIDATE_URL` | Filter constant that validates a URL format. |

---

## PHP Complete Form Example

> **Source:** <https://www.w3schools.com/php/php_form_complete.asp>

### Retaining Form Values After Submission

To show the values in the input fields after the user hits the submit button, add a small PHP script inside the `value` attribute of each input element and inside the textarea element. This way, the form retains the user's entered data even when validation errors occur.

Use `<?php echo $variable; ?>` to output the value:

```html
Name: <input type="text" name="name" value="<?php echo $name; ?>">

E-mail: <input type="text" name="email" value="<?php echo $email; ?>">

Website: <input type="text" name="website" value="<?php echo $website; ?>">

Comment: <textarea name="comment" rows="5" cols="40"><?php echo $comment; ?></textarea>
```

### Retaining Radio Button Selection

For radio buttons, check whether the value was previously selected using a conditional:

```html
Gender:
<input type="radio" name="gender"
  <?php if (isset($gender) && $gender == "female") echo "checked"; ?>
  value="female">Female

<input type="radio" name="gender"
  <?php if (isset($gender) && $gender == "male") echo "checked"; ?>
  value="male">Male

<input type="radio" name="gender"
  <?php if (isset($gender) && $gender == "other") echo "checked"; ?>
  value="other">Other
```

### The Complete PHP Form Script

```php
<?php
// Define variables and set to empty values
$nameErr = $emailErr = $genderErr = $websiteErr = "";
$name = $email = $gender = $comment = $website = "";

function test_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (empty($_POST["name"])) {
        $nameErr = "Name is required";
    } else {
        $name = test_input($_POST["name"]);
        // Check if name only contains letters and whitespace
        if (!preg_match("/^[a-zA-Z-' ]*$/", $name)) {
            $nameErr = "Only letters and white space allowed";
        }
    }

    if (empty($_POST["email"])) {
        $emailErr = "Email is required";
    } else {
        $email = test_input($_POST["email"]);
        // Check if e-mail address is well-formed
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $emailErr = "Invalid email format";
        }
    }

    if (empty($_POST["website"])) {
        $website = "";
    } else {
        $website = test_input($_POST["website"]);
        // Check if URL address syntax is valid
        if (!preg_match("/\b(?:https?|ftp):\/\/|www\.[-a-z0-9+&@#\/%?=~_|!:,.;]*[-a-z0-9+&@#\/%=~_|]/i", $website)) {
            $websiteErr = "Invalid URL";
        }
    }

    if (empty($_POST["comment"])) {
        $comment = "";
    } else {
        $comment = test_input($_POST["comment"]);
    }

    if (empty($_POST["gender"])) {
        $genderErr = "Gender is required";
    } else {
        $gender = test_input($_POST["gender"]);
    }
}
?>
```

### The Complete HTML Form

```html
<!DOCTYPE HTML>
<html>
<head>
<style>
.error {color: #FF0000;}
</style>
</head>
<body>

<h2>PHP Form Validation Example</h2>
<p><span class="error">* required field</span></p>

<form method="post" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>">

  Name: <input type="text" name="name" value="<?php echo $name; ?>">
  <span class="error">* <?php echo $nameErr; ?></span>
  <br><br>

  E-mail: <input type="text" name="email" value="<?php echo $email; ?>">
  <span class="error">* <?php echo $emailErr; ?></span>
  <br><br>

  Website: <input type="text" name="website" value="<?php echo $website; ?>">
  <span class="error"><?php echo $websiteErr; ?></span>
  <br><br>

  Comment: <textarea name="comment" rows="5" cols="40"><?php echo $comment; ?></textarea>
  <br><br>

  Gender:
  <input type="radio" name="gender"
    <?php if (isset($gender) && $gender == "female") echo "checked"; ?>
    value="female">Female
  <input type="radio" name="gender"
    <?php if (isset($gender) && $gender == "male") echo "checked"; ?>
    value="male">Male
  <input type="radio" name="gender"
    <?php if (isset($gender) && $gender == "other") echo "checked"; ?>
    value="other">Other
  <span class="error">* <?php echo $genderErr; ?></span>
  <br><br>

  <input type="submit" name="submit" value="Submit">

</form>

<?php
echo "<h2>Your Input:</h2>";
echo $name;
echo "<br>";
echo $email;
echo "<br>";
echo $website;
echo "<br>";
echo $comment;
echo "<br>";
echo $gender;
?>

</body>
</html>
```

### Summary of Key Functions

| Function | Purpose |
|----------|---------|
| `htmlspecialchars()` | Converts special characters (`<`, `>`, `&`, `"`, `'`) to HTML entities to prevent XSS |
| `trim()` | Strips whitespace (or other characters) from the beginning and end of a string |
| `stripslashes()` | Removes backslashes from a string |
| `empty()` | Checks whether a variable is empty, null, or falsy |
| `isset()` | Checks whether a variable is set and is not null |
| `preg_match()` | Performs a regular expression match on a string |
| `filter_var()` | Filters a variable with a specified filter |
| `$_POST` | Superglobal array that collects form data sent with the POST method |
| `$_GET` | Superglobal array that collects form data sent with the GET method |
| `$_SERVER["PHP_SELF"]` | Returns the filename of the currently executing script |
| `$_SERVER["REQUEST_METHOD"]` | Returns the request method used to access the page (e.g., `POST`, `GET`) |

### Key Takeaways

1. **Always sanitize user input** using `trim()`, `stripslashes()`, and `htmlspecialchars()` via a reusable `test_input()` function.
2. **Protect against XSS** by passing `$_SERVER["PHP_SELF"]` through `htmlspecialchars()` in the form action attribute.
3. **Use `$_SERVER["REQUEST_METHOD"]`** to check if the form was submitted before processing.
4. **Validate required fields** with `empty()` and display error messages next to each field.
5. **Validate data formats** using `preg_match()` for patterns (names, URLs) and `filter_var()` for emails and URLs.
6. **Retain form values** after submission by echoing variables back into input `value` attributes and textarea content.
7. **Retain radio button state** by conditionally adding the `checked` attribute using `isset()` and value comparison.
8. **POST is preferred** over GET for form submissions that contain sensitive or large amounts of data.
