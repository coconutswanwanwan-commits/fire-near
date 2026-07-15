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

const featuredReports =
  document.getElementById("featuredReports");

const featuredSection =
  document.getElementById("featuredSection");


// HTMLへ安全に表示
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// TimestampをDateへ変換
function convertToDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


// 比較用数値
function getDateNumber(value) {
  const date =
    convertToDate(value);

  return date
    ? date.getTime()
    : 0;
}


// 順位マーク
function getRankingMark(index) {
  if (index === 0) {
    return "🥇";
  }

  if (index === 1) {
    return "🥈";
  }

  if (index === 2) {
    return "🥉";
  }

  return `${index + 1}位`;
}


// 本日の投稿件数
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

      return (
        createdDate &&
        createdDate >= startOfToday &&
        createdDate < startOfTomorrow
      );
    }).length;

  todayCount.textContent =
    `${count}件`;

  todayCountMessage.textContent =
    count === 0
      ? "本日の投稿はまだありません。"
      : "本日、新しい事例が共有されています。";
}


// 重要事例
function displayFeaturedReports(reports) {
  const featured =
    reports
      .filter((report) =>
        report.featured === true
      )
      .sort((first, second) => {
        const firstDate =
          getDateNumber(
            first.featuredAt
          ) ||
          getDateNumber(
            first.createdAt
          );

        const secondDate =
          getDateNumber(
            second.featuredAt
          ) ||
          getDateNumber(
            second.createdAt
          );

        return secondDate - firstDate;
      })
      .slice(0, 5);

  if (featured.length === 0) {
    featuredSection.hidden = true;
    return;
  }

  featuredSection.hidden = false;

  featuredReports.innerHTML =
    featured
      .map((report) => `
        <article class="featured-card">

          <a
            class="featured-title"
            href="detail.html?id=${encodeURIComponent(report.id)}"
          >
            📌 ${escapeHtml(
              report.title || "タイトル未設定"
            )}
          </a>

          <div class="featured-info">

            <strong>所属：</strong>
            ${escapeHtml(
              report.department || "未設定"
            )}

            <br>

            <strong>業務区分：</strong>
            ${escapeHtml(
              report.category || "未設定"
            )}

            <br>

            <strong>レベル：</strong>
            ${escapeHtml(
              report.level || "未設定"
            )}

          </div>

        </article>
      `)
      .join("");
}


// 人気ランキング
function displayPopularReports(reports) {
  const ranking =
    [...reports]
      .filter((report) =>
        Number(report.helpful || 0) > 0
      )
      .sort((first, second) => {
        const difference =
          Number(second.helpful || 0) -
          Number(first.helpful || 0);

        if (difference !== 0) {
          return difference;
        }

        return (
          getDateNumber(second.createdAt) -
          getDateNumber(first.createdAt)
        );
      })
      .slice(0, 5);

  if (ranking.length === 0) {
    popularReports.innerHTML =
      "まだ「参考になった」が送信された事例はありません。";

    return;
  }

  popularReports.className = "";

  popularReports.innerHTML = `
    <ol class="ranking-list">

      ${ranking
        .map((report, index) => `
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
              👍 ${Number(report.helpful || 0)}
            </div>

          </li>
        `)
        .join("")}

    </ol>
  `;
}


// ホームデータ取得
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

    displayFeaturedReports(reports);
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

    featuredReports.textContent =
      "重要事例の読み込みに失敗しました。";

    popularReports.textContent =
      "人気事例の読み込みに失敗しました。";
  }
}


loadHomeData();
