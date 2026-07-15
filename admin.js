import {
  auth
} from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const loginButton =
  document.getElementById("loginButton");

const logoutButton =
  document.getElementById("logoutButton");

const loginStatus =
  document.getElementById("loginStatus");

const userInformation =
  document.getElementById("userInformation");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const userUid =
  document.getElementById("userUid");


const googleProvider =
  new GoogleAuthProvider();


// 毎回Googleアカウント選択画面を表示
googleProvider.setCustomParameters({
  prompt: "select_account"
});


// ログイン
async function loginWithGoogle() {

  loginButton.disabled = true;

  loginButton.textContent =
    "ログイン処理中...";

  loginStatus.className =
    "login-status";

  loginStatus.textContent =
    "";


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


    loginStatus.className =
      "login-status error-message";


    switch (error.code) {

      case "auth/popup-closed-by-user":

        loginStatus.textContent =
          "ログイン画面が閉じられました。";

        break;


      case "auth/popup-blocked":

        loginStatus.textContent =
          "ポップアップがブロックされました。Safariの設定を確認してください。";

        break;


      case "auth/unauthorized-domain":

        loginStatus.textContent =
          "このドメインはFirebaseで許可されていません。Authorized domainsを確認してください。";

        break;


      default:

        loginStatus.textContent =
          `ログインに失敗しました：${error.message}`;

    }


    loginButton.disabled = false;

    loginButton.textContent =
      "Googleアカウントでログイン";

  }

}


// ログアウト
async function logout() {

  logoutButton.disabled = true;

  logoutButton.textContent =
    "ログアウト中...";


  try {

    await signOut(auth);


  } catch (error) {

    console.error(
      "ログアウトエラー:",
      error
    );


    loginStatus.className =
      "login-status error-message";

    loginStatus.textContent =
      "ログアウトに失敗しました。";


    logoutButton.disabled = false;

    logoutButton.textContent =
      "ログアウト";

  }

}


// ログイン状態を監視
onAuthStateChanged(
  auth,
  (user) => {

    if (user) {

      loginButton.hidden =
        true;


      loginStatus.className =
        "login-status success-message";

      loginStatus.textContent =
        "Googleアカウントでログインしました。";


      userName.textContent =
        user.displayName || "名前未設定";

      userEmail.textContent =
        user.email || "メール未設定";

      userUid.textContent =
        user.uid;


      userInformation.hidden =
        false;


      logoutButton.disabled =
        false;

      logoutButton.textContent =
        "ログアウト";


    } else {

      loginButton.hidden =
        false;

      loginButton.disabled =
        false;

      loginButton.textContent =
        "Googleアカウントでログイン";


      loginStatus.className =
        "login-status";

      loginStatus.textContent =
        "ログインしていません。";


      userInformation.hidden =
        true;

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
