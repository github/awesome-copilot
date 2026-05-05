# Data Formats & Encoding Reference

Data formats, character encodings, and serialization for web development.

## JSON (JavaScript Object Notation)

Lightweight data interchange format.

### Syntax

```json
{
  "string": "value",
  "number": 42,
  "boolean": true,
  "null": null,
  "array": [1, 2, 3],
  "object": {
    "nested": "value"
  }
}
```

**Permitted Types**: string, number, boolean, null, array, object  
**Not Permitted**: undefined, functions, dates, RegExp

### JavaScript Methods

```javascript
// Parse JSON string
const data = JSON.parse('{"name":"John","age":30}');

// Stringify object
const json = JSON.stringify({ name: 'John', age: 30 });

// Pretty print (indentation)
const json = JSON.stringify(data, null, 2);

// Custom serialization
const json = JSON.stringify(obj, (key, value) => {
  if (key === 'password') return undefined; // Exclude
  return value;
});

// toJSON method
const obj = {
  name: 'John',
  date: new Date(),
  toJSON() {
    return {
      name: this.name,
      date: this.date.toISOString()
    };
  }
};
```

### JSON Type Representation

How JavaScript types map to JSON:
- String → string
- Number → number
- Boolean → boolean
- null → null
- Array → array
- Object → object
- undefined → omitted
- Function → omitted
- Symbol → omitted
- Date → ISO 8601 string

## XML (Extensible Markup Language)

Markup language for encoding documents.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<users>
  <user id="1">
    <name>John Doe</name>
    <email>john@example.com</email>
  </user>
  <user id="2">
    <name>Jane Smith</name>
    <email>jane@example.com</email>
  </user>
</users>
```

**Use Cases**:
- Configuration files
- Data exchange
- RSS/Atom feeds
- SOAP web services

### Parsing XML in JavaScript

```javascript
// Parse XML string
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

// Query elements
const users = xmlDoc.querySelectorAll('user');
users.forEach(user => {
  const name = user.querySelector('name').textContent;
  console.log(name);
});

// Create XML
const serializer = new XMLSerializer();
const xmlString = serializer.serializeToString(xmlDoc);
```

## Character Encoding

### UTF-8

Universal character encoding (recommended for web).

**Characteristics**:
- Variable-width (1-4 bytes per character)
- Backward compatible with ASCII
- Supports all Unicode characters

```html
<meta charset="UTF-8">
```

### UTF-16

2 or 4 bytes per character.

**Use**: JavaScript internally uses UTF-16

```javascript
'A'.charCodeAt(0); // 65
String.fromCharCode(65); // 'A'

// Emoji (requires surrogate pair in UTF-16)
'😀'.length; // 2 (in JavaScript)
```

### ASCII

7-bit encoding (128 characters).

**Range**: 0-127  
**Includes**: English letters, digits, common symbols

### Code Point vs Code Unit

- **Code Point**: Unicode character (U+0041 = 'A')
- **Code Unit**: 16-bit value in UTF-16

```javascript
// Code points
'A'.codePointAt(0); // 65
String.fromCodePoint(0x1F600); // '😀'

// Iterate code points
for (const char of 'Hello 😀') {
  console.log(char);
}
```

## Base64

Binary-to-text encoding scheme.

```javascript
// Encode
const encoded = btoa('Hello World'); // "SGVsbG8gV29ybGQ="

// Decode
const decoded = atob('SGVsbG8gV29ybGQ='); // "Hello World"

// Handle Unicode (requires extra step)
const encoded = btoa(unescape(encodeURIComponent('Hello 世界')));
const decoded = decodeURIComponent(escape(atob(encoded)));

// Modern approach
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytes = encoder.encode('Hello 世界');
const decoded = decoder.decode(bytes);
```

**Use Cases**:
- Embed binary data in JSON/XML
- Data URLs (`data:image/png;base64,...`)
- Basic authentication headers

## URL Encoding (Percent Encoding)

Encode special characters in URLs.

```javascript
// encodeURIComponent (encode everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( ))
const encoded = encodeURIComponent('Hello World!'); // "Hello%20World%21"
const decoded = decodeURIComponent(encoded); // "Hello World!"

// encodeURI (encode less - for full URLs)
const url = encodeURI('http://example.com/search?q=hello world');

// Modern URL API
const url = new URL('http://example.com/search');
url.searchParams.set('q', 'hello world');
console.log(url.toString()); // Automatically encoded
```

## MIME Types

Media type identification.

### Common MIME Types

| Type | MIME Type |
|------|-----------|
| HTML | `text/html` |
| CSS | `text/css` |
| JavaScript | `text/javascript`, `application/javascript` |
| JSON | `application/json` |
| XML | `application/xml`, `text/xml` |
| Plain Text | `text/plain` |
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| GIF | `image/gif` |
| SVG | `image/svg+xml` |
| PDF | `application/pdf` |
| ZIP | `application/zip` |
| MP4 Video | `video/mp4` |
| MP3 Audio | `audio/mpeg` |
| Form Data | `application/x-www-form-urlencoded` |
| Multipart | `multipart/form-data` |

```html
<link rel="stylesheet" href="styles.css" type="text/css">
<script src="app.js" type="text/javascript"></script>
```

```http
Content-Type: application/json; charset=utf-8
Content-Type: text/html; charset=utf-8
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
```

## Serialization & Deserialization

Converting data structures to/from storable format.

### JSON Serialization

```javascript
// Serialize
const obj = { name: 'John', date: new Date() };
const json = JSON.stringify(obj);

// Deserialize
const parsed = JSON.parse(json);
```

### Serializable Objects

Objects that can be serialized by structured clone algorithm:
- Basic types
- Arrays, Objects,
- Date, RegExp
- Map, Set
- ArrayBuffer, TypedArrays

**Not Serializable**:
- Functions
- DOM nodes
- Symbols (as values)
- Objects with prototype methods

## Character References

HTML entities for special characters.

```html
&lt;    <!-- < -->
&gt;    <!-- > -->
&amp;   <!-- & -->
&quot;  <!-- " -->
&apos;  <!-- ' -->
&nbsp;  <!-- non-breaking space -->
&copy;  <!-- © -->
&#8364; <!-- € -->
&#x20AC; <!-- € (hex) -->
```

## Data URLs

Embed data directly in URLs.

```html
<!-- Inline image -->
<img src="data:image/png;base64,iVBORw0KGgoAAAANS..." alt="Icon">

<!-- Inline SVG -->
<img src="data:image/svg+xml,%3Csvg xmlns='...'%3E...%3C/svg%3E" alt="Logo">

<!-- Inline CSS -->
<link rel="stylesheet" href="data:text/css,body%7Bmargin:0%7D">
```

```javascript
// Create data URL from canvas
const canvas = document.querySelector('canvas');
const dataURL = canvas.toDataURL('image/png');

// Create data URL from blob
const blob = new Blob(['Hello'], { type: 'text/plain' });
const reader = new FileReader();
reader.onload = () => {
  const dataURL = reader.result;
};
reader.readAsDataURL(blob);
```

## Escape Sequences

```javascript
// String escapes
'It\'s a string'; // Single quote
"He said \"Hello\""; // Double quote
'Line 1\nLine 2'; // Newline
'Column1\tColumn2'; // Tab
'Path\\to\\file'; // Backslash
```

## Data Structures

### Arrays

Ordered collections:
```javascript
const arr = [1, 2, 3];
arr.push(4); // Add to end
arr.pop(); // Remove from end
```

### Objects

Key-value pairs:
```javascript
const obj = { key: 'value' };
obj.newKey = 'new value';
delete obj.key;
```

### Map

Keyed collections (any type as key):
```javascript
const map = new Map();
map.set('key', 'value');
map.set(obj, 'value');
map.get('key');
map.has('key');
map.delete('key');
```

### Set

Unique values:
```javascript
const set = new Set([1, 2, 2, 3]); // {1, 2, 3}
set.add(4);
set.has(2); // true
set.delete(1);
```

## Glossary Terms

**Key Terms Covered**:
- ASCII
- Base64
- Character
- Character encoding
- Character reference
- Character set
- Code point
- Code unit
- Data structure
- Deserialization
- Enumerated
- Escape character
- JSON
- JSON type representation
- MIME
- MIME type
- Percent-encoding
- Serialization
- Serializable object
- Unicode
- URI
- URL
- URN
- UTF-8
- UTF-16

## Additional Resources

- [JSON Specification](https://www.json.org/)
- [Unicode Standard](https://unicode.org/standard/standard.html)
- [MDN Character Encodings](https://developer.mozilla.org/en-US/docs/Glossary/Character_encoding)
- [MIME Types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)
