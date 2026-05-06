#!/usr/bin/env python3
"""CLI for azure-architecture-autopilot diagram engine."""
import argparse
import json
import sys
import os
import subprocess
import shutil
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generator import generate_diagram


def main():
    parser = argparse.ArgumentParser(
        description="Generate interactive Azure architecture diagrams",
        prog="azure-architecture-autopilot"
    )
    parser.add_argument("-s", "--services", help="Services JSON (string or file path)")
    parser.add_argument("-c", "--connections", help="Connections JSON (string or file path)")
    parser.add_argument("-t", "--title", default="Azure Architecture", help="Diagram title")
    parser.add_argument("-o", "--output", default="azure-architecture.html", help="Output file path")
    parser.add_argument("-f", "--format", choices=["html", "png", "both"], default="html",
                        help="Output format: html (default), png, or both (html+png)")
    parser.add_argument("--vnet-info", default="", help="VNet CIDR info")
    parser.add_argument("--hierarchy", default="", help="Subscription/RG hierarchy JSON")

    args = parser.parse_args()

    if not args.services or not args.connections:
        parser.error("-s/--services and -c/--connections are required")

    services = _load_json(args.services, "services")
    connections = _load_json(args.connections, "connections")
    hierarchy = None
    if args.hierarchy:
        hierarchy = _load_json(args.hierarchy, "hierarchy")

    services = _normalize_services(services)
    connections = _normalize_connections(connections)

    html = generate_diagram(
        services=services,
        connections=connections,
        title=args.title,
        vnet_info=args.vnet_info,
        hierarchy=hierarchy,
    )

    # Determine output paths
    out = Path(args.output)
    html_path = out.with_suffix(".html")
    png_path = out.with_suffix(".png")
    svg_path = out.with_suffix(".svg")

    if args.format in ("html", "both"):
        html_path.write_text(html, encoding="utf-8")
        print(f"HTML saved: {html_path}")

    if args.format in ("png", "both"):
        # Write temp HTML then screenshot with puppeteer/playwright
        tmp_html = html_path if args.format == "both" else Path(str(png_path) + ".tmp.html")
        if args.format != "both":
            tmp_html.write_text(html, encoding="utf-8")

        success = _html_to_png(tmp_html, png_path)

        if args.format != "both" and tmp_html.exists():
            tmp_html.unlink()

        if success:
            print(f"PNG saved: {png_path}")
        else:
            print(f"WARNING: PNG export failed. Install puppeteer (npm i puppeteer) for PNG support.", file=sys.stderr)
            print(f"HTML saved instead: {html_path}")
            if not html_path.exists():
                html_path.write_text(html, encoding="utf-8")


def _html_to_png(html_path, png_path, width=1920, height=1080):
    """Convert HTML to PNG using puppeteer (Node.js)."""
    node = shutil.which("node")
    if not node:
        return False

    # Try multiple puppeteer locations
    script = f"""
let puppeteer;
const paths = [
  'puppeteer',
  process.env.TEMP + '/node_modules/puppeteer',
  process.env.HOME + '/node_modules/puppeteer',
  './node_modules/puppeteer'
];
for (const p of paths) {{ try {{ puppeteer = require(p); break; }} catch(e) {{}} }}
if (!puppeteer) {{ console.error('puppeteer not found'); process.exit(1); }}
(async () => {{
  const browser = await puppeteer.launch({{headless: 'new'}});
  const page = await browser.newPage();
  await page.setViewport({{width: {width}, height: {height}}});
  await page.goto('file:///{html_path.resolve().as_posix()}', {{waitUntil: 'networkidle0'}});
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({{path: '{png_path.resolve().as_posix()}'}});
  await browser.close();
}})();
"""
    try:
        result = subprocess.run([node, "-e", script], capture_output=True, text=True, timeout=30)
        return result.returncode == 0 and png_path.exists()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _load_json(value, name):
    """Load JSON from string or file path. Extracts named key from combined JSON if present."""
    data = None
    if os.path.isfile(value):
        with open(value, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        try:
            data = json.loads(value)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON for --{name}: {e}", file=sys.stderr)
            sys.exit(1)

    # If data is a dict with the named key, extract it (combined JSON file support)
    if isinstance(data, dict) and name in data:
        return data[name]
    return data


def _normalize_services(services):
    """Normalize service fields for tolerance."""
    for svc in services:
        if isinstance(svc.get("details"), str):
            svc["details"] = [svc["details"]]
        if isinstance(svc.get("private"), str):
            val = svc["private"].lower()
            if val in ("true", "1", "yes", "on"):
                svc["private"] = True
            elif val in ("false", "0", "no", "off"):
                svc["private"] = False
            else:
                # Log warning for invalid values
                print(f"WARNING: Invalid boolean value '{svc['private']}' for 'private' field. Defaulting to False.", file=sys.stderr)
                svc["private"] = False
    return services


def _normalize_connections(connections):
    """Normalize connection fields for tolerance."""
    for conn in connections:
        if "type" not in conn:
            conn["type"] = "default"
    return connections


if __name__ == "__main__":
    main()
