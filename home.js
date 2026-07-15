import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const todayCount =
  document.getElementById("todayCount");

const todayCountMessage =
  document.getElementById("todayCountMessage");

const popularReports =
  document.getElementById("popularReports");


// HTMLへ安全に表示
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// Firestore TimestampをDateへ変換
function convertToDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const convertedDate =
    new Date(value);

  if (
    Number.isNaN(
      convertedDate.getTime()
    )
  ) {
    return null;
  }

  return convertedDate;
}


// Firestore Timestampを比較用数値へ変換
function getCreatedAtNumber(value) {
  const date =
    convertToDate(value);

  return date
    ? date.getTime()
    : 0;
}


// 順位表示
function getRankingMark(index) {
  switch (index) {
    case 0:
      return "🥇";

    case 1:
      return "🥈";

    case 2:
      return "🥉";

    default:
      return `${index + 1}位`;
  }
}


// 実際の投稿日を基準に本日の件数を表示
function displayTodayCount(reports) {
  const startOfToday =
    new Date();

  startOfToday.setHours(
    0,
    0,
    0,
    0
  );


  const startOfTomorrow =
    new Date(startOfToday);

  startOfTomorrow.setDate(
    startOfTomorrow.getDate() + 1
  );


  const count =
    reports.filter((report) => {
      const createdDate =
        convertToDate(
          report.createdAt
        );

      if (!createdDate) {
        return false;
      }

      return (
        createdDate >= startOfToday &&
        createdDate < startOfTomorrow
      );
    }).length;


  todayCount.textContent =
    `${count}件`;


  if (count === 0) {
    todayCountMessage.textContent =
      "本日の投稿はまだありません。";
  } else {
    todayCountMessage.textContent =
      "本日、新しい事例が共有されています。";
  }
}


// 人気事例を表示
function displayPopularReports(reports) {
  const ranking =
    [...reports]

      .filter((report) => {
        return Number(
          report.helpful || 0
        ) > 0;
      })

      .sort((first, second) => {
        const helpfulDifference =
          Number(
            second.helpful || 0
          ) -
          Number(
            first.helpful || 0
          );

        if (
          helpfulDifference !== 0
        ) {
          return helpfulDifference;
        }

        return (
          getCreatedAtNumber(
            second.createdAt
          ) -
          getCreatedAtNumber(
            first.createdAt
          )
        );
      })

      .slice(0, 5);


  if (ranking.length === 0) {
    popularReports.className =
      "ranking-message";

    popularReports.innerHTML =
      "まだ「参考になった」が送信された事例はありません。";

    return;
  }


  const rankingHtml =
    ranking

      .map((report, index) => {
        const helpful =
          Number(
            report.helpful || 0
          );

        return `
          <li class="ranking-item">

            <div class="ranking-number">
              ${getRankingMark(index)}
            </div>

            <div class="ranking-content">

              <a
                class="ranking-title"
                href="detail.html?id=${encodeURIComponent(report.id)}"
              >
                ${escapeHtml(
                  report.title ||
                  "タイトル未設定"
                )}
              </a>

              <div class="ranking-info">
                ${escapeHtml(
                  report.department ||
                  "所属未設定"
                )}

                ／

                ${escapeHtml(
                  report.category ||
                  "業務区分未設定"
                )}
              </div>

            </div>

            <div class="ranking-helpful">
              👍 ${helpful}
            </div>

          </li>
        `;
      })

      .join("");


  popularReports.className = "";

  popularReports.innerHTML = `
    <ol class="ranking-list">
      ${rankingHtml}
    </ol>
  `;
}


// ホーム画面用データを取得
async function loadHomeData() {
  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "reports"
        )
      );


    const reports =
      snapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );


    displayTodayCount(reports);

    displayPopularReports(reports);

  } catch (error) {
    console.error(
      "ホーム画面読み込みエラー:",
      error
    );


    if (todayCount) {
      todayCount.textContent =
        "取得失敗";
    }


    if (todayCountMessage) {
      todayCountMessage.textContent =
        "ページを再読み込みしてください。";
    }


    if (popularReports) {
      popularReports.className =
        "ranking-message";

      popularReports.innerHTML =
        "人気事例の読み込みに失敗しました。";
    }
  }
}


loadHomeData();
