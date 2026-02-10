# PHP JSON Reference

> Source: <https://www.w3schools.com/php/php_json.asp>

## What is JSON?

JSON stands for **JavaScript Object Notation** and is a syntax for storing and exchanging data. JSON is a text format that is completely language independent. Since the JSON format is text only, it can easily be sent to and from a server, and used as a data format by any programming language.

PHP has some built-in functions to handle JSON:

- `json_encode()` -- Encodes a value to JSON format
- `json_decode()` -- Decodes a JSON string into a PHP variable

## `json_encode()` -- Encoding PHP to JSON

The `json_encode()` function is used to encode a value to JSON format (a valid JSON string).

### Encoding an Associative Array

```php
<?php
$age = array("Peter" => 35, "Ben" => 37, "Joe" => 43);

echo json_encode($age);
?>
```

Output:

```json
{"Peter":35,"Ben":37,"Joe":43}
```

### Encoding an Indexed Array

```php
<?php
$cars = array("Volvo", "BMW", "Toyota");

echo json_encode($cars);
?>
```

Output:

```json
["Volvo","BMW","Toyota"]
```

### Encoding a PHP Object

```php
<?php
$myObj = new stdClass();
$myObj->name = "John";
$myObj->age = 30;
$myObj->city = "New York";

echo json_encode($myObj);
?>
```

Output:

```json
{"name":"John","age":30,"city":"New York"}
```

## `json_decode()` -- Decoding JSON to PHP

The `json_decode()` function is used to decode a JSON string into a PHP object or associative array.

### Syntax

```php
json_decode(string, assoc, depth, options)
```

### Parameters

| Parameter | Description                                                                                                   |
|-----------|---------------------------------------------------------------------------------------------------------------|
| `string`  | Required. Specifies the JSON string to be decoded.                                                            |
| `assoc`   | Optional. If set to `true`, the returned object will be converted into an associative array. Default is `false`. |
| `depth`   | Optional. Specifies the maximum recursion depth. Default is `512`.                                            |
| `options` | Optional. Specifies a bitmask (e.g., `JSON_BIGINT_AS_STRING`).                                               |

### Decoding JSON into a PHP Object (default)

By default, the `json_decode()` function returns an object:

```php
<?php
$jsonobj = '{"Peter":35,"Ben":37,"Joe":43}';

$obj = json_decode($jsonobj);

echo $obj->Peter;  // Outputs: 35
echo $obj->Ben;    // Outputs: 37
echo $obj->Joe;    // Outputs: 43
?>
```

### Decoding JSON into an Associative Array

When the second parameter is set to `true`, the JSON string is decoded into an associative array:

```php
<?php
$jsonobj = '{"Peter":35,"Ben":37,"Joe":43}';

$arr = json_decode($jsonobj, true);

echo $arr["Peter"];  // Outputs: 35
echo $arr["Ben"];    // Outputs: 37
echo $arr["Joe"];    // Outputs: 43
?>
```

## Accessing Decoded Values

### From an Object

Use the arrow (`->`) operator to access values from a decoded object:

```php
<?php
$jsonobj = '{"Peter":35,"Ben":37,"Joe":43}';

$obj = json_decode($jsonobj);

echo $obj->Peter;
echo $obj->Ben;
echo $obj->Joe;
?>
```

### From an Associative Array

Use square bracket syntax to access values from a decoded associative array:

```php
<?php
$jsonobj = '{"Peter":35,"Ben":37,"Joe":43}';

$arr = json_decode($jsonobj, true);

echo $arr["Peter"];
echo $arr["Ben"];
echo $arr["Joe"];
?>
```

## Looping Through Values

### Looping Through an Object

Use a `foreach` loop to loop through the values of a decoded object:

```php
<?php
$jsonobj = '{"Peter":35,"Ben":37,"Joe":43}';

$obj = json_decode($jsonobj);

foreach($obj as $key => $value) {
    echo $key . " => " . $value . "<br>";
}
?>
```

Output:

```
Peter => 35
Ben => 37
Joe => 43
```

### Looping Through an Associative Array

Use a `foreach` loop to loop through the values of a decoded associative array:

```php
<?php
$jsonobj = '{"Peter":35,"Ben":37,"Joe":43}';

$arr = json_decode($jsonobj, true);

foreach($arr as $key => $value) {
    echo $key . " => " . $value . "<br>";
}
?>
```

Output:

```
Peter => 35
Ben => 37
Joe => 43
```
