# Media & Graphics Reference

Multimedia content, graphics, and related technologies for the web.

## Image Formats

### JPEG/JPG

Lossy compression for photographs.

**Characteristics**:
- Good for photos
- No transparency support
- Small file size
- Quality degrades with editing

**Usage**:
```html
<img src="photo.jpg" alt="Photo">
```

### PNG

Lossless compression with transparency.

**Characteristics**:
- Supports alpha channel (transparency)
- Larger file size than JPEG
- Good for logos, graphics, screenshots
- PNG-8 (256 colors) vs PNG-24 (16M colors)

```html
<img src="logo.png" alt="Logo">
```

### WebP

Modern format with better compression.

**Characteristics**:
- Smaller than JPEG/PNG
- Supports transparency
- Supports animation
- Not supported in older browsers

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

### AVIF

Next-generation image format.

**Characteristics**:
- Better compression than WebP
- Supports HDR
- Slower encoding
- Limited browser support

### GIF

Animated images (limited colors).

**Characteristics**:
- 256 colors max
- Supports animation
- Simple transparency (no alpha)
- Consider modern alternatives (video, WebP)

### SVG (Scalable Vector Graphics)

XML-based vector graphics.

**Characteristics**:
- Scalable without quality loss
- Small file size for simple graphics
- CSS/JS manipulatable
- Animation support

```html
<!-- Inline SVG -->
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>

<!-- External SVG -->
<img src="icon.svg" alt="Icon">
```

**Creating SVG**:
```html
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Rectangle -->
  <rect x="10" y="10" width="80" height="60" fill="red" />
  
  <!-- Circle -->
  <circle cx="150" cy="40" r="30" fill="blue" />
  
  <!-- Path -->
  <path d="M10 100 L100 100 L50 150 Z" fill="green" />
  
  <!-- Text -->
  <text x="50" y="180" font-size="20">Hello SVG</text>
</svg>
```

## Canvas API

2D raster graphics (bitmap).

### Basic Setup

```html
<canvas id="myCanvas" width="400" height="300"></canvas>
```

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// Draw rectangle
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 50);

// Draw circle
ctx.beginPath();
ctx.arc(200, 150, 50, 0, Math.PI * 2);
ctx.fillStyle = 'blue';
ctx.fill();

// Draw line
ctx.beginPath();
ctx.moveTo(50, 200);
ctx.lineTo(350, 250);
ctx.strokeStyle = 'green';
ctx.lineWidth = 3;
ctx.stroke();

// Draw text
ctx.font = '30px Arial';
ctx.fillStyle = 'black';
ctx.fillText('Hello Canvas', 50, 100);

// Draw image
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0);
};
img.src = 'image.jpg';
```

### Canvas Methods

```javascript
// Paths
ctx.beginPath();
ctx.moveTo(x, y);
ctx.lineTo(x, y);
ctx.arc(x, y, radius, startAngle, endAngle);
ctx.closePath();
ctx.fill();
ctx.stroke();

// Transforms
ctx.translate(x, y);
ctx.rotate(angle);
ctx.scale(x, y);
ctx.save(); // Save state
ctx.restore(); // Restore state

// Compositing
ctx.globalAlpha = 0.5;
ctx.globalCompositeOperation = 'source-over';

// Export
const dataURL = canvas.toDataURL('image/png');
canvas.toBlob(blob => {
  // Use blob
}, 'image/png');
```

## WebGL

3D graphics in the browser.

**Use Cases**:
- 3D visualizations
- Games
- Data visualization
- VR/AR

**Libraries**:
- **Three.js**: Easy 3D graphics
- **Babylon.js**: Game engine
- **PixiJS**: 2D WebGL renderer

```javascript
// Three.js example
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// Render loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
```

## Video

### HTML5 Video Element

```html
<video controls width="640" height="360">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  Your browser doesn't support video.
</video>
```

**Attributes**:
- `controls`: Show playback controls
- `autoplay`: Start automatically
- `loop`: Repeat video
- `muted`: Mute audio
- `poster`: Thumbnail image
- `preload`: none/metadata/auto

### Video Formats

- **MP4 (H.264)**: Widely supported
- **WebM (VP8/VP9)**: Open format
- **Ogg (Theora)**: Open format

### JavaScript Control

```javascript
const video = document.querySelector('video');

// Playback
video.play();
video.pause();
video.currentTime = 10; // Seek to 10s

// Properties
video.duration; // Total duration
video.currentTime; // Current position
video.paused; // Is paused?
video.volume = 0.5; // 0.0 to 1.0
video.playbackRate = 1.5; // Speed

// Events
video.addEventListener('play', () => {});
video.addEventListener('pause', () => {});
video.addEventListener('ended', () => {});
video.addEventListener('timeupdate', () => {});
```

## Audio

### HTML5 Audio Element

```html
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
</audio>
```

### Audio Formats

- **MP3**: Widely supported
- **AAC**: Good quality
- **Ogg Vorbis**: Open format
- **WAV**: Uncompressed

### Web Audio API

Advanced audio processing:

```javascript
const audioContext = new AudioContext();

// Load audio
fetch('audio.mp3')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
  .then(audioBuffer => {
    // Create source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create gain node (volume)
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5;
    
    // Connect: source -> gain -> destination
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play
    source.start();
  });
```

## Responsive Images

### srcset and sizes

```html
<!-- Different resolutions -->
<img src="image-800.jpg"
     srcset="image-400.jpg 400w,
             image-800.jpg 800w,
             image-1200.jpg 1200w"
     sizes="(max-width: 600px) 100vw,
            (max-width: 900px) 50vw,
            800px"
     alt="Responsive image">

<!-- Pixel density -->
<img src="image.jpg"
     srcset="image.jpg 1x,
             image@2x.jpg 2x,
             image@3x.jpg 3x"
     alt="High DPI image">
```

### Picture Element

Art direction and format switching:

```html
<picture>
  <!-- Different formats -->
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  
  <!-- Different crops for mobile/desktop -->
  <source media="(max-width: 600px)" srcset="image-mobile.jpg">
  <source media="(min-width: 601px)" srcset="image-desktop.jpg">
  
  <!-- Fallback -->
  <img src="image.jpg" alt="Fallback">
</picture>
```

## Image Optimization

### Best Practices

1. **Choose correct format**:
   - Photos: JPEG, WebP, AVIF
   - Graphics/logos: PNG, SVG, WebP
   - Animations: Video, WebP

2. **Compress images**:
   - Use compression tools
   - Balance quality vs file size
   - Progressive JPEG for large images

3. **Responsive images**:
   - Serve appropriate sizes
   - Use srcset/picture
   - Consider device pixel ratio

4. **Lazy loading**:
   ```html
   <img src="image.jpg" loading="lazy" alt="Lazy loaded">
   ```

5. **Dimensions**:
   ```html
   <img src="image.jpg" width="800" height="600" alt="With dimensions">
   ```

## Image Loading Techniques

### Lazy Loading

```html
<!-- Native lazy loading -->
<img src="image.jpg" loading="lazy" alt="Image">

<!-- Intersection Observer -->
<img data-src="image.jpg" class="lazy" alt="Image">
```

```javascript
const images = document.querySelectorAll('.lazy');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

images.forEach(img => observer.observe(img));
```

### Progressive Enhancement

```html
<!-- Low quality placeholder -->
<img src="image-tiny.jpg"
     data-src="image-full.jpg"
     class="blur"
     alt="Progressive image">
```

## Favicon

Website icon:

```html
<!-- Standard -->
<link rel="icon" href="/favicon.ico" sizes="any">

<!-- Modern -->
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Multiple sizes -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
```

## Multimedia Best Practices

### Performance

- Optimize file sizes
- Use appropriate formats
- Implement lazy loading
- Use CDN for delivery
- Compress videos

### Accessibility

- Provide alt text for images
- Include captions/subtitles for videos
- Provide transcripts for audio
- Don't autoplay with sound
- Ensure keyboard controls

### SEO

- Descriptive filenames
- Alt text with keywords
- Structured data (schema.org)
- Image sitemaps

## Glossary Terms

**Key Terms Covered**:
- Alpha
- Baseline (image)
- Baseline (scripting)
- Canvas
- Favicon
- JPEG
- Lossless compression
- Lossy compression
- PNG
- Progressive enhancement
- Quality values
- Raster image
- Render
- Rendering engine
- SVG
- Vector images
- WebGL
- WebP

## Additional Resources

- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Responsive Images Guide](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
