import sys
from pathlib import Path
dist = Path(sys.argv[1])
n = 0
for f in dist.rglob("*.wxss"):
    src = f.read_text()
    if "[class]" not in src:
        continue
    f.write_text(src.replace("[class]", ""))
    n += 1
print("stripped [class] from", n, "wxss files")

# Skyline native <button> defaults to a dark fill. Force the light theme.
reset = """
button {
  background-color: #FFFFFF;
  color: #1A1A1A;
  border-radius: 8px;
  padding: 0;
  margin: 0;
  line-height: 1.2;
}
button::after {
  border: none;
}
"""
app = dist / "app.wxss"
body = app.read_text() if app.exists() else ""
if "button::after" not in body:
    app.write_text(body + "\n" + reset)
    print("appended button reset")
