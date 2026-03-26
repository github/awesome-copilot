# Barcode Scanner

Barcode/QR scanning using OutSystems barcode libraries.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/barcode-scanner
npx cap sync
```

## Configuration

### Android

Minimum SDK 26. Two scanning libraries: ZXING (all formats) or MLKIT.

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan barcodes.</string>
```

## Usage

```typescript
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

const result = await CapacitorBarcodeScanner.scanBarcode({
  hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
  cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
});
console.log(result.ScanResult);
```

## Notes

- Supported formats: QR_CODE, AZTEC, CODABAR, CODE_39, CODE_93, CODE_128, DATA_MATRIX, EAN_13, EAN_8, ITF, PDF_417, UPC_A, UPC_E, and more.
- MAXICODE and UPC_EAN_EXTENSION unsupported on iOS.
