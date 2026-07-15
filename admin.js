import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
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


const provider =
  new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account"
});


function showStatus(
  message,
  type = ""
) {
  loginStatus.textContent =
    message;

  loginStatus.className =
    "login-status";

  if (type) {
    loginStatus.classList.add(type);
  }
}


function showLoginScreen(
  message =
    "管理者用Googleアカウントでログインしてください。",
  isError = false
) {
  loginSection.hidden =
    false;

  dashboard.hidden =
    true;

  loginButton.disabled =
    false;

  logoutButton.disabled =
    false;

  userName.textContent =
    "";

  userEmail.textContent =
    "";

  totalReportCount.textContent =
    "-";

  featuredReportCount.textContent =
    "-";

  showStatus(
    message,
    isError
      ? "error-message"
      : ""
  );
}


function showDashboard(user) {
  loginSection.hidden =
    true;

  dashboard.hidden =
    false;

  logoutButton.disabled =
    false;

  userName.textContent =
    user.displayName ||
    "名前未設定";

  userEmail.textContent =
    user.email ||
    "メールアドレス未設定";
}


async function checkAdmin(user) {
  if (!user) {
    return false;
  }

  const adminDocument =
    await getDoc(
      doc(
        db,
        "admins",
        user.uid
      )
    );

  return adminDocument.exists();
}


async function loadSummary() {
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

    let featuredCount = 0;

    snapshot.forEach(
      reportDocument => {
        const report =
          reportDocument.data();

        if (
          report.featured === true
        ) {
          featuredCount += 1;
        }
      }
    );

    totalReportCount.textContent =
      `${snapshot.size}件`;

    featuredReportCount.textContent =
      `${featuredCount}件`;

  } catch (error) {
    console.error(
      "投稿件数取得エラー:",
      error
    );

    totalReportCount.textContent =
      "取得失敗";

    featuredReportCount.textContent =
      "取得失敗";
  }
}


async function login() {
  loginButton.disabled =
    true;

  showStatus(
    "Googleログイン画面へ移動します..."
  );

  try {
    await signInWithRedirect(
      auth,
      provider
    );

  } catch (error) {
    console.error(
      "Googleログイン開始エラー:",
      error
    );

    loginButton.disabled =
      false;

    let message =
      "Googleログインを開始できませんでした。";

    if (
      error.code ===
      "auth/operation-not-allowed"
    ) {
      message =
        "FirebaseでGoogleログインが有効になっていません。";
    }

    if (
      error.code ===
      "auth/unauthorized-domain"
    ) {
      message =
        "このWebサイトのドメインがFirebaseで許可されていません。";
    }

    if (
      error.code ===
      "auth/network-request-failed"
    ) {
      message =
        "通信に失敗しました。インターネット接続を確認してください。";
    }

    showStatus(
      message,
      "error-message"
    );
  }
}


async function logout() {
  logoutButton.disabled =
    true;

  try {
    await signOut(auth);

  } catch (error) {
    console.error(
      "ログアウトエラー:",
      error
    );

    logoutButton.disabled =
      false;

    showStatus(
      "ログアウトに失敗しました。",
      "error-message"
    );
  }
}


async function processLoginState(user) {
  if (!user) {
    showLoginScreen();
    return;
  }

  loginButton.disabled =
    true;

  showStatus(
    "管理者権限を確認しています..."
  );

  try {
    const isAdmin =
      await checkAdmin(user);

    if (!isAdmin) {
      await signOut(auth);

      showLoginScreen(
        "このGoogleアカウントには管理者権限がありません。",
        true
      );

      return;
    }

    showDashboard(user);

    await loadSummary();

  } catch (error) {
    console.error(
      "管理者確認エラー:",
      error
    );

    showLoginScreen(
      "管理者権限を確認できませんでした。Firestoreのadmins設定を確認してください。",
      true
    );
  }
}


loginButton.addEventListener(
  "click",
  login
);


logoutButton.addEventListener(
  "click",
  logout
);


getRedirectResult(auth)
  .catch(error => {
    console.error(
      "リダイレクトログインエラー:",
      error
    );

    let message =
      "Googleログインに失敗しました。";

    if (
      error.code ===
      "auth/unauthorized-domain"
    ) {
      message =
        "このWebサイトのドメインがFirebaseで許可されていません。";
    }

    if (
      error.code ===
      "auth/operation-not-allowed"
    ) {
      message =
        "FirebaseでGoogleログインが有効になっていません。";
    }

    showLoginScreen(
      message,
      true
    );
  });


onAuthStateChanged(
  auth,
  processLoginState
);
