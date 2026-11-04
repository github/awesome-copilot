// batch-export-png.jsx
// Exports every open Illustrator document as a PNG24 file to a chosen folder.
// Usage: Run from File > Scripts > Other Scripts in Adobe Illustrator.

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("No documents are open.");
        return;
    }

    var outputFolder = Folder.selectDialog("Select output folder for PNG export");
    if (!outputFolder) return;

    var savedInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {
        for (var i = app.documents.length - 1; i >= 0; i--) {
            var doc = app.documents[i];
            var fileName = doc.name.replace(/\.[^.]+$/, "");
            var destFile = new File(outputFolder + "/" + fileName + ".png");

            var pngOpts = new ExportOptionsPNG24();
            pngOpts.transparency = true;
            pngOpts.artBoardClipping = true;
            pngOpts.horizontalScale = 100;
            pngOpts.verticalScale = 100;

            doc.exportFile(destFile, ExportType.PNG24, pngOpts);
        }
        alert("Exported " + app.documents.length + " file(s) to:\n" + outputFolder.fsName);
    } catch (e) {
        alert("Export error: " + e.message);
    } finally {
        app.userInteractionLevel = savedInteraction;
    }
})();
