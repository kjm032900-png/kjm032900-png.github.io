# 맞춤 차량 안내 공유 · CRM 연동 규격

기준: 2026-11-20 · 현재 홈페이지 저장소 `kjm032900-png/kjm032900-png.github.io`

## 고객에게 전달할 주소

`https://kjm032900-png.github.io/share.html?ids=차량ID1,차량ID2`

실제 예시: `https://kjm032900-png.github.io/share.html?ids=e-class-27my-e-200-exclusive,gle-26my-gle-450-4matic-amg-line`

`ids`는 `vehicle-ids.json`에 등록된 **트림 단위 ID**의 쉼표 구분 목록입니다. 순서대로 표시되고 중복 ID는 한 번만 표시됩니다. 링크에 고객 이름, 연락처, CRM 고객번호, 상담 메모 등을 붙이지 않습니다.

```js
const base = "https://kjm032900-png.github.io/share.html";
function buildVehicleShareUrl(ids) {
  const url = new URL(base);
  url.searchParams.set("ids", ids.join(","));
  return url.toString();
}
// 예: buildVehicleShareUrl(["e-class-27my-e-200-exclusive"])
```

## CRM 연동 원칙

- 홈페이지와 CRM은 독립적으로 운영합니다. CRM은 URL만 생성하고 별도 서버나 고객 DB에 공유하지 않습니다.
- ID는 현재 가격순/배열순이 아닌 안정된 문자열입니다. 기존 ID는 재사용하거나 이름 변경에 따라 자동으로 바꾸지 마세요.
- 가격과 모델 설명은 `content.json`을 공유 화면에서 읽습니다. 프로모션 및 가격 정보는 원래 홈페이지 파일을 그대로 유지합니다.
- 공식 PDF 및 미지정 모델의 카탈로그 목록 대체 링크는 `catalog-links.json`에서 관리합니다. 개별 PDF가 없을 때 다른 모델 PDF를 임의로 연결하지 않습니다.
- 새 차량이 추가되면 `content.json` 모델과 `vehicle-ids.json`에 등록한 뒤 CRM에도 새 ID를 전달하세요.
- 알 수 없는 차량 ID는 임의 다른 차종으로 치환하지 않고 안내 메시지를 표시합니다.
- 주소를 받은 고객은 누구나 열 수 있는 공개 페이지입니다. 개인정보나 비공개 견적은 넣지 마세요.

## 차량별 고유 ID 전체 목록 (현재 91개)

| ID | 모델군 | 연식 | 트림 |
|---|---|---|---|
| `a-class-26my-a-220` | A-Class | 26MY | A 220 |
| `c-class-26my-c-200-avantgarde` | C-Class | 26MY | C 200 AVANTGARDE |
| `c-class-26my-c-200-special-edition` | C-Class | 26MY | C 200 Special Edition |
| `c-class-26my-c-200-amg-line` | C-Class | 26MY | C 200 AMG Line |
| `cla-27my-cla-220` | CLA | 27MY | CLA 220 |
| `cla-27my-cla-220-amg-line` | CLA | 27MY | CLA 220 AMG Line |
| `e-class-27my-e-200-exclusive` | E-Class | 27MY | E 200 EXCLUSIVE |
| `e-class-27my-e-200-amg-line` | E-Class | 27MY | E 200 AMG Line |
| `e-class-27my-e-300-4matic-exclusive` | E-Class | 27MY | E 300 4MATIC EXCLUSIVE |
| `e-class-27my-e-300-4matic-amg-line` | E-Class | 27MY | E 300 4MATIC AMG Line |
| `e-class-27my-e-450-4matic-amg-line` | E-Class | 27MY | E 450 4MATIC AMG Line |
| `e-class-27my-e-450-4matic-exclusive` | E-Class | 27MY | E 450 4MATIC EXCLUSIVE |
| `e-class-26my-e-220-d-4matic-exclusive` | E-Class | 26MY | E 220 d 4MATIC EXCLUSIVE |
| `e-class-26my-e-350-e-4matic-exclusive` | E-Class | 26MY | E 350 e 4MATIC EXCLUSIVE |
| `s-class-27my-s-350-d-4matic` | S-Class | 27MY | S 350 d 4MATIC |
| `s-class-27my-s-450-4matic` | S-Class | 27MY | S 450 4MATIC |
| `s-class-27my-s-450-4matic-long-exclusive` | S-Class | 27MY | S 450 4MATIC Long Exclusive |
| `s-class-27my-s-450-4matic-long-amg-line` | S-Class | 27MY | S 450 4MATIC Long AMG Line |
| `s-class-27my-s-500-4matic-long` | S-Class | 27MY | S 500 4MATIC Long |
| `s-class-27my-s-580-4matic-long` | S-Class | 27MY | S 580 4MATIC Long |
| `gla-27my-gla-250-4matic-amg-line` | GLA | 27MY | GLA 250 4MATIC AMG Line |
| `glb-26my-glb-250-4matic` | GLB | 26MY | GLB 250 4MATIC |
| `glc-27my-glc-300-4matic` | GLC | 27MY | GLC 300 4MATIC |
| `glc-27my-glc-220-d-4matic` | GLC | 27MY | GLC 220 d 4MATIC |
| `glc-27my-glc-300-4matic-avantgarde` | GLC | 27MY | GLC 300 4MATIC AVANTGARDE |
| `glc-27my-glc-300-4matic-amg-line` | GLC | 27MY | GLC 300 4MATIC AMG Line |
| `glc-coupe-27my-glc-300-4matic-coupe-avantgarde` | GLC Coupé | 27MY | GLC 300 4MATIC Coupé AVANTGARDE |
| `glc-coupe-27my-glc-300-4matic-coupe-amg-line` | GLC Coupé | 27MY | GLC 300 4MATIC Coupé AMG Line |
| `gle-26my-gle-350-4matic` | GLE | 26MY | GLE 350 4MATIC |
| `gle-26my-gle-300-d-4matic` | GLE | 26MY | GLE 300 d 4MATIC |
| `gle-26my-gle-450-4matic` | GLE | 26MY | GLE 450 4MATIC |
| `gle-26my-gle-450-4matic-amg-line` | GLE | 26MY | GLE 450 4MATIC AMG Line |
| `gle-coupe-26my-gle-450-d-4matic-coupe-amg-line` | GLE Coupé | 26MY | GLE 450 d 4MATIC Coupé AMG Line |
| `gle-coupe-26my-gle-450-4matic-coupe-amg-line` | GLE Coupé | 26MY | GLE 450 4MATIC Coupé AMG Line |
| `gls-26my-gls-450-4matic-amg-line-premium` | GLS | 26MY | GLS 450 4MATIC AMG Line Premium |
| `gls-26my-gls-580-4matic-amg-line` | GLS | 26MY | GLS 580 4MATIC AMG Line |
| `g-class-27my-g-450-d` | G-Class | 27MY | G 450 d |
| `g-class-27my-g-450-d-manufaktur` | G-Class | 27MY | G 450 d MANUFAKTUR |
| `cla-electric-27my-cla-200-electric-essential` | CLA Electric | 27MY | CLA 200 Electric Essential |
| `cla-electric-27my-cla-200-electric-advanced` | CLA Electric | 27MY | CLA 200 Electric Advanced |
| `cla-electric-27my-cla-200-electric-amg-line` | CLA Electric | 27MY | CLA 200 Electric AMG Line |
| `cla-electric-27my-cla-250-plus-electric` | CLA Electric | 27MY | CLA 250+ Electric |
| `cla-electric-27my-cla-250-plus-electric-amg-line` | CLA Electric | 27MY | CLA 250+ Electric AMG Line |
| `eqa-27my-eqa-250-progressive` | EQA | 27MY | EQA 250 Progressive |
| `eqa-27my-eqa-250-amg-line` | EQA | 27MY | EQA 250 AMG Line |
| `eqb-26my-eqb-300-4matic-progressive` | EQB | 26MY | EQB 300 4MATIC Progressive |
| `eqb-26my-eqb-300-4matic-amg-line` | EQB | 26MY | EQB 300 4MATIC AMG Line |
| `eqe-26my-eqe-350` | EQE | 26MY | EQE 350 |
| `eqe-suv-26my-eqe-350-suv` | EQE SUV | 26MY | EQE 350 SUV |
| `eqe-suv-26my-eqe-500-4matic-suv` | EQE SUV | 26MY | EQE 500 4MATIC SUV |
| `eqs-suv-26my-eqs-450-4matic-suv` | EQS SUV | 26MY | EQS 450 4MATIC SUV |
| `eqs-suv-26my-eqs-580-4matic-suv` | EQS SUV | 26MY | EQS 580 4MATIC SUV |
| `g-580-eq-27my-g-580-with-eq-technology` | G 580 EQ | 27MY | G 580 with EQ Technology |
| `g-580-eq-27my-g-580-with-eq-technology-manufaktur` | G 580 EQ | 27MY | G 580 with EQ Technology MANUFAKTUR |
| `amg-a-class-26my-mercedes-amg-a-45-s-4matic-plus` | AMG A-Class | 26MY | Mercedes-AMG A 45 S 4MATIC+ |
| `amg-a-class-27my-mercedes-amg-a-45-s-4matic-plus` | AMG A-Class | 27MY | Mercedes-AMG A 45 S 4MATIC+ |
| `amg-cla-26my-mercedes-amg-cla-45-s-4matic-plus` | AMG CLA | 26MY | Mercedes-AMG CLA 45 S 4MATIC+ |
| `amg-cla-26my-mercedes-amg-cla-45-s-4matic-plus-final-edition` | AMG CLA | 26MY | Mercedes-AMG CLA 45 S 4MATIC+ Final Edition |
| `amg-e-class-26my-mercedes-amg-e-53-hybrid-4matic-plus` | AMG E-Class | 26MY | Mercedes-AMG E 53 HYBRID 4MATIC+ |
| `amg-s-class-26my-mercedes-amg-s-63-e-performance` | AMG S-Class | 26MY | Mercedes-AMG S 63 E Performance |
| `amg-cle-27my-mercedes-amg-cle-53-4matic-plus-coupe` | AMG CLE | 27MY | Mercedes-AMG CLE 53 4MATIC+ Coupé |
| `amg-cle-27my-mercedes-amg-cle-53-4matic-plus-cabriolet` | AMG CLE | 27MY | Mercedes-AMG CLE 53 4MATIC+ Cabriolet |
| `amg-glb-26my-mercedes-amg-glb-35-4matic` | AMG GLB | 26MY | Mercedes-AMG GLB 35 4MATIC |
| `amg-glc-26my-mercedes-amg-glc-43-4matic` | AMG GLC | 26MY | Mercedes-AMG GLC 43 4MATIC |
| `amg-glc-coupe-26my-mercedes-amg-glc-43-4matic-coupe` | AMG GLC Coupé | 26MY | Mercedes-AMG GLC 43 4MATIC Coupé |
| `amg-gle-26my-mercedes-amg-gle-53-4matic-plus` | AMG GLE | 26MY | Mercedes-AMG GLE 53 4MATIC+ |
| `amg-gle-coupe-26my-mercedes-amg-gle-53-4matic-plus-coupe` | AMG GLE Coupé | 26MY | Mercedes-AMG GLE 53 4MATIC+ Coupé |
| `amg-gls-26my-mercedes-amg-gls-63-4matic-plus` | AMG GLS | 26MY | Mercedes-AMG GLS 63 4MATIC+ |
| `amg-g-63-27my-mercedes-amg-g-63` | AMG G 63 | 27MY | Mercedes-AMG G 63 |
| `amg-g-63-27my-mercedes-amg-g-63-manufaktur` | AMG G 63 | 27MY | Mercedes-AMG G 63 MANUFAKTUR |
| `amg-gt-26my-mercedes-amg-gt-43-4matic-plus-4-door` | AMG GT | 26MY | Mercedes-AMG GT 43 4MATIC+ 4-Door |
| `amg-gt-27my-mercedes-amg-gt-43` | AMG GT | 27MY | Mercedes-AMG GT 43 |
| `amg-gt-27my-mercedes-amg-gt-55-4matic-plus` | AMG GT | 27MY | Mercedes-AMG GT 55 4MATIC+ |
| `amg-gt-26my-mercedes-amg-gt-63-s-e-performance` | AMG GT | 26MY | Mercedes-AMG GT 63 S E Performance |
| `amg-sl-27my-mercedes-amg-sl-43` | AMG SL | 27MY | Mercedes-AMG SL 43 |
| `amg-sl-26my-mercedes-amg-sl-63-4matic-plus` | AMG SL | 26MY | Mercedes-AMG SL 63 4MATIC+ |
| `maybach-s-class-27my-mercedes-maybach-s-580` | Maybach S-Class | 27MY | Mercedes-Maybach S 580 |
| `maybach-s-class-27my-mercedes-maybach-s-580-manufaktur` | Maybach S-Class | 27MY | Mercedes-Maybach S 580 MANUFAKTUR |
| `maybach-s-class-27my-mercedes-maybach-s-680` | Maybach S-Class | 27MY | Mercedes-Maybach S 680 |
| `maybach-gls-26my-mercedes-maybach-gls-600` | Maybach GLS | 26MY | Mercedes-Maybach GLS 600 |
| `maybach-gls-26my-mercedes-maybach-gls-600-manufaktur` | Maybach GLS | 26MY | Mercedes-Maybach GLS 600 MANUFAKTUR |
| `maybach-eqs-suv-26my-mercedes-maybach-eqs-680-suv` | Maybach EQS SUV | 26MY | Mercedes-Maybach EQS 680 SUV |
| `maybach-sl-26my-mercedes-maybach-sl-680` | Maybach SL | 26MY | Mercedes-Maybach SL 680 |
| `v-class-27my-v-300-d-4matic-exclusive` | V-Class | 27MY | V 300 d 4MATIC Exclusive |
| `cle-coupe-27my-cle-200-coupe` | CLE Coupé | 27MY | CLE 200 Coupé |
| `cle-coupe-27my-cle-450-4matic-coupe` | CLE Coupé | 27MY | CLE 450 4MATIC Coupé |
| `cle-cabriolet-27my-cle-200-cabriolet` | CLE Cabriolet | 27MY | CLE 200 Cabriolet |
| `cle-cabriolet-27my-cle-450-4matic-cabriolet` | CLE Cabriolet | 27MY | CLE 450 4MATIC Cabriolet |
| `glb-electric-27my-the-all-new-electric-glb` | GLB Electric | 27MY | The all-new electric GLB |
| `glc-electric-27my-the-all-new-electric-glc` | GLC Electric | 27MY | The all-new electric GLC |
| `eqs-27my-eqs-400-facelift` | EQS | 27MY | EQS 400 Facelift |

## 검증 시나리오

- PC 1440px / 갤럭시 화면에 가까운 390px 및 360px에서 전 차종 카드와 체크박스, 공유 버튼이 겹치지 않는지 확인
- 선택한 2개 트림만 공유 화면에 보이며 공식 가격과 이미지, 공식 PDF/대체 목록, 컬러 안내가 나오는지 확인
- 유효하지 않은 `ids`/누락된 `ids`가 전체 차량 목록을 노출하지 않고 오류 안내만 하는지 확인
- 기존 홈페이지 프로모션, 전 차종 검색/상세모달, 컬러 페이지, 전화/문자 링크 및 데이터 변경 여부 확인

