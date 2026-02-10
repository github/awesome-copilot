# XML Reference

---

## XML Introduction

> Source: <https://developer.mozilla.org/en-US/docs/Web/XML/Guides/XML_introduction>

### Overview

**XML (Extensible Markup Language)** is a markup language similar to HTML, but without predefined tags. Instead, you define your own tags designed for your specific needs. It enables powerful data storage in a standardized format that can be stored, searched, and shared across systems and platforms.

**XML-based languages include:** XHTML, MathML, SVG, RSS, and RDF.

### Structure of an XML Document

#### XML Declaration

An XML declaration transmits metadata about the document.

```xml
<?xml version="1.0" encoding="UTF-8"?>
```

**Attributes:**

- **`version`** -- The XML version used in the document.
- **`encoding`** -- The character encoding used in the document.

#### Comments

```xml
<!-- Comment -->
```

### "Correct" XML (Valid and Well-Formed)

For an XML document to be correct, it must fulfill these conditions:

1. Document must be **well-formed**.
2. Document must conform to **all XML syntax rules**.
3. Document must conform to **semantic rules** (usually set in an XML schema or DTD).

#### Example -- Incorrect XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<message>
    <warning>
        Hello World
    <!--missing </warning> -->
</message>
```

#### Example -- Corrected XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<message>
    <warning>
         Hello World
    </warning>
</message>
```

A document containing undefined tags is invalid. Tags must be properly defined in a schema or DTD.

### Character References

Like HTML, XML uses character references for special reserved characters:

| Entity    | Character | Description              |
|-----------|-----------|--------------------------|
| `&lt;`    | `<`       | Less than sign           |
| `&gt;`    | `>`       | Greater than sign        |
| `&amp;`   | `&`       | Ampersand                |
| `&quot;`  | `"`       | Double quotation mark    |
| `&apos;`  | `'`       | Apostrophe / single quote |

#### Custom Entity Definition

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE body [
  <!ENTITY warning "Warning: Something bad happened... please refresh and try again.">
]>
<body>
  <message> &warning; </message>
</body>
```

#### Numeric Character References

Use numeric references for special characters:

- `&#xA9;` = (c) (copyright symbol)

### Displaying XML

#### Using a CSS Stylesheet

```xml
<?xml-stylesheet type="text/css" href="stylesheet.css"?>
```

#### Using XSLT (Recommended for Complex Transformations)

```xml
<?xml-stylesheet type="text/xsl" href="transform.xsl"?>
```

**XSLT (Extensible Stylesheet Language Transformations)** is a powerful method to transform XML into other languages such as HTML, making XML incredibly versatile.

### Key Takeaways

- XML is **standardized**, ensuring data can be parsed consistently across systems.
- XML documents require proper **nesting and closing of tags** to be well-formed.
- XML is **platform and language agnostic**.
- Use **DTD or XML Schema** to define valid tag structures.
- Use **XSLT** for powerful XML transformation capabilities.

---

## Parsing and Serializing XML

> Source: <https://developer.mozilla.org/en-US/docs/Web/XML/Guides/Parsing_and_serializing_XML>

### Overview

At times, you may need to parse XML content and convert it into a DOM tree, or conversely, serialize an existing DOM tree into XML.

### Key Web Platform Objects

| Object               | Purpose                                                                                      |
|----------------------|----------------------------------------------------------------------------------------------|
| **XMLSerializer**    | Serializes DOM trees, converting them into strings containing XML                            |
| **DOMParser**        | Constructs a DOM tree by parsing a string containing XML, returning an XMLDocument or Document |
| **fetch()**          | Loads content from a URL; XML content is returned as a text string you can parse with DOMParser |
| **XMLHttpRequest**   | Precursor to fetch(); can return a resource as a Document via its `responseXML` property      |
| **XPath**            | Creates address strings for specific portions of an XML document                              |

### Creating an XML Document

#### Parsing Strings into DOM Trees

```javascript
const xmlStr = '<q id="a"><span id="b">hey!</span></q>';
const parser = new DOMParser();
const doc = parser.parseFromString(xmlStr, "application/xml");
// print the name of the root element or error message
const errorNode = doc.querySelector("parsererror");
if (errorNode) {
  console.log("error while parsing");
} else {
  console.log(doc.documentElement.nodeName);
}
```

#### Parsing URL-Addressable Resources into DOM Trees

Using `fetch()`:

```javascript
fetch("example.xml")
  .then((response) => response.text())
  .then((text) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    console.log(doc.documentElement.nodeName);
  });
```

This fetches the resource as a text string, then uses `DOMParser.parseFromString()` to construct an `XMLDocument`.

**Note:** If the document is HTML, the code returns a `Document`. If the document is XML, the resulting object is an `XMLDocument`. The two types are essentially the same; the difference is largely historical.

### Serializing an XML Document

#### Serializing DOM Trees to Strings

To serialize a DOM tree `doc` into XML text, call `XMLSerializer.serializeToString()`:

```javascript
const serializer = new XMLSerializer();
const xmlStr = serializer.serializeToString(doc);
```

#### Serializing HTML Documents

If the DOM is an HTML document, you can use:

Using `innerHTML` (descendants only):

```javascript
const docInnerHtml = document.documentElement.innerHTML;
```

Using `outerHTML` (node and all descendants):

```javascript
const docOuterHtml = document.documentElement.outerHTML;
```

### Related Technologies

- XPath
- fetch()
- XMLHttpRequest
- Document, XMLDocument, and HTMLDocument APIs

---

## OpenSearch Description Format

> Source: <https://developer.mozilla.org/en-US/docs/Web/XML/Guides/OpenSearch>

### Overview

The **OpenSearch description format** allows websites to describe their search engine interface, enabling browsers and client applications to integrate site-specific search functionality into the address bar. Supported by Firefox, Edge, Safari, and Chrome.

- Browsers query search engines via URL templates.
- The browser fills in the user's search terms at specified placeholders.
- Example: `https://example.com/search?q={searchTerms}` becomes `https://example.com/search?q=foo`.
- Sites register search engines via an XML description file linked in HTML.
- **Note:** Chrome registers site search engines as "inactive" by default; users must manually activate them.

### OpenSearch Description File

#### Basic XML Template

```xml
<OpenSearchDescription
  xmlns="http://a9.com/-/spec/opensearch/1.1/"
  xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>[SNK]</ShortName>
  <Description>[Search engine full name and summary]</Description>
  <InputEncoding>[UTF-8]</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">[https://example.com/favicon.ico]</Image>
  <Url type="text/html" template="[searchURL]"/>
  <Url type="application/x-suggestions+json" template="[suggestionURL]"/>
</OpenSearchDescription>
```

### Element Specifications

#### ShortName

- Short name for the search engine.
- **Must be 16 or fewer characters.**
- Plain text only; no HTML or markup.

#### Description

- Brief description of the search engine.
- **Maximum 1024 characters.**
- Plain text only; no HTML or markup.

#### InputEncoding

- Character encoding for submitting input to the search engine.
- Example: `UTF-8`.

#### Image

- URL or data URL for the search engine icon.
- **Recommended sizes:**
  - 16x16 image of type `image/x-icon` (e.g., `/favicon.ico`)
  - 64x64 image of type `image/jpeg` or `image/png`

**Icon URL examples:**

```xml
<Image height="16" width="16" type="image/x-icon">https://example.com/favicon.ico</Image>
```

```xml
<Image height="16" width="16">data:image/x-icon;base64,AAABAAEAEBAAA...DAAA=</Image>
```

**Important icon notes:**

- Firefox caches icons as base64 `data:` URLs.
- Search plug-ins are stored in the profile's `searchplugins/` folder.
- `http:` and `https:` URLs are converted to `data:` URLs.
- **Firefox rejects remotely-loaded icons larger than 10 kilobytes.**

#### Url

Describes the URL(s) to use for search queries using the `template` attribute.

**Firefox-supported URL types:**

| Type                                      | Purpose                                    |
|-------------------------------------------|--------------------------------------------|
| `type="text/html"`                        | Actual search query URL                    |
| `type="application/x-suggestions+json"`   | Search suggestions in JSON format          |
| `type="application/x-moz-keywordsearch"`  | Keyword search in location bar (Firefox-only) |

**Dynamic parameters:**

- `{searchTerms}` -- The user's search terms.
- Other OpenSearch 1.1 parameters are also supported.

### Linking to an OpenSearch Description File

#### HTML Link Element

```html
<link
  rel="search"
  type="application/opensearchdescription+xml"
  title="[searchTitle]"
  href="[descriptionURL]" />
```

**Required attributes:**

- `rel="search"` -- Establishes search engine relationship.
- `type="application/opensearchdescription+xml"` -- MIME type.
- `title="[searchTitle]"` -- Name of search (must match `<ShortName>`).
- `href="[descriptionURL]"` -- URL to the XML description file.

#### Multiple Search Engines Example

```html
<link
  rel="search"
  type="application/opensearchdescription+xml"
  title="MySite: By Author"
  href="http://example.com/mysiteauthor.xml" />

<link
  rel="search"
  type="application/opensearchdescription+xml"
  title="MySite: By Title"
  href="http://example.com/mysitetitle.xml" />
```

### Supporting Automatic Updates

Include an extra `Url` element with automatic update capability:

```xml
<Url
  type="application/opensearchdescription+xml"
  rel="self"
  template="https://example.com/mysearchdescription.xml" />
```

This allows the OpenSearch description file to update automatically.

### Troubleshooting Tips

1. **Server Content-Type** -- Serve OpenSearch descriptions with `Content-Type: application/opensearchdescription+xml`.
2. **XML Well-Formedness** -- Load the file directly in a browser to validate. Ampersands (`&`) must be escaped as `&amp;`. Tags must be closed with a trailing slash or matching end tag.
3. **Missing xmlns Attribute** -- Always include `xmlns="http://a9.com/-/spec/opensearch/1.1/"` or Firefox will report: "Firefox could not download the search plugin."
4. **Missing text/html URL** -- A `text/html` URL type **must** be included; Atom or RSS-only URLs will generate an error.
5. **Favicon Size** -- Remotely fetched favicons must not exceed 10KB.
6. **Browser Activation** -- Browsers may not activate site search shortcuts by default; check browser settings and manually activate if needed.

#### Firefox Debugging

Use `about:config` to enable logging:

1. Set preference `browser.search.log` to `true`.
2. View logs in Firefox Browser Console: Tools > Browser Tools > Browser Console.
