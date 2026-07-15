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


// HTMLに安全に文字を表示する
function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// 今日の日付をYYYY-MM-DDで取得
function getLocalDateString() {

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(today.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(today.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

}


// Firestore Timestampを比較用の数値へ変換
function getCreatedAtNumber(value) {

  if (
    value &&
    typeof value.toMillis === "function"
  ) {

    return value.toMillis();

  }

  return 0;

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


// 本日の投稿件数を表示
function displayTodayCount(reports) {

  const today =
    getLocalDateString();

  const count =
    reports.filter((report) => {

      return report.date === today;

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

        return Number(report.helpful || 0) > 0;

      })

      .sort((first, second) => {

        const helpfulDifference =
          Number(second.helpful || 0) -
          Number(first.helpful || 0);


        if (helpfulDifference !== 0) {

          return helpfulDifference;

        }


        return (
          getCreatedAtNumber(second.createdAt) -
          getCreatedAtNumber(first.createdAt)
        );

      })

      .slice(0, 5);


  if (ranking.length === 0) {

    popularReports.className =
      "ranking-message";

    popularReports.innerHTML = `
      まだ「参考になった」が送信された事例はありません。
    `;

    return;

  }


  const rankingHtml =
    ranking

      .map((report, index) => {

        const helpful =
          Number(report.helpful || 0);


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
                  report.title || "タイトル未設定"
                )}

              </a>


              <div class="ranking-info">

                ${escapeHtml(
                  report.department || "所属未設定"
                )}

                ／

                ${escapeHtml(
                  report.category || "業務区分未設定"
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
        collection(db, "reports")
      );


    const reports =
      snapshot.docs.map((document) => ({

        id: document.id,

        ...document.data()

      }));


    displayTodayCount(reports);

    displayPopularReports(reports);


  } catch (error) {

    console.error(
      "ホーム画面読み込みエラー:",
      error
    );


    todayCount.textContent =
      "取得失敗";


    todayCountMessage.textContent =
      "ページを再読み込みしてください。";


    popularReports.className =
      "ranking-message";


    popularReports.innerHTML = `
      人気事例の読み込みに失敗しました。
    `;

  }

}


loadHomeData();
