import argparse
import re
import json
import sys

VALID_FIELDS = [
    "timestamp", "app", "level", "endpoint", "contextPath", "event", 
    "user", "class", "function", "rowId", "body"
]

def validate_fields(value):
    fields = [f.strip() for f in value.split(",")]
    for f in fields:
        if f not in VALID_FIELDS:
            raise argparse.ArgumentTypeError(f"invalid field: {f}. Available: {', '.join(VALID_FIELDS)}")
    return fields

def parse_args():
    parser = argparse.ArgumentParser(
        prog="simplicite-log2json",
        description="Parse Simplicité logs and output JSON."
    )
    parser.add_argument("input", help="Input .txt log file path")
    parser.add_argument("-o", "--output", help="Output file path (default: stdout)", metavar="FILE")
    
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--include", help=f"Fields to include (comma-separated). Available: {', '.join(VALID_FIELDS)}", type=validate_fields, metavar="FIELDS", action="append")
    group.add_argument("--exclude", help=f"Fields to exclude (comma-separated). Available: {', '.join(VALID_FIELDS)}", type=validate_fields, metavar="FIELDS", action="append")
    
    return parser.parse_args()

def parse_log_entry(text, log_regex):
    match = log_regex.match(text)
    if match:
        return {
            "timestamp": match.group("timestamp") or "",
            "app": match.group("app") or "",
            "level": match.group("level") or "",
            "endpoint": match.group("endpoint") or "",
            "contextPath": match.group("contextPath") or "",
            "event": match.group("event") or "",
            "user": match.group("user") or "",
            "class": match.group("class") or "",
            "function": match.group("function") or "",
            "rowId": match.group("rowId") or "",
            "body": match.group("body") or "",
        }
    return None

def filter_entry(entry, include, exclude):
    filtered = {}
    for k, v in entry.items():
        if include is not None and k not in include:
            continue
        if exclude is not None and k in exclude:
            continue
        filtered[k] = v
    return filtered

def main():
    args = parse_args()
    
    include_fields = [item for sublist in args.include for item in sublist] if args.include else None
    exclude_fields = [item for sublist in args.exclude for item in sublist] if args.exclude else None

    log_regex = re.compile(r"^(?P<timestamp>.*?)\|(?P<app>SIMPLICITE)\|(?P<level>.+?)\|\|(?P<endpoint>.*?)\|(?P<contextPath>.*?)\|(?P<event>.*?)\|(?P<user>.*?)\|(?P<class>.*?)\|(?P<function>.*?)\|(?P<rowId>.*?)\|(?P<body>.*)$", re.DOTALL)
    timestamp_re = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}")
    
    entries = []
    buffer = []
    processed = 0
    skipped = 0
    
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            for line in f:
                line_stripped = line.rstrip('\n')
                
                if timestamp_re.match(line_stripped):
                    if buffer:
                        entry_text = '\n'.join(buffer)
                        entry = parse_log_entry(entry_text, log_regex)
                        if entry:
                            entries.append(entry)
                            processed += 1
                        else:
                            skipped += 1
                        buffer = []
                
                buffer.append(line_stripped)
                
            if buffer:
                entry_text = '\n'.join(buffer)
                entry = parse_log_entry(entry_text, log_regex)
                if entry:
                    entries.append(entry)
                    processed += 1
                else:
                    skipped += 1
    except Exception as e:
        sys.stderr.write(f"Failed to open input file: {e}\n")
        sys.exit(1)
        
    filtered = [filter_entry(entry, include_fields, exclude_fields) for entry in entries]
    json_str = json.dumps(filtered, indent=2)
    
    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(json_str)
        except Exception as e:
            sys.stderr.write(f"Failed to create output file: {e}\n")
            sys.exit(1)
    else:
        print(json_str)
        
    sys.stderr.write(f"Processed: {processed} entries, Skipped: {skipped} entries\n")

if __name__ == "__main__":
    main()
