# Writing Mathematical Expressions to HTML

## Writing Inline Expressions

### Markdown

```markdown
This sentence uses `$` delimiters to show math inline: $\sqrt{3x-1}+(1+x)^2$
```

### Parsed HTML

```html
<p>This sentence uses <code>$</code> delimiters to show math inline:
 <math-renderer><math xmlns="http://www.w3.org/1998/Math/MathML">
  <msqrt>
   <mn>3</mn>
   <mi>x</mi>
   <mo>−</mo>
   <mn>1</mn>
  </msqrt>
  <mo>+</mo>
  <mo>(</mo>
  <mn>1</mn>
  <mo>+</mo>
  <mi>x</mi>
  <msup>
   <mo>)</mo>
   <mn>2</mn>
  </msup>
</math>
</math-renderer>
</p>
```

### Markdown

```markdown
This sentence uses $\` and \`$ delimiters to show math inline: $`\sqrt{3x-1}+(1+x)^2`$
```

### Parsed HTML

```html
<p>This sentence uses
 <math-renderer>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
   <mo>‘</mo>
   <mi>a</mi>
   <mi>n</mi>
   <mi>d</mi>
   <mo>‘</mo>
  </math>
 </math-renderer> delimiters to show math inline:
 <math-renderer>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
   <msqrt>
    <mn>3</mn>
    <mi>x</mi>
    <mo>−</mo>
    <mn>1</mn>
   </msqrt>
   <mo>+</mo>
   <mo stretchy="false">(</mo>
   <mn>1</mn>
   <mo>+</mo>
   <mi>x</mi>
   <msup>
    <mo stretchy="false">)</mo>
    <mn>2</mn>
   </msup>
  </math>
 </math-renderer>
</p>
```

---

## Writing Expressions as Blocks

### Markdown

```markdown
**The Cauchy-Schwarz Inequality**\
$$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$
```

### Parsed HTML

```html
<p>
  <strong>The Cauchy-Schwarz Inequality</strong><br>
  <math-renderer>
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <msup>
        <mrow>
          <mo>(</mo>
          <munderover>
            <mo>∑</mo>
            <mrow>
              <mi>k</mi>
              <mo>=</mo>
              <mn>1</mn>
            </mrow>
            <mi>n</mi>
          </munderover>
          <msub>
            <mi>a</mi>
            <mi>k</mi>
          </msub>
          <msub>
            <mi>b</mi>
            <mi>k</mi>
          </msub>
          <mo>)</mo>
        </mrow>
        <mn>2</mn>
      </msup>
      <mo>≤</mo>
      <mrow>
        <mo>(</mo>
        <munderover>
          <mo>∑</mo>
          <mrow>
            <mi>k</mi>
            <mo>=</mo>
            <mn>1</mn>
          </mrow>
          <mi>n</mi>
        </munderover>
        <msubsup>
          <mi>a</mi>
          <mi>k</mi>
          <mn>2</mn>
        </msubsup>
        <mo>)</mo>
      </mrow>
      <mrow>
        <mo>(</mo>
        <munderover>
          <mo>∑</mo>
          <mrow>
            <mi>k</mi>
            <mo>=</mo>
            <mn>1</mn>
          </mrow>
          <mi>n</mi>
        </munderover>
        <msubsup>
          <mi>b</mi>
          <mi>k</mi>
          <mn>2</mn>
        </msubsup>
        <mo>)</mo>
      </mrow>
    </math>
  </math-renderer>
</p>
```

### Markdown

```markdown
**The Cauchy-Schwarz Inequality**

    ```math
    \left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)
    ```
```

### Parsed HTML

```html
<p><strong>The Cauchy-Schwarz Inequality</strong></p>

<math-renderer>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
    <msup>
      <mrow>
        <mo>(</mo>
        <munderover>
          <mo>∑</mo>
          <mrow>
            <mi>k</mi>
            <mo>=</mo>
            <mn>1</mn>
          </mrow>
          <mi>n</mi>
        </munderover>
        <msub>
          <mi>a</mi>
          <mi>k</mi>
        </msub>
        <msub>
          <mi>b</mi>
          <mi>k</mi>
        </msub>
        <mo>)</mo>
      </mrow>
      <mn>2</mn>
    </msup>
    <mo>≤</mo>
    <mrow>
      <mo>(</mo>
      <munderover>
        <mo>∑</mo>
        <mrow>
          <mi>k</mi>
          <mo>=</mo>
          <mn>1</mn>
        </mrow>
        <mi>n</mi>
      </munderover>
      <msubsup>
        <mi>a</mi>
        <mi>k</mi>
        <mn>2</mn>
      </msubsup>
      <mo>)</mo>
    </mrow>
    <mrow>
      <mo>(</mo>
      <munderover>
        <mo>∑</mo>
        <mrow>
          <mi>k</mi>
          <mo>=</mo>
          <mn>1</mn>
        </mrow>
        <mi>n</mi>
      </munderover>
      <msubsup>
        <mi>b</mi>
        <mi>k</mi>
        <mn>2</mn>
      </msubsup>
      <mo>)</mo>
    </mrow>
  </math>
</math-renderer>
```

### Markdown

```markdown
The equation $a^2 + b^2 = c^2$ is the Pythagorean theorem.
```

### Parsed HTML

```html
<p>The equation
 <math-renderer><math xmlns="http://www.w3.org/1998/Math/MathML">
  <msup>
    <mi>a</mi>
    <mn>2</mn>
  </msup>
  <mo>+</mo>
  <msup>
    <mi>b</mi>
    <mn>2</mn>
  </msup>
  <mo>=</mo>
  <msup>
    <mi>c</mi>
    <mn>2</mn>
  </msup>
 </math></math-renderer> is the Pythagorean theorem.
</p>
```

### Markdown

```
$$
\int_0^\infty e^{-x} dx = 1
$$
```

### Parsed HTML

```html
<p><math-renderer><math xmlns="http://www.w3.org/1998/Math/MathML">
  <msubsup>
    <mo>∫</mo>
    <mn>0</mn>
    <mi>∞</mi>
  </msubsup>
  <msup>
    <mi>e</mi>
    <mrow>
      <mo>−</mo>
      <mi>x</mi>
    </mrow>
  </msup>
  <mi>d</mi>
  <mi>x</mi>
  <mo>=</mo>
  <mn>1</mn>
</math></math-renderer></p>
```

---

## Dollar Sign Inline with Mathematical Expression

### Markdown

```markdown
This expression uses `\$` to display a dollar sign: $`\sqrt{\$4}`$
```

### Parsed HTML

```html
<p>This expression uses
 <code>\$</code> to display a dollar sign:
 <math-renderer>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
   <msqrt>
    <mi>$</mi>
    <mn>4</mn>
   </msqrt>
  </math>
 </math-renderer>
</p>
```

### Markdown

```markdown
To split <span>$</span>100 in half, we calculate $100/2$
```

### Parsed HTML

```html
<p>To split
 <span>$</span>100 in half, we calculate
 <math-renderer>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
   <mn>100</mn>
   <mrow data-mjx-texclass="ORD">
    <mo>/</mo>
   </mrow>
   <mn>2</mn>
  </math>
 </math-renderer>
</p>
```
