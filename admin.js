from pathlib import Path

code = r'''import {

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

let authCheckStarted = false;

// 状態メッセージを表示

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

// ログイン前画面へ戻す

function showLoggedOutScreen(

  message =

    "管理者用Googleアカウントでログインしてください。"

) {

  dashboard.hidden =

    true;

  loginSection.hidden =

    false;

  loginButton.disabled =

    false;

  logoutButton.disabled =

    false;

  totalReportCount.textContent =

    "-";

  featuredReportCount.textContent =

    "-";

  userName.textContent =

    "";

  userEmail.textContent =

    "";

  showStatus(

    message

  );

}

// 管理者ダッシュボードを表示

function showDashboard(user) {

  loginSection.hidden =

    true;

  dashboard.hidden =

    false;

  userName.textContent =

    user.displayName ||

    "名前未設定";

  userEmail.textContent =

    user.email ||

    "メールアドレス未設定";

}

// Firestoreのadmins/{uid}で管理者権限を確認

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

    snapshot.forEach((reportDocument) => {

      const report =

        reportDocument.data();

      if (report.featured === true) {

        featuredCount += 1;

      }

    });

    totalReportCount.textContent =

      `${snapshot.size}件`;

    featuredReportCount.textContent =

      `${featuredCount}件`;

  } catch (error) {

    console.error(

      "管理画面集計読み込みエラー:",

      error

    );

    totalReportCount.textContent =

      "取得失敗";

    featuredReportCount.textContent =

      "取得失敗";

    showStatus(

      "ログインできましたが、投稿件数の取得に失敗しました。",

      "error-message"

    );

  }

}

// ログイン処理

async function login() {

  loginButton.disabled =

    true;

  showStatus(

    "Googleログイン画面を開いています..."

  );

  try {

    await signInWithPopup(

      auth,

      provider

    );

  } catch (error) {

    console.error(

      "Googleログインエラー:",

      error

    );

    const redirectErrorCodes = [

      "auth/popup-blocked",

      "auth/cancelled-popup-request",

      "auth/operation-not-supported-in-this-environment"

    ];

    if (

      redirectErrorCodes.includes(

        error.code

      )

    ) {

      showStatus(

        "ログイン画面へ移動します..."

      );

      await signInWithRedirect(

        auth,

        provider

      );

      return;

    }

    loginButton.disabled =

      false;

    if (

      error.code ===

      "auth/popup-closed-by-user"

    ) {

      showStatus(

        "ログインはキャンセルされました。"

      );

      return;

    }

    showStatus(

      "Googleログインに失敗しました。もう一度お試しください。",

      "error-message"

    );

  }

}

// ログアウト処理

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

// ログイン状態を処理

async function handleAuthState(user) {

  if (authCheckStarted) {

    return;

  }

  authCheckStarted =

    true;

  dashboard.hidden =

    true;

  loginButton.disabled =

    true;

  showStatus(

    "管理者権限を確認しています..."

  );

  try {

    if (!user) {

      showLoggedOutScreen();

      return;

    }

    const isAdmin =

      await checkAdmin(user);

    if (!isAdmin) {

      await signOut(auth);

      showLoggedOutScreen(

        "このGoogleアカウントには管理者権限がありません。"

      );

      loginStatus.classList.add(

        "error-message"

      );

      return;

    }

    showDashboard(user);

    showStatus(

      "管理者としてログインしています。",

      "success-message"

    );

    await loadSummary();

  } catch (error) {

    console.error(

      "管理者権限確認エラー:",

      error

    );

    dashboard.hidden =

      true;

    loginSection.hidden =

      false;

    loginButton.disabled =

      false;

    showStatus(

      "管理者権限の確認に失敗しました。Firestoreのadmins設定と通信状態を確認してください。",

      "error-message"

    );

  } finally {

    authCheckStarted =

      false;

  }

}

// リダイレクトログインの結果を確認

async function checkRedirectLoginResult() {

  try {

    await getRedirectResult(auth);

  } catch (error) {

    console.error(

      "リダイレクトログインエラー:",

      error

    );

    loginButton.disabled =

      false;

    showStatus(

      "Googleログインに失敗しました。もう一度お試しください。",

      "error-message"

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

onAuthStateChanged(

  auth,

  handleAuthState

);

checkRedirectLoginResult();

'''

path = Path("/mnt/data/admin.js")

path.write_text(code, encoding="utf-8")

print(f"Created {path} ({len(code.splitlines())} lines)")
