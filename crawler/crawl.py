"""
쿠키런 위키 API에서 쿠키 이미지를 크롤링하는 스크립트

사용법:
    pip install -r requirements.txt
    python crawl.py

입력:  프로젝트 루트의 cookies_input.csv (쿠키 등급,쿠키 이름,프로젝트)
출력:  ../images/cookies/{쿠키이름}.{ext}
       ../data/cookies.json

중복 처리:
    같은 이름 쿠키가 여러 프로젝트에 있으면 우선순위 높은 쪽으로 분류
    클래식 > 킹덤 > 오븐브레이크
"""

import requests
import csv
import json
import os
import time
import unicodedata

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT_CSV = os.path.join(ROOT_DIR, "cookies_input.csv")
OUTPUT_DIR = os.path.join(ROOT_DIR, "images", "cookies")
JSON_PATH = os.path.join(ROOT_DIR, "data", "cookies.json")
ALIASES_PATH = os.path.join(ROOT_DIR, "data", "aliases.json")

COL_NAME = "쿠키 이름"
COL_PROJECT = "프로젝트"

PROJECT_PRIORITY = {
    "쿠키런 클래식": 0,
    "쿠키런 킹덤": 1,
    "쿠키런 오븐브레이크": 2,
    "모험의 탑": 3,
}

# 이미지 탐색 순서: 킹덤 위키 먼저, 오븐브레이크 위키 fallback
WIKI_APIS = [
    "https://cookierunkingdom.fandom.com/api.php",
    "https://cookierunovenbreak.fandom.com/api.php",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CookieQuizBot/1.0)"}


def deduplicate(cookies):
    merged = {}
    for row in cookies:
        name = row[COL_NAME].strip()
        project = row[COL_PROJECT].strip()

        if project not in PROJECT_PRIORITY:
            print(f"[경고] 알 수 없는 프로젝트: '{project}' ({name}) - 건너뜀")
            continue

        if name not in merged:
            merged[name] = {"project": project}
        else:
            if PROJECT_PRIORITY[project] < PROJECT_PRIORITY[merged[name]["project"]]:
                merged[name] = {"project": project}

    return merged


def search_and_get_image(cookie_name, session):
    """위키 API에서 쿠키 이름으로 검색 후 이미지 URL 반환"""
    for api in WIKI_APIS:
        # 1단계: 검색으로 영문 페이지 제목 찾기
        r = session.get(api, params={
            "action": "query",
            "list": "search",
            "srsearch": cookie_name,
            "format": "json",
            "srlimit": 1,
        }, timeout=10)

        if r.status_code != 200:
            continue

        results = r.json().get("query", {}).get("search", [])
        if not results:
            continue

        page_title = results[0]["title"]

        # 2단계: 해당 페이지의 이미지 URL 조회
        r2 = session.get(api, params={
            "action": "query",
            "titles": page_title,
            "prop": "pageimages",
            "format": "json",
            "pithumbsize": 500,
            "piprop": "original",
        }, timeout=10)

        if r2.status_code != 200:
            continue

        pages = r2.json().get("query", {}).get("pages", {})
        for pid, page in pages.items():
            img_url = page.get("original", {}).get("source", "")
            if img_url:
                return img_url, page_title

    return None, None


def download_image(url, save_path, session):
    try:
        resp = session.get(url, timeout=20, stream=True)
        resp.raise_for_status()
        if "image" not in resp.headers.get("content-type", ""):
            return False
        with open(save_path, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"    다운로드 오류: {e}")
        return False


def get_extension(url):
    path = url.split("?")[0].split("/")[-1].lower()
    for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
        if path.endswith(ext):
            return ext
    return ".png"


def safe_filename(name):
    for ch in r'\/:*?"<>|':
        name = name.replace(ch, "_")
    return name


def main():
    if not os.path.exists(INPUT_CSV):
        print(f"[오류] {INPUT_CSV} 파일이 없습니다.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(INPUT_CSV, encoding="utf-8-sig") as f:
        raw_cookies = list(csv.DictReader(f))

    print(f"CSV 총 행 수: {len(raw_cookies)}개")

    cookie_map = deduplicate(raw_cookies)
    print(f"중복 제거 후: {len(cookie_map)}개 (제거: {len(raw_cookies) - len(cookie_map)}개)\n")

    session = requests.Session()
    session.headers.update(HEADERS)

    results = []
    failed = []

    for i, (name, info) in enumerate(cookie_map.items(), 1):
        project = info["project"]
        filename = safe_filename(name)

        print(f"[{i:3d}/{len(cookie_map)}] {name} ({project})")

        # 이미 다운로드된 경우 스킵 (macOS NFD 정규화 대응)
        existing = [f for f in os.listdir(OUTPUT_DIR) if unicodedata.normalize('NFC', os.path.splitext(f)[0]) == filename]
        if existing:
            ext = os.path.splitext(existing[0])[1]
            print(f"    이미 존재: {existing[0]} (스킵)")
            results.append({"id": i, "name": name, "image": f"images/cookies/{filename}{ext}", "project": project})
            continue

        # 이미지 URL 탐색
        img_url, page_title = search_and_get_image(name, session)

        if not img_url:
            print(f"    이미지 없음")
            failed.append(name)
            continue

        ext = get_extension(img_url)
        save_path = os.path.join(OUTPUT_DIR, f"{filename}{ext}")

        if download_image(img_url, save_path, session):
            print(f"    저장 완료: {filename}{ext}  (위키: {page_title})")
            results.append({"id": i, "name": name, "image": f"images/cookies/{filename}{ext}", "project": project})
        else:
            print(f"    다운로드 실패")
            failed.append(name)

        time.sleep(0.3)

    # aliases.json 적용
    aliases = {}
    if os.path.exists(ALIASES_PATH):
        with open(ALIASES_PATH, encoding="utf-8") as f:
            aliases = json.load(f)
    for entry in results:
        if entry["name"] in aliases:
            entry["aliases"] = aliases[entry["name"]]

    # 이미지 파일명 숫자 ID로 리네이밍
    for entry in results:
        old_path = entry["image"]
        ext = os.path.splitext(old_path)[1]
        new_filename = f"{entry['id']}{ext}"
        new_path = f"images/cookies/{new_filename}"
        if os.path.exists(old_path) and old_path != new_path:
            os.rename(old_path, new_path)
        entry["image"] = new_path

    # cookies.json 저장
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({"cookies": results}, f, ensure_ascii=False, indent=2)

    print(f"\n=== 완료 ===")
    print(f"성공: {len(results)}개  |  실패: {len(failed)}개")
    print(f"cookies.json → {JSON_PATH}")
    if failed:
        print(f"\n[실패 목록]")
        for n in failed:
            print(f"  - {n}")


if __name__ == "__main__":
    main()
