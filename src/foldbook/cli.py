"""Command-line interface for foldbook."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .render import REPO_ROOT, render_html
from .schema import CELL_NAMES, ContentValidationError, validate_content

DEMO_CONTENT_PATH = REPO_ROOT / "examples" / "demo-content.json"


def _load_content_file(path: Path) -> dict[str, str]:
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"Error: file not found: {path}", file=sys.stderr)
        raise SystemExit(1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"Error: {path} is not valid JSON: {exc}", file=sys.stderr)
        raise SystemExit(1)

    try:
        return validate_content(data)
    except ContentValidationError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)


def cmd_render(args: argparse.Namespace) -> None:
    content_path = Path(args.content)
    content = _load_content_file(content_path)

    output_path = Path(args.output) if args.output else content_path.with_suffix(".html")
    html = render_html(content, title=args.title)
    output_path.write_text(html, encoding="utf-8")
    print(f"Wrote {output_path}")


def cmd_demo(args: argparse.Namespace) -> None:
    content = _load_content_file(DEMO_CONTENT_PATH)
    output_path = Path(args.output) if args.output else Path("demo.html")
    html = render_html(content, title="Foldbook Demo")
    output_path.write_text(html, encoding="utf-8")
    print(f"Wrote {output_path}")


def cmd_init(args: argparse.Namespace) -> None:
    output_path = Path(args.output) if args.output else Path("content.json")
    if output_path.exists() and not args.force:
        print(f"Error: {output_path} already exists (use --force to overwrite)", file=sys.stderr)
        raise SystemExit(1)

    blank = {name: "" for name in CELL_NAMES}
    output_path.write_text(json.dumps(blank, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="foldbook",
        description="Turn a JSON file into a printable 8-panel A4 foldbook.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_render = subparsers.add_parser("render", help="Render a content JSON file to HTML")
    p_render.add_argument("content", help="Path to a content JSON file")
    p_render.add_argument("-o", "--output", help="Output HTML path (default: <content>.html)")
    p_render.add_argument("--title", default="Foldbook", help="HTML document title")
    p_render.set_defaults(func=cmd_render)

    p_demo = subparsers.add_parser("demo", help="Render the built-in Lorem Ipsum demo")
    p_demo.add_argument("-o", "--output", help="Output HTML path (default: demo.html)")
    p_demo.set_defaults(func=cmd_demo)

    p_init = subparsers.add_parser("init", help="Write a blank content JSON template")
    p_init.add_argument("-o", "--output", help="Output JSON path (default: content.json)")
    p_init.add_argument("--force", action="store_true", help="Overwrite an existing file")
    p_init.set_defaults(func=cmd_init)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
