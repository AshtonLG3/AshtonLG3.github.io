"""Back up server configuration and prepare canonical HTTPS rules over verified FTPS."""
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import ssl
import sys

BEGIN = b"# BEGIN Bridge Angels canonical HTTPS"
END = b"# END Bridge Angels canonical HTTPS"
RULES = rb"""# BEGIN Bridge Angels canonical HTTPS
RewriteEngine On
RewriteCond %{HTTP_HOST} ^(?:www\.)?bridgeangelscakes\.co\.za(?::[0-9]+)?$ [NC]
RewriteCond %{HTTPS} !=on [OR]
RewriteCond %{HTTP_HOST} !^bridgeangelscakes\.co\.za$ [NC]
RewriteRule ^ https://bridgeangelscakes.co.za%{REQUEST_URI} [R=301,L,NE]
# END Bridge Angels canonical HTTPS
"""


def merge_rules(original):
    """Keep all unmanaged bytes, with canonical redirects before other rewrites."""
    if original.count(BEGIN) != original.count(END) or original.count(BEGIN) > 1:
        raise ValueError("Ambiguous managed redirect markers; refusing to alter configuration")
    if BEGIN in original:
        pattern = re.escape(BEGIN) + rb".*?" + re.escape(END) + rb"\r?\n?"
        original = re.sub(pattern, b"", original, count=1, flags=re.S)
    return RULES + original


def main():
    backup = Path(os.environ["RUNNER_TEMP"]) / "bridge-angels-hosting-backup"
    backup.mkdir(parents=True, exist_ok=True)
    # Authenticate only after TLS and hostname/certificate validation succeed.
    with ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45) as ftp:
        ftp.connect(os.environ["FTP_HOST"], int(os.environ.get("FTP_PORT") or 21))
        ftp.auth()
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(os.environ["FTP_REMOTE_DIR"])
        if "--restore" in sys.argv:
            manifest = json.loads((backup / "manifest.json").read_text())
            original = (backup / "htaccess.original").read_bytes()
            if hashlib.sha256(original).hexdigest() != manifest["sha256"]:
                raise RuntimeError("Backup integrity check failed")
            current = io.BytesIO()
            ftp.retrbinary("RETR .htaccess", current.write)
            if current.getvalue() != Path(".htaccess").read_bytes():
                raise RuntimeError("Remote rules changed since deployment; refusing to overwrite them")
            if manifest["existed"]:
                ftp.storbinary("STOR .htaccess", io.BytesIO(original))
            else:
                ftp.delete(".htaccess")
            print("Restored original hosting configuration after failed deployment verification.")
            return
        index = io.BytesIO()
        ftp.retrbinary("RETR index.html", index.write)
        if b'https://bridgeangelscakes.co.za/' not in index.getvalue():
            raise RuntimeError("Remote directory is not the Bridge Angels website")
        names = {name.rsplit("/", 1)[-1] for name in ftp.nlst("-a")}
        original = io.BytesIO()
        existed = ".htaccess" in names
        if existed:
            ftp.retrbinary("RETR .htaccess", original.write)
        raw = original.getvalue()
        (backup / "htaccess.original").write_bytes(raw)
        (backup / "manifest.json").write_text(json.dumps({
            "existed": existed,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "tls": ftp.sock.version(),
            "restore": "Restore htaccess.original as .htaccess via FTPS; if existed is false, remove only the managed redirect block.",
        }, indent=2))
        Path(".htaccess").write_bytes(merge_rules(raw))
        print("FTPS control and data channels protected; certificate validated.")
        print(f"Existing .htaccess backed up ({len(raw)} bytes); unmanaged rules preserved.")


if __name__ == "__main__":
    main()
