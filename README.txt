경제 뉴스 브리핑 PWA (Vercel 배포용)

구성
- index.html
- api/news.js
- vercel.json
- manifest.webmanifest
- sw.js
- icon.svg

배포 방법
1. 압축을 푼다.
2. GitHub 저장소를 만든다.
3. 파일 전체를 저장소 루트에 업로드한다.
4. Vercel에서 해당 저장소를 Import 한다.
5. 배포된 https 주소를 휴대폰 크롬에서 연다.
6. '홈 화면에 추가' 또는 앱 설치 배너를 사용한다.

특징
- 홈 화면에 설치 가능
- 아이콘/앱 이름 적용
- 기본 정적 파일 오프라인 캐시
- API 응답은 네트워크 우선, 실패 시 캐시 사용


최신화 동작
- 앱에서 '최신 뉴스 불러오기' 버튼을 누르면 그 시점 기준으로 /api/news 를 다시 호출합니다.
- 뉴스 API 응답은 no-store 로 설정되어 최신 재수집이 우선됩니다.
