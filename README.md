# notion-tabs

Ubuntu 사용자를 위한 Notion 데스크톱 기초 세팅입니다.
Notion은 리눅스용 공식 앱이 없어서, notion.so를 Electron으로 띄우는 비공식 래퍼에
우분투(GNOME)에서 바로 쓸 수 있는 설정을 더했습니다.

> 비공식 프로젝트입니다. Notion Labs와 관계없으며, "Notion" 이름과 로고는 Notion Labs의 상표입니다.
> [notion-snap-reborn](https://github.com/Pietrucci-Blacher/notion-snap-reborn) (Sunshio, ISC)을 바탕으로 합니다.

## 무엇이 해결되나

| 문제 (우분투) | 해결 |
| --- | --- |
| snap 버전에서 한글 입력이 안 됨 | snap 밖에서 실행하고 시스템 ibus를 사용 (`GTK_IM_MODULE=ibus`) |
| 휠 클릭한 Notion 링크가 크롬으로 열림 | Notion 링크는 앱 안에서 열기 |
| 창을 여러 개 띄워 관리하기 불편 | 크롬 같은 탭 (순서 변경, 창으로 분리, 다른 창으로 이동, 파비콘) |
| Wayland에서 창 버튼이 왼쪽에 그려짐 | X11 모드로 실행해 GNOME이 창 테두리를 그림 |
| conda 등이 `GSETTINGS_SCHEMA_DIR`를 바꿔 GNOME 설정을 못 읽음 | 런처에서 해당 변수 제거 |

## 테스트 환경

- Ubuntu 26.04, GNOME (Wayland 세션, X11 모드로 실행)
- 입력기: ibus + ibus-hangul
- Electron 44

fcitx5, kime 등 다른 입력기를 쓰면 `notion.desktop`의 `GTK_IM_MODULE`, `XMODIFIERS`를 바꾸세요.

## 설치

Node.js와 npm이 필요합니다.

```sh
./install.sh
```

앱 메뉴에 "Notion"이 생깁니다. 로그인 정보는 `~/.config/notion-snap-reborn`에 저장됩니다
(snap 버전에서 옮겨오려면 `~/snap/notion-snap-reborn/current/.config/notion-snap-reborn`을 복사).

## 업데이트

Notion 자체는 웹이라 항상 최신입니다. 크롬 엔진(Electron)만 가끔 올려 주면 됩니다.

```sh
npm install --save-dev electron@latest && ./install.sh
```

## 단축키

| 키 | 동작 |
| --- | --- |
| 휠 클릭 (링크) | 백그라운드 탭으로 열기 |
| 휠 클릭 (탭) | 탭 닫기 |
| Ctrl+T / Ctrl+W | 새 탭 / 탭 닫기 |
| Ctrl+Tab, Ctrl+PageDown | 다음 탭 |
| Ctrl+Shift+Tab, Ctrl+PageUp | 이전 탭 |
| Ctrl+N | 새 창 |
| 탭을 창 밖으로 드래그 | 새 창으로 분리 |
