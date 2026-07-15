import {
  db
} from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
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

const noticeContent =
  document.getElementById("noticeContent");


// HTMLへ安全に表示
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// Firestore TimestampなどをDateへ変換
function convertToDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate === "function"
  ) {
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


// 日付比較用数値
function getDateNumber(value) {
  const date =
    convertToDate(value);

  return date
    ? date.getTime()
    : 0;
}


// 日時を日本語表示
function formatDateTime(value) {
  const date =
    convertToDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
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


// 本日の投稿件数を表示
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


  if (todayCount) {
    todayCount.textContent =
      `${count}件`;
  }


  if (todayCountMessage) {
    todayCountMessage.textContent =
      count === 0
        ? "本日の投稿はまだありません。"
        : "本日、新しい事例が共有されています。";
  }
}


// 重要事例を表示
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
    if (featuredSection) {
      featuredSection.hidden =
        true;
    }

    return;
  }


  featuredSection.hidden =
    false;


  featuredReports.innerHTML =
    featured

      .map((report) => {
        return `
          <article class="featured-card">

            <a
              class="featured-title"
              href="detail.html?id=${encodeURIComponent(report.id)}"
            >
              📌 ${escapeHtml(
                report.title ||
                "タイトル未設定"
              )}
            </a>

            <div class="featured-info">

              <strong>所属：</strong>

              ${escapeHtml(
                report.department ||
                "未設定"
              )}

              <br>

              <strong>業務区分：</strong>

              ${escapeHtml(
                report.category ||
                "未設定"
              )}

              <br>

              <strong>レベル：</strong>

              ${escapeHtml(
                report.level ||
                "未設定"
              )}

            </div>

          </article>
        `;
      })

      .join("");
}


// 人気事例を表示
function displayPopularReports(reports) {
  const ranking =
    [...reports]

      .filter((report) =>
        Number(
          report.helpful || 0
        ) > 0
      )

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
          getDateNumber(
            second.createdAt
          ) -
          getDateNumber(
            first.createdAt
          )
        );
      })

      .slice(0, 5);


  if (ranking.length === 0) {
    popularReports.className =
      "ranking-message";

    popularReports.textContent =
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


  popularReports.className =
    "";

  popularReports.innerHTML = `
    <ol class="ranking-list">
      ${rankingHtml}
    </ol>
  `;
}


// Firestoreからお知らせを取得
async function loadNotice() {
  if (!noticeContent) {
    return;
  }


  noticeContent.className =
    "notice-loading";

  noticeContent.textContent =
    "お知らせを読み込み中...";


  try {
    const noticeReference =
      doc(
        db,
        "settings",
        "notice"
      );


    const noticeSnapshot =
      await getDoc(
        noticeReference
      );


    if (!noticeSnapshot.exists()) {
      noticeContent.className =
        "";

      noticeContent.innerHTML = `
        <div class="notice-title">
          Fire Nearへようこそ
        </div>

        <p class="notice-body">
          気付いたヒヤリハットは積極的に共有しましょう。
        </p>
      `;

      return;
    }


    const data =
      noticeSnapshot.data();


    const title =
      data.title ||
      "お知らせ";


    const body =
      data.body ||
      "現在、お知らせはありません。";


    const updatedDate =
      formatDateTime(
        data.updatedAt
      );


    const updatedHtml =
      updatedDate
        ? `
          <div class="notice-updated">
            最終更新：${escapeHtml(updatedDate)}
          </div>
        `
        : "";


    noticeContent.className =
      "";

    noticeContent.innerHTML = `
      <div class="notice-title">
        ${escapeHtml(title)}
      </div>

      <p class="notice-body">${escapeHtml(body)}</p>

      ${updatedHtml}
    `;

  } catch (error) {
    console.error(
      "お知らせ読み込みエラー:",
      error
    );


    noticeContent.className =
      "notice-error";

    noticeContent.textContent =
      "お知らせの読み込みに失敗しました。";
  }
}


// 事例データを取得
async function loadReports() {
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


    displayFeaturedReports(
      reports
    );

    displayTodayCount(
      reports
    );

    displayPopularReports(
      reports
    );

  } catch (error) {
    console.error(
      "ホーム画面事例読み込みエラー:",
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


    if (featuredReports) {
      featuredReports.textContent =
        "重要事例の読み込みに失敗しました。";
    }


    if (popularReports) {
      popularReports.textContent =
        "人気事例の読み込みに失敗しました。";
    }
  }
}


// ホーム画面を初期化
async function initializeHome() {
  await Promise.all([
    loadReports(),
    loadNotice()
  ]);
}


initializeHome();
