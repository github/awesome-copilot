// create-color-grid.jsx
// Creates a grid of colored rectangles to demonstrate path creation,
// color manipulation, and layer organization in Illustrator scripting.
// Usage: Run from File > Scripts > Other Scripts in Adobe Illustrator.

#target illustrator

(function () {
    var doc = app.documents.add();
    var layer = doc.layers.add();
    layer.name = "Color Grid";

    var columns = 5;
    var rows = 4;
    var cellSize = 72;  // 1 inch
    var gap = 10;
    var startX = 72;
    var startY = doc.height - 72;

    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < columns; col++) {
            var x = startX + col * (cellSize + gap);
            var y = startY - row * (cellSize + gap);

            var rect = layer.pathItems.rectangle(y, x, cellSize, cellSize);

            var color = new RGBColor();
            color.red = Math.round((col / (columns - 1)) * 255);
            color.green = Math.round((row / (rows - 1)) * 255);
            color.blue = Math.round(128 + Math.random() * 127);

            rect.fillColor = color;
            rect.stroked = false;
        }
    }

    app.redraw();
})();
