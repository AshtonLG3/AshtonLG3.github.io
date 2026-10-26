"""Verify actual HTTPS redirects, including nested paths and query strings."""
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    opener = build_opener(NoRedirect())
    for path in ["/", "/gallery/colourful-graduation-cake/?source=https-check&item=2"]:
        expected = "https://bridgeangelscakes.co.za" + path
        for origin in ["http://bridgeangelscakes.co.za", "http://www.bridgeangelscakes.co.za", "https://www.bridgeangelscakes.co.za"]:
            try:
                opener.open(Request(origin + path, headers={"Cache-Control": "no-cache"}), timeout=30)
            except HTTPError as exc:
                assert exc.code == 301, (origin, exc.code)
                assert exc.headers["Location"] == expected, (origin, exc.headers["Location"], expected)
            else:
                raise AssertionError(f"Missing permanent redirect: {origin + path}")
            print("PASS", origin + path, "->", expected)
        with urlopen(expected, timeout=30) as response:
            assert response.status == 200 and response.url == expected, response.url
            print("PASS canonical HTTPS without a redirect loop:", expected)


if __name__ == "__main__":
    main()
