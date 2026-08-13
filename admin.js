import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const loginSection =
  document.getElementById("loginSection");

const loginButton =
  document.getElementById("loginButton");

const logoutButton =
  document.getElementById("logoutButton");

const loginStatus =
  document.getElementById("loginStatus");

const dashboard =
  document.getElementById("dashboard");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const totalReportCount =
  document.getElementById("totalReportCount");

const featuredReportCount =
  document.getElementById("featuredReportCount");

const latestFeedbackList =
  document.getElementById("latestFeedbackList");

const feedbackBadge =
  document.getElementById("feedbackBadge");


const googleProvider =
  new GoogleAuthProvider();


googleProvider.setCustomParameters({
  prompt: "select_account"
});


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
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}


// 日時を表示
function formatDateTime(value) {
  const date =
    convertToDate(value);

  if (!date) {
    return "日時未記録";
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


// 新しい順に並べるための数値
function getDateNumber(value) {
  const date =
    convertToDate(value);

  return date
    ? date.getTime()
    : 0;
}


// 状態メッセージ
function showLoginStatus(
  message,
  type = ""
) {
  loginStatus.textContent =
    message;

  loginStatus.className =
    "login-status";

  if (type === "success") {
    loginStatus.classList.add(
      "success-message"
    );
  }

  if (type === "error") {
    loginStatus.classList.add(
      "error-message"
    );
  }
}


// 管理者権限確認
async function checkAdmin(user) {
  if (!user) {
    return false;
  }

  const adminReference =
    doc(
      db,
      "admins",
      user.uid
    );

  const adminSnapshot =
    await getDoc(
      adminReference
    );

  return adminSnapshot.exists();
}


// 投稿件数を読み込む
async function loadDashboardStatistics() {
  totalReportCount.textContent =
    "読込中";

  featuredReportCount.textContent =
    "読込中";

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
        document => ({
          id:
            document.id,

          ...document.data()
        })
      );

    totalReportCount.textContent =
      `${reports.length}件`;

    const featuredCount =
      reports.filter(
        report =>
          report.featured === true
      ).length;

    featuredReportCount.textContent =
      `${featuredCount}件`;

  } catch (error) {
    console.error(
      "管理ダッシュボード集計エラー:",
      error
    );

    totalReportCount.textContent =
      "取得失敗";

    featuredReportCount.textContent =
      "取得失敗";
  }
}


// お問い合わせの状態を判定
function isUnresolvedFeedback(feedback) {
  return (
    !feedback.status ||
    feedback.status === "未対応"
  );
}


// 未対応バッジを表示
function updateFeedbackBadge(
  unresolvedCount
) {
  if (!feedbackBadge) {
    return;
  }

  if (
    unresolvedCount <= 0
  ) {
    feedbackBadge.hidden =
      true;

    feedbackBadge.textContent =
      "0";

    return;
  }

  feedbackBadge.hidden =
    false;

  feedbackBadge.textContent =
    unresolvedCount >= 10
      ? "9+"
      : String(
          unresolvedCount
        );
}


// 最新のお問い合わせ3件を表示
function displayLatestFeedback(
  feedbackItems
) {
  if (!latestFeedbackList) {
    return;
  }

  if (
    feedbackItems.length === 0
  ) {
    latestFeedbackList.innerHTML = `
      <div class="latest-feedback-empty">
        現在、お問い合わせはありません。
      </div>
    `;

    return;
  }


  const latestItems =
    [...feedbackItems]

      .sort(
        (first, second) => {
          return (
            getDateNumber(
              second.createdAt
            ) -
            getDateNumber(
              first.createdAt
            )
          );
        }
      )

      .slice(
        0,
        3
      );


  latestFeedbackList.innerHTML =
    latestItems

      .map(
        feedback => {
          const unresolved =
            isUnresolvedFeedback(
              feedback
            );

          const statusText =
            unresolved
              ? "未対応"
              : "対応済";

          const statusClass =
            unresolved
              ? "feedback-status-unresolved"
              : "feedback-status-resolved";

          const statusIcon =
            unresolved
              ? "🔴"
              : "🟢";

          const title =
            feedback.title ||
            "件名なし";

          const type =
            feedback.type ||
            "種類未設定";

          const page =
            feedback.page ||
            "画面未設定";

          const createdAt =
            formatDateTime(
              feedback.createdAt
            );

          return `
            <a
              href="feedback-admin.html"
              class="latest-feedback-item"
            >

              <div class="latest-feedback-top">

                <div class="latest-feedback-title">
                  ${escapeHtml(title)}
                </div>

                <span
                  class="feedback-status ${statusClass}"
                >
                  ${statusIcon}
                  ${statusText}
                </span>

              </div>

              <div class="latest-feedback-meta">

                ${escapeHtml(type)}

                ／

                ${escapeHtml(page)}

                <br>

                ${escapeHtml(createdAt)}

              </div>

            </a>
          `;
        }
      )

      .join("");
}


// お問い合わせを取得
async function loadFeedbackSummary() {
  if (latestFeedbackList) {
    latestFeedbackList.innerHTML = `
      <div class="latest-feedback-empty">
        読み込み中...
      </div>
    `;
  }

  if (feedbackBadge) {
    feedbackBadge.hidden =
      true;
  }


  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "feedback"
        )
      );


    const feedbackItems =
      snapshot.docs.map(
        document => ({
          id:
            document.id,

          ...document.data()
        })
      );


    const unresolvedCount =
      feedbackItems.filter(
        feedback =>
          isUnresolvedFeedback(
            feedback
          )
      ).length;


    updateFeedbackBadge(
      unresolvedCount
    );


    displayLatestFeedback(
      feedbackItems
    );


  } catch (error) {
    console.error(
      "お問い合わせ取得エラー:",
      error
    );


    if (latestFeedbackList) {
      latestFeedbackList.innerHTML = `
        <div class="latest-feedback-empty">
          お問い合わせ情報の取得に失敗しました。
        </div>
      `;
    }


    if (feedbackBadge) {
      feedbackBadge.hidden =
        true;
    }
  }
}


// Googleログイン
async function loginWithGoogle() {
  loginButton.disabled =
    true;

  loginButton.textContent =
    "ログイン処理中...";

  showLoginStatus(
    "Googleログイン画面を開いています..."
  );

  try {
    await signInWithPopup(
      auth,
      googleProvider
    );

  } catch (error) {
    console.error(
      "Googleログインエラー:",
      error
    );

    switch (error.code) {
      case "auth/popup-closed-by-user":
        showLoginStatus(
          "ログイン画面が閉じられました。",
          "error"
        );
        break;

      case "auth/popup-blocked":
        showLoginStatus(
          "ポップアップがブロックされました。Safariの設定を確認してください。",
          "error"
        );
        break;

      case "auth/unauthorized-domain":
        showLoginStatus(
          "このドメインはFirebaseで許可されていません。",
          "error"
        );
        break;

      default:
        showLoginStatus(
          `ログインに失敗しました：${error.message}`,
          "error"
        );
    }

    loginButton.disabled =
      false;

    loginButton.textContent =
      "Googleアカウントでログイン";
  }
}


// ログアウト
async function logout() {
  logoutButton.disabled =
    true;

  logoutButton.textContent =
    "ログアウト中...";

  try {
    await signOut(auth);

  } catch (error) {
    console.error(
      "ログアウトエラー:",
      error
    );

    window.alert(
      "ログアウトに失敗しました。"
    );

    logoutButton.disabled =
      false;

    logoutButton.textContent =
      "ログアウト";
  }
}


// ログイン状態を監視
onAuthStateChanged(
  auth,
  async user => {

    dashboard.hidden =
      true;

    loginSection.hidden =
      false;

    if (!user) {
      loginButton.hidden =
        false;

      loginButton.disabled =
        false;

      loginButton.textContent =
        "Googleアカウントでログイン";

      showLoginStatus(
        "ログインしていません。"
      );

      return;
    }

    showLoginStatus(
      "管理者権限を確認しています..."
    );

    try {
      const isAdmin =
        await checkAdmin(user);

      if (!isAdmin) {
        showLoginStatus(
          "このGoogleアカウントには管理者権限がありません。",
          "error"
        );

        loginButton.hidden =
          true;

        window.setTimeout(
          async () => {
            await signOut(auth);
          },
          1500
        );

        return;
      }


      userName.textContent =
        user.displayName ||
        "名前未設定";

      userEmail.textContent =
        user.email ||
        "メール未設定";


      loginSection.hidden =
        true;

      dashboard.hidden =
        false;


      logoutButton.disabled =
        false;

      logoutButton.textContent =
        "ログアウト";


      /*
       * 投稿集計とお問い合わせを
       * 同時に読み込む
       */
      await Promise.all([
        loadDashboardStatistics(),
        loadFeedbackSummary()
      ]);


  } catch (error) {
      console.error(
        "管理者確認エラー:",
        error
      );

      showLoginStatus(
        "管理者権限の確認に失敗しました。",
        "error"
      );
    }
  }
);


loginButton.addEventListener(
  "click",
  loginWithGoogle
);


logoutButton.addEventListener(
  "click",
  logout
);
