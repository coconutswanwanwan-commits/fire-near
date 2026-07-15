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


const googleProvider =
  new GoogleAuthProvider();


googleProvider.setCustomParameters({
  prompt: "select_account"
});


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


// 管理画面の件数を読み込む
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
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );

    totalReportCount.textContent =
      `${reports.length}件`;

    const featuredCount =
      reports.filter(
        (report) =>
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
  async (user) => {

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

      await loadDashboardStatistics();

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
