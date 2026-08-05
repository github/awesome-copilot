// printtopdf — tiny Quartz helper used by the pdf-unlock canvas.
//
// This is the same CoreGraphics PDF pipeline macOS uses for the print dialog's
// "Save as PDF" / "Print to PDF" flow: the source page is *drawn* into a fresh
// CGPDFContext. Because the output is authored from scratch it carries no
// encryption dictionary, so permission ("owner") passwords disappear and text
// stays vector rather than being rasterized.
//
//   printtopdf info    <file.pdf> [password]
//   printtopdf convert <in.pdf> <out.pdf> [password]
//   printtopdf trash   <file>

import Foundation
import CoreGraphics

let EXIT_USAGE: Int32 = 2
let EXIT_OPEN_FAILED: Int32 = 3
let EXIT_PASSWORD: Int32 = 4
let EXIT_EMPTY: Int32 = 5
let EXIT_CONTEXT: Int32 = 6
let EXIT_IO: Int32 = 7

func emit(_ object: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

func fail(_ message: String, _ code: Int32) -> Never {
    emit(["ok": false, "error": message])
    exit(code)
}

/// Opens the document, unlocking it with `password` (or the implicit empty
/// user password) when the file carries an encryption dictionary.
func openDocument(_ path: String, _ password: String) -> CGPDFDocument {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let doc = CGPDFDocument(url) else {
        fail("Could not open \(path) as a PDF.", EXIT_OPEN_FAILED)
    }
    if doc.isEncrypted && !doc.isUnlocked {
        var unlocked = doc.unlockWithPassword(password)
        if !unlocked && !password.isEmpty {
            unlocked = doc.unlockWithPassword("")
        }
        if !unlocked {
            fail("This PDF needs a password to open.", EXIT_PASSWORD)
        }
    }
    return doc
}

func info(_ path: String, _ password: String) {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let doc = CGPDFDocument(url) else {
        fail("Could not open \(path) as a PDF.", EXIT_OPEN_FAILED)
    }
    var needsPassword = false
    if doc.isEncrypted && !doc.isUnlocked {
        var unlocked = doc.unlockWithPassword(password)
        if !unlocked && !password.isEmpty {
            unlocked = doc.unlockWithPassword("")
        }
        needsPassword = !unlocked
    }

    var major: Int32 = 0
    var minor: Int32 = 0
    doc.getVersion(majorVersion: &major, minorVersion: &minor)

    emit([
        "ok": true,
        "encrypted": doc.isEncrypted,
        "unlocked": doc.isUnlocked,
        "needsPassword": needsPassword,
        "pages": needsPassword ? 0 : doc.numberOfPages,
        "allowsCopying": doc.allowsCopying,
        "allowsPrinting": doc.allowsPrinting,
        "version": "\(major).\(minor)",
    ])
}

func convert(_ inPath: String, _ outPath: String, _ password: String) {
    let doc = openDocument(inPath, password)
    let pageCount = doc.numberOfPages
    guard pageCount > 0 else { fail("Document has no pages.", EXIT_EMPTY) }

    let outURL = URL(fileURLWithPath: outPath) as CFURL
    let metadata: [String: Any] = [
        kCGPDFContextCreator as String: "GitHub Copilot - PDF Unlock (Quartz print-to-PDF)"
    ]
    guard let ctx = CGContext(outURL, mediaBox: nil, metadata as CFDictionary) else {
        fail("Could not create the output PDF context.", EXIT_CONTEXT)
    }

    var rendered = 0
    for index in 1...pageCount {
        guard let page = doc.page(at: index) else { continue }
        let cropBox = page.getBoxRect(.cropBox)
        let source = cropBox.isEmpty ? page.getBoxRect(.mediaBox) : cropBox
        // /Rotate is baked into the output box so the printed page matches what
        // a viewer shows rather than the raw, unrotated content stream.
        let rotated = abs(page.rotationAngle) % 180 == 90
        var box = CGRect(
            x: 0,
            y: 0,
            width: rotated ? source.height : source.width,
            height: rotated ? source.width : source.height
        )
        if box.width <= 0 || box.height <= 0 { continue }

        ctx.beginPage(mediaBox: &box)
        ctx.saveGState()
        ctx.concatenate(
            page.getDrawingTransform(.cropBox, rect: box, rotate: 0, preserveAspectRatio: true)
        )
        ctx.drawPDFPage(page)
        ctx.restoreGState()
        ctx.endPage()
        rendered += 1
    }

    ctx.closePDF()
    emit(["ok": true, "pages": rendered, "sourcePages": pageCount])
}

func trash(_ path: String) {
    var resulting: NSURL?
    do {
        try FileManager.default.trashItem(
            at: URL(fileURLWithPath: path),
            resultingItemURL: &resulting
        )
    } catch {
        fail("Could not move \(path) to the Trash: \(error.localizedDescription)", EXIT_IO)
    }
    emit(["ok": true, "trashedTo": resulting?.path ?? ""])
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    fail("usage: printtopdf <info|convert|trash> ...", EXIT_USAGE)
}

switch args[1] {
case "info":
    info(args[2], args.count > 3 ? args[3] : "")
case "convert":
    guard args.count >= 4 else {
        fail("usage: printtopdf convert <in> <out> [password]", EXIT_USAGE)
    }
    convert(args[2], args[3], args.count > 4 ? args[4] : "")
case "trash":
    trash(args[2])
default:
    fail("Unknown command \(args[1]).", EXIT_USAGE)
}
