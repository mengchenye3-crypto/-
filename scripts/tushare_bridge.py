import json
import os
import sys


def main() -> int:
    if len(sys.argv) < 4:
        print(
            json.dumps(
                {
                    "error": {
                        "code": "INVALID_ARGUMENT",
                        "message": "Usage: tushare_bridge.py <api_name> <params_json> <fields_json>"
                    }
                }
            ),
            file=sys.stderr,
        )
        return 2

    try:
        import tushare as ts
    except ImportError:
        print(
            json.dumps(
                {
                    "error": {
                        "code": "TUSHARE_LIBRARY_MISSING",
                        "message": "Python package 'tushare' is not installed"
                    }
                }
            ),
            file=sys.stderr,
        )
        return 3

    token = os.environ.get("TUSHARE_TOKEN")
    if not token:
        print(
            json.dumps(
                {
                    "error": {
                        "code": "TUSHARE_TOKEN_MISSING",
                        "message": "TUSHARE_TOKEN is required"
                    }
                }
            ),
            file=sys.stderr,
        )
        return 4

    api_name = sys.argv[1]
    params = json.loads(sys.argv[2])
    fields = json.loads(sys.argv[3])
    http_url = os.environ.get("TUSHARE_HTTP_URL", "http://118.89.66.41:8020/")

    pro = ts.pro_api(token)
    pro._DataApi__http_url = http_url

    try:
      api = getattr(pro, api_name)
    except AttributeError:
        print(
            json.dumps(
                {
                    "error": {
                        "code": "UNKNOWN_TUSHARE_API",
                        "message": f"Unknown Tushare api: {api_name}"
                    }
                }
            ),
            file=sys.stderr,
        )
        return 5

    try:
        dataframe = api(fields=",".join(fields), **params)
        dataframe = dataframe.astype(object).where(dataframe.notna(), None)
        records = dataframe.to_dict(orient="records")
        print(json.dumps({"data": records}, ensure_ascii=False))
        return 0
    except Exception as error:  # pragma: no cover - runtime bridge
        print(
            json.dumps(
                {
                    "error": {
                        "code": "TUSHARE_REQUEST_FAILED",
                        "message": str(error)
                    }
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 6


if __name__ == "__main__":
    raise SystemExit(main())
