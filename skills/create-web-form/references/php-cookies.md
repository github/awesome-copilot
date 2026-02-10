# PHP Cookies Reference

> Source: <https://www.w3schools.com/php/php_cookies.asp>

## What is a Cookie?

A cookie is often used to identify a user. It is a small file that the server embeds on the user's computer. Each time the same computer requests a page with a browser, it will send the cookie too. With PHP, you can both create and retrieve cookie values.

## Create a Cookie with `setcookie()`

A cookie is created with the `setcookie()` function.

### Syntax

```php
setcookie(name, value, expire, path, domain, secure, httponly);
```

### Parameters

| Parameter  | Description                                                                                             |
|------------|---------------------------------------------------------------------------------------------------------|
| `name`     | Required. Specifies the name of the cookie.                                                             |
| `value`    | Optional. Specifies the value of the cookie.                                                            |
| `expire`   | Optional. Specifies when the cookie expires. The value `time() + 86400 * 30` will set the cookie to expire in 30 days. If this parameter is omitted or set to `0`, the cookie will expire at the end of the session (when the browser closes). Default is `0`. |
| `path`     | Optional. Specifies the server path of the cookie. If set to `"/"`, the cookie will be available within the entire domain. If set to `"/php/"`, the cookie will only be available within the `php` directory and all sub-directories of `php`. The default value is the current directory that the cookie is being set in. |
| `domain`   | Optional. Specifies the domain name of the cookie. To make the cookie available on all subdomains of `example.com`, set domain to `".example.com"`. |
| `secure`   | Optional. Specifies whether or not the cookie should only be transmitted over a secure HTTPS connection. `true` means the cookie will only be set if a secure connection exists. Default is `false`. |
| `httponly`  | Optional. If set to `true` the cookie will be accessible only through the HTTP protocol (the cookie will not be accessible by scripting languages, such as JavaScript). This setting can help to reduce identity theft through XSS attacks. Default is `false`. |

**Note:** The `setcookie()` function must appear BEFORE the `<html>` tag (before any output is sent to the browser).

### Example: Create a Cookie

The following example creates a cookie named "user" with the value "John Doe". The cookie will expire after 30 days. The `"/"` means that the cookie is available across the entire website:

```php
<?php
$cookie_name = "user";
$cookie_value = "John Doe";
setcookie($cookie_name, $cookie_value, time() + (86400 * 30), "/"); // 86400 = 1 day
?>
<html>
<body>

<?php
if(!isset($_COOKIE[$cookie_name])) {
    echo "Cookie named '" . $cookie_name . "' is not set!";
} else {
    echo "Cookie '" . $cookie_name . "' is set!<br>";
    echo "Value is: " . $_COOKIE[$cookie_name];
}
?>

</body>
</html>
```

**Note:** The `setcookie()` function sends the cookie as part of the HTTP response header. A cookie is not visible to the current page until the next loading of a page that the cookie should be visible for. So to test the cookie, the page must be reloaded or another page must be navigated to.

## Retrieve a Cookie Value

The PHP `$_COOKIE` superglobal variable is used to retrieve a cookie value.

```php
<?php
if(!isset($_COOKIE["user"])) {
    echo "Cookie named 'user' is not set!";
} else {
    echo "Cookie 'user' is set!<br>";
    echo "Value is: " . $_COOKIE["user"];
}
?>
```

**Tip:** Use the `isset()` function to find out if a cookie is set before attempting to access its value.

## Modify a Cookie Value

To modify a cookie, just set (again) the cookie using the `setcookie()` function:

```php
<?php
$cookie_name = "user";
$cookie_value = "Alex Porter";
setcookie($cookie_name, $cookie_value, time() + (86400 * 30), "/");
?>
<html>
<body>

<?php
if(!isset($_COOKIE[$cookie_name])) {
    echo "Cookie named '" . $cookie_name . "' is not set!";
} else {
    echo "Cookie '" . $cookie_name . "' is set!<br>";
    echo "Value is: " . $_COOKIE[$cookie_name];
}
?>

</body>
</html>
```

## Delete a Cookie

To delete a cookie, use the `setcookie()` function with an expiration date in the past:

```php
<?php
// Set the expiration date to one hour ago
setcookie("user", "", time() - 3600);
?>
<html>
<body>

<?php
echo "Cookie 'user' is deleted.";
?>

</body>
</html>
```

## Check if Cookies are Enabled

The following example creates a small script that checks whether cookies are enabled. First, try to create a test cookie with the `setcookie()` function, then count the `$_COOKIE` array variable:

```php
<?php
setcookie("test_cookie", "test", time() + 3600, '/');
?>
<html>
<body>

<?php
if(count($_COOKIE) > 0) {
    echo "Cookies are enabled.";
} else {
    echo "Cookies are disabled.";
}
?>

</body>
</html>
```
