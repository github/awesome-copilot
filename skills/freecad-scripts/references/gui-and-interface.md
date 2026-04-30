# FreeCAD GUI and Interface

Reference guide for building FreeCAD user interfaces: PySide/Qt dialogs, task panels, Gui Commands, Coin3D scenegraph via Pivy.

## Official Wiki References

- [Creating interface tools](https://wiki.freecad.org/Manual:Creating_interface_tools)
- [Gui Command](https://wiki.freecad.org/Gui_Command)
- [Define a command](https://wiki.freecad.org/Command)
- [PySide](https://wiki.freecad.org/PySide)
- [PySide beginner examples](https://wiki.freecad.org/PySide_Beginner_Examples)
- [PySide intermediate examples](https://wiki.freecad.org/PySide_Intermediate_Examples)
- [PySide advanced examples](https://wiki.freecad.org/PySide_Advanced_Examples)
- [PySide usage snippets](https://wiki.freecad.org/PySide_usage_snippets)
- [Interface creation](https://wiki.freecad.org/Interface_creation)
- [Dialog creation](https://wiki.freecad.org/Dialog_creation)
- [Dialog creation with various widgets](https://wiki.freecad.org/Dialog_creation_with_various_widgets)
- [Dialog creation reading and writing files](https://wiki.freecad.org/Dialog_creation_reading_and_writing_files)
- [Dialog creation setting colors](https://wiki.freecad.org/Dialog_creation_setting_colors)
- [Dialog creation image and animated GIF](https://wiki.freecad.org/Dialog_creation_image_and_animated_GIF)
- [Qt Example](https://wiki.freecad.org/Qt_Example)
- [3D view](https://wiki.freecad.org/3D_view)
- [The Coin scenegraph](https://wiki.freecad.org/Scenegraph)
- [Pivy](https://wiki.freecad.org/Pivy)

## Gui Command

The standard way to add toolbar buttons and menu items in FreeCAD:

```python
import FreeCAD
import FreeCADGui

class MyCommand:
    """A registered FreeCAD command."""

    def GetResources(self):
        return {
            "Pixmap": ":/icons/Part_Box.svg",    # Icon (built-in or custom path)
            "MenuText": "My Command",
            "ToolTip": "Does something useful",
            "Accel": "Ctrl+Shift+M",             # Keyboard shortcut
            "CmdType": "ForEdit"                  # Optional: ForEdit, Alter, etc.
        }

    def IsActive(self):
        """Return True if command should be enabled."""
        return FreeCAD.ActiveDocument is not None

    def Activated(self):
        """Called when the command is triggered."""
        FreeCAD.Console.PrintMessage("Command activated!\n")
        # Open a task panel:
        panel = MyTaskPanel()
        FreeCADGui.Control.showDialog(panel)

# Register the command (name must be unique)
FreeCADGui.addCommand("My_Command", MyCommand())
```

## Task Panel (Sidebar Integration)

Task panels appear in FreeCAD's left sidebar — the preferred way to build interactive tools:

```python
import FreeCAD
import FreeCADGui
from PySide2 import QtWidgets, QtCore

class MyTaskPanel:
    """Task panel for the sidebar."""

    def __init__(self):
        # Build the widget
        self.form = QtWidgets.QWidget()
        self.form.setWindowTitle("My Tool")
        layout = QtWidgets.QVBoxLayout(self.form)

        # Input widgets
        self.length_spin = QtWidgets.QDoubleSpinBox()
        self.length_spin.setRange(0.1, 10000.0)
        self.length_spin.setValue(10.0)
        self.length_spin.setSuffix(" mm")
        self.length_spin.setDecimals(2)

        self.width_spin = QtWidgets.QDoubleSpinBox()
        self.width_spin.setRange(0.1, 10000.0)
        self.width_spin.setValue(10.0)
        self.width_spin.setSuffix(" mm")

        self.height_spin = QtWidgets.QDoubleSpinBox()
        self.height_spin.setRange(0.1, 10000.0)
        self.height_spin.setValue(5.0)
        self.height_spin.setSuffix(" mm")

        self.fillet_check = QtWidgets.QCheckBox("Apply fillet")

        # Form layout
        form_layout = QtWidgets.QFormLayout()
        form_layout.addRow("Length:", self.length_spin)
        form_layout.addRow("Width:", self.width_spin)
        form_layout.addRow("Height:", self.height_spin)
        form_layout.addRow(self.fillet_check)
        layout.addLayout(form_layout)

        # Live preview on value change
        self.length_spin.valueChanged.connect(self._preview)
        self.width_spin.valueChanged.connect(self._preview)
        self.height_spin.valueChanged.connect(self._preview)

    def _preview(self):
        """Update preview in 3D view."""
        pass  # Build and display temporary shape

    def accept(self):
        """Called when user clicks OK."""
        import Part
        doc = FreeCAD.ActiveDocument
        shape = Part.makeBox(
            self.length_spin.value(),
            self.width_spin.value(),
            self.height_spin.value()
        )
        Part.show(shape, "MyBox")
        doc.recompute()
        FreeCADGui.Control.closeDialog()
        return True

    def reject(self):
        """Called when user clicks Cancel."""
        FreeCADGui.Control.closeDialog()
        return True

    def getStandardButtons(self):
        """Which buttons to show."""
        return int(QtWidgets.QDialogButtonBox.Ok |
                   QtWidgets.QDialogButtonBox.Cancel)

    def isAllowedAlterSelection(self):
        return True

    def isAllowedAlterView(self):
        return True

    def isAllowedAlterDocument(self):
        return True

# Show:
# FreeCADGui.Control.showDialog(MyTaskPanel())
```

### Task Panel with Multiple Widgets (Multi-Form)

```python
class MultiFormPanel:
    def __init__(self):
        self.form = [self._buildPage1(), self._buildPage2()]

    def _buildPage1(self):
        w = QtWidgets.QWidget()
        w.setWindowTitle("Page 1")
        # ... add widgets ...
        return w

    def _buildPage2(self):
        w = QtWidgets.QWidget()
        w.setWindowTitle("Page 2")
        # ... add widgets ...
        return w
```

## Standalone PySide Dialogs

```python
import FreeCAD
import FreeCADGui
from PySide2 import QtWidgets, QtCore, QtGui

class MyDialog(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super().__init__(parent or (FreeCADGui.getMainWindow() if FreeCAD.GuiUp else None))
        self.setWindowTitle("My Dialog")
        self.setWindowFlags(self.windowFlags() | QtCore.Qt.WindowStaysOnTopHint)

        layout = QtWidgets.QVBoxLayout(self)

        # Combo box
        self.combo = QtWidgets.QComboBox()
        self.combo.addItems(["Option A", "Option B", "Option C"])
        layout.addWidget(self.combo)

        # Slider
        self.slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.slider.setRange(1, 100)
        self.slider.setValue(50)
        layout.addWidget(self.slider)

        # Text input
        self.line_edit = QtWidgets.QLineEdit()
        self.line_edit.setPlaceholderText("Enter a name...")
        layout.addWidget(self.line_edit)

        # Button box
        buttons = QtWidgets.QDialogButtonBox(
            QtWidgets.QDialogButtonBox.Ok | QtWidgets.QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)
```

### Loading a .ui File

```python
import os
from PySide2 import QtWidgets, QtUiTools, QtCore

def loadUiFile(ui_path):
    """Load a Qt Designer .ui file."""
    loader = QtUiTools.QUiLoader()
    file = QtCore.QFile(ui_path)
    file.open(QtCore.QFile.ReadOnly)
    widget = loader.load(file)
    file.close()
    return widget

# In a task panel:
class UiTaskPanel:
    def __init__(self):
        ui_path = os.path.join(os.path.dirname(__file__), "panel.ui")
        self.form = loadUiFile(ui_path)
        # Access widgets by objectName set in Qt Designer
        self.form.myButton.clicked.connect(self._onButton)
```

### File Dialogs

```python
# Open file
path, _ = QtWidgets.QFileDialog.getOpenFileName(
    FreeCADGui.getMainWindow(),
    "Open File",
    "",
    "STEP files (*.step *.stp);;All files (*)"
)

# Save file
path, _ = QtWidgets.QFileDialog.getSaveFileName(
    FreeCADGui.getMainWindow(),
    "Save File",
    "",
    "STL files (*.stl);;All files (*)"
)

# Select directory
path = QtWidgets.QFileDialog.getExistingDirectory(
    FreeCADGui.getMainWindow(),
    "Select Directory"
)
```

### Message Boxes

```python
QtWidgets.QMessageBox.information(None, "Info", "Operation completed.")
QtWidgets.QMessageBox.warning(None, "Warning", "Something may be wrong.")
QtWidgets.QMessageBox.critical(None, "Error", "An error occurred.")

result = QtWidgets.QMessageBox.question(
    None, "Confirm", "Are you sure?",
    QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No
)
if result == QtWidgets.QMessageBox.Yes:
    pass  # proceed
```

### Input Dialogs

```python
text, ok = QtWidgets.QInputDialog.getText(None, "Input", "Enter name:")
value, ok = QtWidgets.QInputDialog.getDouble(None, "Input", "Value:", 10.0, 0, 1000, 2)
choice, ok = QtWidgets.QInputDialog.getItem(None, "Choose", "Select:", ["A","B","C"], 0, False)
```

## Coin3D / Pivy Scenegraph

FreeCAD's 3D view uses Coin3D (Open Inventor). Pivy provides Python bindings.

```python
from pivy import coin
import FreeCADGui

# Get the scenegraph root
sg = FreeCADGui.ActiveDocument.ActiveView.getSceneGraph()

# --- Basic shapes ---
sep = coin.SoSeparator()

# Material (color)
mat = coin.SoMaterial()
mat.diffuseColor.setValue(0.0, 0.8, 0.2)  # RGB 0-1
mat.transparency.setValue(0.3)             # 0=opaque, 1=invisible

# Transform
transform = coin.SoTransform()
transform.translation.setValue(10, 0, 0)
transform.rotation.setValue(coin.SbVec3f(0,0,1), 0.785)  # axis, angle(rad)
transform.scaleFactor.setValue(2, 2, 2)

# Shapes
sphere = coin.SoSphere()
sphere.radius.setValue(3.0)

cube = coin.SoCube()
cube.width.setValue(5)
cube.height.setValue(5)
cube.depth.setValue(5)

cylinder = coin.SoCylinder()
cylinder.radius.setValue(2)
cylinder.height.setValue(10)

# Assemble
sep.addChild(mat)
sep.addChild(transform)
sep.addChild(sphere)
sg.addChild(sep)

# --- Lines ---
line_sep = coin.SoSeparator()
coords = coin.SoCoordinate3()
coords.point.setValues(0, 3, [[0,0,0], [10,0,0], [10,10,0]])
line_set = coin.SoLineSet()
line_set.numVertices.setValue(3)
line_sep.addChild(coords)
line_sep.addChild(line_set)
sg.addChild(line_sep)

# --- Points ---
point_sep = coin.SoSeparator()
style = coin.SoDrawStyle()
style.pointSize.setValue(5)
coords = coin.SoCoordinate3()
coords.point.setValues(0, 3, [[0,0,0], [5,5,0], [10,0,0]])
points = coin.SoPointSet()
point_sep.addChild(style)
point_sep.addChild(coords)
point_sep.addChild(points)
sg.addChild(point_sep)

# --- Text ---
text_sep = coin.SoSeparator()
trans = coin.SoTranslation()
trans.translation.setValue(0, 0, 5)
font = coin.SoFont()
font.name.setValue("Arial")
font.size.setValue(16)
text = coin.SoText2()       # 2D screen-aligned text
text.string.setValue("Hello")
text_sep.addChild(trans)
text_sep.addChild(font)
text_sep.addChild(text)
sg.addChild(text_sep)

# --- Cleanup ---
sg.removeChild(sep)
sg.removeChild(line_sep)
```

## View Manipulation

```python
view = FreeCADGui.ActiveDocument.ActiveView

# Camera operations
view.viewIsometric()
view.viewFront()
view.viewTop()
view.viewRight()
view.fitAll()
view.setCameraOrientation(FreeCAD.Rotation(0, 0, 0))
view.setCameraType("Perspective")   # or "Orthographic"

# Save image
view.saveImage("/path/to/screenshot.png", 1920, 1080, "White")

# Get camera info
cam = view.getCameraNode()
```
