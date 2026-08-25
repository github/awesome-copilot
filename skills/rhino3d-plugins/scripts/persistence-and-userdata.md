# Persistence and User Data

Working recipes for making data survive a save: the four ways a Rhino plug-in can persist state — a custom
`UserData` subclass on geometry, user strings, the `UserDictionary` (an `ArchivableDictionary`), document
user data through `PlugIn.WriteDocument`/`ReadDocument`, and app-level preferences in `PlugIn.Settings`.
Read this to pick the right flavour before writing serialization code you did not need, and for the exact
override signatures. C# is primary throughout — three of these five live on the compiled `PlugIn` class and
have no scripting equivalent.

## Contents

- [Patterns](#patterns)
- [Choosing a persistence flavour](#choosing-a-persistence-flavour)
- [A custom UserData subclass](#a-custom-userdata-subclass)
- [Attach user data to a Brep face](#attach-user-data-to-a-brep-face)
- [User strings on an object](#user-strings-on-an-object)
- [Document-level user strings](#document-level-user-strings)
- [The UserDictionary (ArchivableDictionary)](#the-userdictionary-archivabledictionary)
- [Document user data from a plug-in](#document-user-data-from-a-plug-in)
- [App-level preferences with PlugIn.Settings](#app-level-preferences-with-pluginsettings)
- [Corrections applied](#corrections-applied)

---

## Patterns

Conventions that recur across every recipe in this file:

- **Prefer user strings / `UserDictionary` unless you have a reason not to.** Rhino serializes them for
  you, and other plug-ins, Grasshopper, scripts and the `SetUserText`/`GetUserText` commands can read them.
  A custom `UserData` class is opaque to anyone without your assembly.
- **A `UserData` subclass has five hard requirements**: a unique `[Guid("…")]` attribute (never copied from
  another class), a **public parameterless constructor** (Rhino instantiates it while reading a file), and
  overrides of `Description`, `ShouldWrite`, and `Read`/`Write`. `OnDuplicate` is what makes copies carry
  the data.
- **`ShouldWrite` gates everything.** Return `true` only when you actually have something worth saving —
  it is the difference between clean files and every object carrying an empty payload.
- **Use `ArchivableDictionary` inside `Read`/`Write`.** `archive.WriteDictionary(dict)` /
  `archive.ReadDictionary()` handle versioning far better than hand-rolled
  `Write3dmChunkVersion` + `WriteInt` + `WriteString` sequences (which is the documented alternative).
- **User data hangs off anything derived from `CommonObject`** — geometry, `ObjectAttributes`, layers,
  materials. Attach with `x.UserData.Add(ud)`, retrieve with
  `x.UserData.Find(typeof(MyData)) as MyData`.
- **Brep faces are the exception.** Attach to `face.UnderlyingSurface()`, not to the `BrepFace`, or the data
  will not serialize with the file.
- **Two dictionaries per object.** `GeometryBase.UserDictionary` travels with the geometry;
  `ObjectAttributes.UserDictionary` travels with the attributes. Pick deliberately, and remember that
  attribute edits still need `CommitChanges()`.
- **Document user data is plug-in-scoped, not object-scoped.** Rhino writes your plug-in's id into the file
  when `ShouldCallWriteDocument` returns `true`, and loads your plug-in on open to call `ReadDocument`.
- **`PlugIn.Settings` is *not* saved in the `.3dm`.** It is per-user XML under `SettingsDirectory` —
  preferences, not model data.

---

## Choosing a persistence flavour

| Flavour | Scope | Serialization | Use when |
|---|---|---|---|
| **User strings / `UserDictionary`** | one object, or the document | automatic | **default choice** — no serialization code, readable by other plug-ins, Grasshopper and scripts |
| **Custom `UserData` subclass** | one `CommonObject` (geometry, attributes, layer, material…) | you write it, binary archive | you need strongly typed data, transform tracking, or explicit duplicate semantics |
| **Document user data** (`PlugIn.WriteDocument` / `ReadDocument`) | whole document | you write it, binary archive | plug-in-wide state that belongs to the model, not to any one object |
| **`PlugIn.Settings`** (`PersistentSettings`) | the user's machine | automatic XML | preferences and UI state that must *not* travel with the model |

---

### A custom UserData subclass

The full pattern: a `[Guid]`-attributed `UserData` subclass with a parameterless constructor, plus the
command that attaches or reads it. The failure mode is silent — a missing `[Guid]`, a missing parameterless
constructor, or a `ShouldWrite` that returns `false` all produce data that vanishes on save with no error.

**C#**
```csharp
using System;
using Rhino;
using System.Runtime.InteropServices;

namespace examples_cs
{
  // The Guid attribute is required for serialization, and must be unique
  // to this class -- never reuse one from another sample.
  [Guid("00000000-0000-0000-0000-000000000000")] // REGENERATE
  public class PhysicalData : Rhino.DocObjects.Custom.UserData
  {
    public int Weight { get; set; }
    public double Density { get; set; }

    // Required: Rhino calls this when reading the data back from a file
    public PhysicalData() { }

    public PhysicalData(int weight, double density)
    {
      Weight = weight;
      Density = density;
    }

    public override string Description
    {
      get { return "Physical Properties"; }
    }

    public override string ToString()
    {
      return String.Format("weight={0}, density={1}", Weight, Density);
    }

    // Called when the parent object is copied -- without this, copies lose the data
    protected override void OnDuplicate(Rhino.DocObjects.Custom.UserData source)
    {
      PhysicalData src = source as PhysicalData;
      if (src != null)
      {
        Weight = src.Weight;
        Density = src.Density;
      }
    }

    // Return true only when there is something worth saving
    public override bool ShouldWrite
    {
      get
      {
        if (Weight > 0 && Density > 0)
          return true;
        return false;
      }
    }

    protected override bool Read(Rhino.FileIO.BinaryArchiveReader archive)
    {
      Rhino.Collections.ArchivableDictionary dict = archive.ReadDictionary();
      if (dict.ContainsKey("Weight") && dict.ContainsKey("Density"))
      {
        Weight = (int)dict["Weight"];
        Density = (double)dict["Density"];
      }
      return true;
    }

    protected override bool Write(Rhino.FileIO.BinaryArchiveWriter archive)
    {
      // File IO can be implemented however you like, but the dictionary makes
      // versioning in the 3dm file easier. The hand-rolled alternative is:
      //   archive.Write3dmChunkVersion(1, 0);
      //   archive.WriteInt(Weight);
      //   archive.WriteDouble(Density);
      var dict = new Rhino.Collections.ArchivableDictionary(1, "Physical");
      dict.Set("Weight", Weight);
      dict.Set("Density", Density);
      archive.WriteDictionary(dict);
      return true;
    }
  }

  [Guid("00000000-0000-0000-0000-000000000000")] // REGENERATE
  public class ex_userdataCommand : Rhino.Commands.Command
  {
    public override string EnglishName { get { return "cs_userdataCommand"; } }

    protected override Rhino.Commands.Result RunCommand(RhinoDoc doc, Rhino.Commands.RunMode mode)
    {
      Rhino.DocObjects.ObjRef objref;
      var rc = Rhino.Input.RhinoGet.GetOneObject(
        "Select Object", false, Rhino.DocObjects.ObjectType.AnyObject, out objref);
      if (rc != Rhino.Commands.Result.Success)
        return rc;

      var ud = objref.Geometry().UserData.Find(typeof(PhysicalData)) as PhysicalData;
      if (ud == null)
      {
        // No user data found; create one and add it
        int weight = 0;
        rc = Rhino.Input.RhinoGet.GetInteger("Weight", false, ref weight);
        if (rc != Rhino.Commands.Result.Success)
          return rc;

        ud = new PhysicalData(weight, 12.34);
        objref.Geometry().UserData.Add(ud);
      }
      else
      {
        RhinoApp.WriteLine("{0} = {1}", ud.Description, ud);
      }
      return Rhino.Commands.Result.Success;
    }
  }
}
```

**Python**

No Python version exists, and none can be written: a `UserData` subclass must be a `[Guid]`-attributed .NET
type that Rhino can instantiate while reading a file, which requires a compiled assembly. From a script,
use [user strings](#user-strings-on-an-object) or the
[UserDictionary](#the-userdictionary-archivabledictionary) instead — both persist automatically.

---

### Attach user data to a Brep face

Same `PhysicalData` class as above, different anchor, and a different write path. Two traps here:
attaching to the `BrepFace` instead of `face.UnderlyingSurface()` silently loses the data on save, and
mutating the picked face in place looks like it works but never reaches the document. Writing means
duplicating the owning top-level `Brep`, attaching to the corresponding surface in the duplicate, and
replacing the whole object by its id, not through the subobject `ObjRef`, which refers only to the
selected face.

**C#**
```csharp
partial class Examples
{
  public static Rhino.Commands.Result Userdata(RhinoDoc doc)
  {
    Rhino.DocObjects.ObjRef objref;
    var rc = Rhino.Input.RhinoGet.GetOneObject(
      "Select Face", false, Rhino.DocObjects.ObjectType.Surface, out objref);
    if (rc != Rhino.Commands.Result.Success)
      return rc;

    var face = objref.Face();
    if (face == null)
      return Rhino.Commands.Result.Failure;

    // Reading can use the picked face directly. Use the underlying surface,
    // NOT the face, or the user data will not serialize with the file.
    var ud = face.UnderlyingSurface().UserData.Find(typeof(PhysicalData)) as PhysicalData;
    if (ud != null)
    {
      RhinoApp.WriteLine("{0} = {1}", ud.Description, ud);
      return Rhino.Commands.Result.Success;
    }

    // No user data found; create some and add it.
    int weight = 0;
    rc = Rhino.Input.RhinoGet.GetInteger("Weight", false, ref weight);
    if (rc != Rhino.Commands.Result.Success)
      return rc;

    // Writing takes more than Add(): mutate a DUPLICATE of the owning
    // top-level Brep and put the whole Brep back into the document, keyed by
    // the object's id. Adding to the picked face's surface alone reports
    // success and then the data is lost, and replacing via the subobject
    // objref would target only the selected face.
    var brepObject = objref.Object();
    if (brepObject == null)
      return Rhino.Commands.Result.Failure;

    var newBrep = brepObject.Geometry.Duplicate() as Rhino.Geometry.Brep;
    if (newBrep == null)
      return Rhino.Commands.Result.Failure;

    // Again: the underlying surface, not the face.
    var surface = newBrep.Faces[face.FaceIndex].UnderlyingSurface();
    surface.UserData.Add(new PhysicalData(weight, 12.34));

    if (!doc.Objects.Replace(brepObject.Id, newBrep))
      return Rhino.Commands.Result.Failure;

    return Rhino.Commands.Result.Success;
  }
}
```

**Python**

No Python version — see the note under [A custom UserData subclass](#a-custom-userdata-subclass).

---

### User strings on an object

The simplest durable storage: string-keyed, string-valued, saved automatically, and readable by anyone.
Values are **strings only** — serialize numbers yourself, and remember attribute user strings need
`CommitChanges()` while geometry user strings do not.

**C#**
```csharp
// pattern -- the guide names these APIs but ships no snippet
partial class Examples
{
  public static Rhino.Commands.Result ObjectUserStrings(Rhino.RhinoDoc doc)
  {
    Rhino.DocObjects.ObjRef objref;
    var rc = Rhino.Input.RhinoGet.GetOneObject(
      "Select object", false, Rhino.DocObjects.ObjectType.AnyObject, out objref);
    if (rc != Rhino.Commands.Result.Success)
      return rc;

    var obj = objref.Object();
    if (obj == null)
      return Rhino.Commands.Result.Failure;

    // Read
    var existing = obj.Attributes.GetUserString("PartNumber");
    if (!string.IsNullOrEmpty(existing))
    {
      Rhino.RhinoApp.WriteLine("PartNumber = {0}", existing);
      return Rhino.Commands.Result.Success;
    }

    // Write -- on the attributes, so CommitChanges() is required
    obj.Attributes.SetUserString("PartNumber", "A-1042");
    obj.Attributes.SetUserString("Mass", (12.5).ToString("R"));
    obj.CommitChanges();

    // Geometry user strings require replacing the document geometry.
    var geometry = obj.Geometry.Duplicate();
    geometry.SetUserString("Origin", "generated");
    if (!doc.Objects.Replace(objref, geometry))
      return Rhino.Commands.Result.Failure;

    // Enumerate everything on the attributes
    var all = obj.Attributes.GetUserStrings();
    foreach (string key in all.AllKeys)
      Rhino.RhinoApp.WriteLine("  {0} = {1}", key, all[key]);

    // Delete by setting null
    obj.Attributes.SetUserString("Mass", null);
    obj.CommitChanges();

    doc.Views.Redraw();
    return Rhino.Commands.Result.Success;
  }
}
```

**Python**
```python
# pattern -- the guide names these APIs but ships no snippet
import Rhino
import scriptcontext

def ObjectUserStrings():
    rc, objref = Rhino.Input.RhinoGet.GetOneObject(
        "Select object", False, Rhino.DocObjects.ObjectType.AnyObject)
    if rc != Rhino.Commands.Result.Success:
        return rc

    obj = objref.Object()
    if obj is None:
        return Rhino.Commands.Result.Failure

    # Read
    existing = obj.Attributes.GetUserString("PartNumber")
    if existing:
        print("PartNumber = {0}".format(existing))
        return Rhino.Commands.Result.Success

    # Write -- on the attributes, so CommitChanges() is required
    obj.Attributes.SetUserString("PartNumber", "A-1042")
    obj.Attributes.SetUserString("Mass", repr(12.5))
    obj.CommitChanges()

    # Enumerate everything on the attributes
    all_strings = obj.Attributes.GetUserStrings()
    for key in all_strings.AllKeys:
        print("  {0} = {1}".format(key, all_strings[key]))

    # Delete by setting None
    obj.Attributes.SetUserString("Mass", None)
    obj.CommitChanges()

    scriptcontext.doc.Views.Redraw()
    return Rhino.Commands.Result.Success

if __name__ == "__main__":
    ObjectUserStrings()
```

---

### Document-level user strings

`doc.Strings` is the same string/string store scoped to the whole model — the right place for
"which template was this generated from" data that belongs to no single object.

**C#**
```csharp
// pattern -- the guide names these APIs but ships no snippet
partial class Examples
{
  public static Rhino.Commands.Result DocumentUserStrings(Rhino.RhinoDoc doc)
  {
    doc.Strings.SetString("GeneratedBy", "MyPlugIn 1.4");
    doc.Strings.SetString("GeneratedOn", System.DateTime.UtcNow.ToString("o"));

    for (int i = 0; i < doc.Strings.Count; i++)
      Rhino.RhinoApp.WriteLine("  {0} = {1}",
        doc.Strings.GetKey(i), doc.Strings.GetValue(i));

    var by = doc.Strings.GetValue("GeneratedBy");
    Rhino.RhinoApp.WriteLine("GeneratedBy = {0}", by);

    // Setting null removes the entry
    doc.Strings.SetString("GeneratedOn", null);

    return Rhino.Commands.Result.Success;
  }
}
```

**Python**
```python
# pattern -- the guide names these APIs but ships no snippet
import Rhino
import System
from scriptcontext import doc

def DocumentUserStrings():
    doc.Strings.SetString("GeneratedBy", "MyPlugIn 1.4")
    doc.Strings.SetString("GeneratedOn", System.DateTime.UtcNow.ToString("o"))

    for i in range(doc.Strings.Count):
        print("  {0} = {1}".format(doc.Strings.GetKey(i), doc.Strings.GetValue(i)))

    print("GeneratedBy = {0}".format(doc.Strings.GetValue("GeneratedBy")))

    # Setting None removes the entry
    doc.Strings.SetString("GeneratedOn", None)

    return Rhino.Commands.Result.Success

if __name__ == "__main__":
    DocumentUserStrings()
```

---

### The UserDictionary (ArchivableDictionary)

Typed persistence with no serialization code: `UserDictionary` is an `ArchivableDictionary` that stores
numbers, points, colours, arrays and **nested dictionaries**, and Rhino saves and restores it for you. The
catch is retrieval — you must ask for the type you stored (`GetDouble`, `TryGetPoint3d`, …) or check
`ContainsKey` first; a wrong-type read throws.

**C#**
```csharp
// pattern -- the guide names these APIs but ships no snippet
partial class Examples
{
  public static Rhino.Commands.Result ObjectUserDictionary(Rhino.RhinoDoc doc)
  {
    Rhino.DocObjects.ObjRef objref;
    var rc = Rhino.Input.RhinoGet.GetOneObject(
      "Select object", false, Rhino.DocObjects.ObjectType.AnyObject, out objref);
    if (rc != Rhino.Commands.Result.Success)
      return rc;

    var obj = objref.Object();
    if (obj == null)
      return Rhino.Commands.Result.Failure;

    // The geometry's dictionary travels with the geometry
    Rhino.Collections.ArchivableDictionary dict = obj.Geometry.UserDictionary;

    if (dict.ContainsKey("Density"))
    {
      double density = dict.GetDouble("Density");
      Rhino.RhinoApp.WriteLine("Density = {0}", density);
      return Rhino.Commands.Result.Success;
    }

    dict.Set("Density", 12.34);
    dict.Set("Anchor", new Rhino.Geometry.Point3d(1, 2, 3));
    dict.Set("Tags", new string[] { "structural", "reviewed" });

    // Nested dictionaries are allowed
    var child = new Rhino.Collections.ArchivableDictionary();
    child.Set("Revision", 3);
    dict.Set("Meta", child);

    // Typed read-back with a default
    Rhino.Geometry.Point3d anchor;
    if (dict.TryGetPoint3d("Anchor", out anchor))
      Rhino.RhinoApp.WriteLine("Anchor = {0}", anchor);

    // The geometry dictionary is stored with the geometry, so put it back
    doc.Objects.Replace(objref, obj.Geometry as Rhino.Geometry.GeometryBase);
    doc.Views.Redraw();
    return Rhino.Commands.Result.Success;
  }
}
```

**Python**
```python
# pattern -- the guide names these APIs but ships no snippet
import Rhino
import scriptcontext

def ObjectUserDictionary():
    rc, objref = Rhino.Input.RhinoGet.GetOneObject(
        "Select object", False, Rhino.DocObjects.ObjectType.AnyObject)
    if rc != Rhino.Commands.Result.Success:
        return rc

    obj = objref.Object()
    if obj is None:
        return Rhino.Commands.Result.Failure

    # The attributes' dictionary needs CommitChanges(); the geometry's does not,
    # but the geometry has to be put back into the document.
    dictionary = obj.Attributes.UserDictionary

    if dictionary.ContainsKey("Density"):
        print("Density = {0}".format(dictionary.GetDouble("Density")))
        return Rhino.Commands.Result.Success

    dictionary.Set("Density", 12.34)
    dictionary.Set("Anchor", Rhino.Geometry.Point3d(1, 2, 3))

    # Nested dictionaries are allowed
    child = Rhino.Collections.ArchivableDictionary()
    child.Set("Revision", 3)
    dictionary.Set("Meta", child)

    obj.CommitChanges()
    scriptcontext.doc.Views.Redraw()
    return Rhino.Commands.Result.Success

if __name__ == "__main__":
    ObjectUserDictionary()
```

---

### Document user data from a plug-in

Three `PlugIn` overrides store plug-in-wide state inside the `.3dm`. The order matters: on save Rhino calls
`ShouldCallWriteDocument(options)`, and **only if it returns `true`** does it write your plug-in's id into
the file and then call `WriteDocument`. On open, that stored id is what causes Rhino to load your plug-in
and call `ReadDocument`. Returning `false` unconditionally — the base-class default — is why "my document
data isn't saving".

**C#**
```csharp
// pattern -- the guide describes this flow; the API reference supplies the signatures
using Rhino;
using Rhino.PlugIns;
using Rhino.FileIO;
using Rhino.Collections;
using System.Collections.Generic;

namespace examples_cs
{
  public class MyPlugIn : Rhino.PlugIns.PlugIn
  {
    public MyPlugIn()
    {
      if (Instance == null) Instance = this;

      // Drop a document's state when it closes, or the table grows forever.
      RhinoDoc.CloseDocument += (sender, e) =>
        m_document_data.Remove(e.Document.RuntimeSerialNumber);
    }

    public static MyPlugIn Instance { get; private set; }

    // The state we want in the 3dm file. There is ONE plug-in instance serving
    // EVERY open document, so this must NOT live in plain instance properties:
    // with two documents open, ReadDocument for one file would overwrite the
    // values WriteDocument later serializes for the other. Key it by the
    // document's runtime serial number instead.
    class DocumentData
    {
      public string ProjectCode { get; set; }
      public int RevisionNumber { get; set; }
    }

    readonly Dictionary<uint, DocumentData> m_document_data = new Dictionary<uint, DocumentData>();

    DocumentData DataFor(RhinoDoc doc)
    {
      DocumentData data;
      if (!m_document_data.TryGetValue(doc.RuntimeSerialNumber, out data))
      {
        data = new DocumentData();
        m_document_data[doc.RuntimeSerialNumber] = data;
      }
      return data;
    }

    public string GetProjectCode(RhinoDoc doc) => DataFor(doc).ProjectCode;
    public void SetProjectCode(RhinoDoc doc, string value)
    {
      DataFor(doc).ProjectCode = value;
      doc.Modified = true;
    }

    // Rhino asks this on every save. The base class returns false, which is
    // why document data silently fails to persist if you don't override it.
    // FileWriteOptions exposes the source document, so opt in only when this
    // document has state to serialize.
    protected override bool ShouldCallWriteDocument(FileWriteOptions options)
    {
      if (options.WriteGeometryOnly || options.WriteSelectedObjectsOnly)
        return false;

      var doc = options.RhinoDoc;
      return doc != null && m_document_data.ContainsKey(doc.RuntimeSerialNumber);
    }

    protected override void WriteDocument(RhinoDoc doc, BinaryArchiveWriter archive, FileWriteOptions options)
    {
      // THIS document's state, not shared plug-in state.
      var data = DataFor(doc);

      // The dictionary handles versioning better than raw chunk writes.
      var dict = new ArchivableDictionary(1, "MyPlugInDocumentData");
      dict.Set("ProjectCode", data.ProjectCode ?? string.Empty);
      dict.Set("RevisionNumber", data.RevisionNumber);
      archive.WriteDictionary(dict);
    }

    protected override void ReadDocument(RhinoDoc doc, BinaryArchiveReader archive, FileReadOptions options)
    {
      // Always consume the archive first so the reader stays positioned
      // correctly, even when the data ends up ignored below.
      var dict = archive.ReadDictionary();
      if (dict == null) return;

      // Check WHY the file is being read BEFORE touching destination state.
      // During an insert / import / reference attach this archive holds the
      // SOURCE file's values; applying them would overwrite the destination
      // document's own project code and revision. Merge or ignore explicitly
      // -- this sample ignores.
      if (options.ImportMode || options.ImportReferenceMode)
      {
        RhinoApp.WriteLine("MyPlugIn data in the imported file was ignored");
        return;
      }

      var data = DataFor(doc);
      if (dict.ContainsKey("ProjectCode"))
        data.ProjectCode = dict["ProjectCode"] as string;
      if (dict.ContainsKey("RevisionNumber"))
        data.RevisionNumber = (int)dict["RevisionNumber"];
    }
  }
}
```

**Python**

Not available from a script. `ShouldCallWriteDocument` / `WriteDocument` / `ReadDocument` are `protected`
overrides on the compiled `Rhino.PlugIns.PlugIn` base class, and Rhino calls them on a plug-in it loaded
from the file's plug-in id — there is no script-hosted equivalent. From a script, use
[document-level user strings](#document-level-user-strings), which persist automatically.

---

### App-level preferences with PlugIn.Settings

`PlugIn.Settings` is a `PersistentSettings` bag written as XML under `SettingsDirectory` in the user's
profile — per user and per machine, **not** part of the `.3dm`. Every getter takes a default, so a
first-run read never throws; `SaveSettings()` flushes and raises `SettingsSaved`.

**C#**
```csharp
// pattern -- assembled from the PlugIn API reference member descriptions
using Rhino;
using Rhino.PlugIns;

namespace examples_cs
{
  public class MyPlugIn : Rhino.PlugIns.PlugIn
  {
    public static MyPlugIn Instance { get; private set; }
    public MyPlugIn() { if (Instance == null) Instance = this; }

    // Load before any of this plug-in's commands are typed -- needed when you
    // register render content, event watchers, display modes or panels.
    public override PlugInLoadTime LoadTime
    {
      get { return PlugInLoadTime.AtStartup; }
    }

    public double DefaultTolerance
    {
      // The second argument is the fallback on first run
      get { return Settings.GetDouble("DefaultTolerance", 0.001); }
      set { Settings.SetDouble("DefaultTolerance", value); }
    }

    public bool ShowWelcome
    {
      get { return Settings.GetBool("ShowWelcome", true); }
      set { Settings.SetBool("ShowWelcome", value); }
    }

    public System.Drawing.Color HighlightColor
    {
      get { return Settings.GetColor("HighlightColor", System.Drawing.Color.Orange); }
      set { Settings.SetColor("HighlightColor", value); }
    }

    protected override LoadReturnCode OnLoad(ref string errorMessage)
    {
      // Child bags keep related settings together
      var ui = Settings.AddChild("UserInterface");
      ui.SetInteger("PanelWidth", ui.GetInteger("PanelWidth", 320));

      RhinoApp.WriteLine("{0} {1} loaded; settings in {2}", Name, Version, SettingsDirectory);
      return LoadReturnCode.Success;
    }

    protected override void OnShutdown()
    {
      // Writes settings to disk and raises SettingsSaved
      SaveSettings();
    }
  }
}
```

**Python**

Not available from a script — `Settings` is an instance member of a loaded `PlugIn`, so there is no
plug-in to read it from. A script that needs preferences should use `Rhino.PersistentSettings` through its
own plug-in, or fall back to a file it manages itself.

---

## Corrections applied

Changes made relative to the published McNeel samples and guide pages:

- **Custom `UserData`** — reproduced verbatim from the guide's `PhysicalData` sample. The only additions
  are comments marking the three non-obvious requirements (unique `[Guid]`, parameterless constructor,
  `OnDuplicate`) and the hand-rolled `Write3dmChunkVersion` alternative, which the guide describes in prose.
- **Attach user data to a Brep face** — based on the samples-site recipe, adapted to reuse the
  `PhysicalData` class defined above (the published version uses a separate `MyCustomData` class this
  file never defines), with a `face == null` guard added (the published version dereferences
  `objref.Face()` unchecked). The write path follows the current McNeel sample: duplicate the owning
  top-level `Brep`, attach to the corresponding surface in the duplicate, and
  `doc.Objects.Replace(brepObject.Id, newBrep)`; mutating the picked face in place, or replacing via
  the subobject `ObjRef`, loses the data.
- **No Python was invented for `UserData`.** The published page has none, and none is possible from a
  script; the recipe says so and points at the two alternatives instead.
- **User strings, document user strings, `UserDictionary`, document user data, `PlugIn.Settings`** — the
  guide pages name these APIs but ship no code, so each recipe is written from the API-reference member
  descriptions and is marked `pattern` in a leading comment rather than presented as a published sample.
  Verify exact overloads against the RhinoCommon API reference for your target version.
- **Document user data** — the state is keyed by `RhinoDoc.RuntimeSerialNumber` in a dictionary, cleaned
  up on `RhinoDoc.CloseDocument`, rather than held in plain plug-in properties, because one plug-in
  instance serves every open document and instance properties would leak state across documents.
  `ReadDocument` checks `ImportMode`/`ImportReferenceMode` before touching destination state and ignores
  the imported values; an insert or reference attach must not overwrite the open document's own data.
- **Python throughout** — CPython 3 syntax (`print(...)`, `except ... as e`), and every function returns a
  `Rhino.Commands.Result` on every path.
