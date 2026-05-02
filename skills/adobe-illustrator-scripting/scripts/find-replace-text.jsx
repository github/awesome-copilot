// find-replace-text.jsx
// Finds and replaces text across all text frames in the active document.
// Usage: Run from File > Scripts > Other Scripts in Adobe Illustrator.

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("No document is open.");
        return;
    }

    var doc = app.activeDocument;

    var findStr = prompt("Find text:", "");
    if (findStr === null || findStr === "") return;

    var replaceStr = prompt("Replace with:", "");
    if (replaceStr === null) return;

    var count = 0;
    for (var i = 0; i < doc.textFrames.length; i++) {
        var tf = doc.textFrames[i];
        var original = tf.contents;
        if (original.indexOf(findStr) !== -1) {
            tf.contents = original.split(findStr).join(replaceStr);
            count++;
        }
    }

    alert("Replaced text in " + count + " text frame(s).");
})();
