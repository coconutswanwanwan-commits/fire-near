import {
  db
} from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const feedbackForm =
  document.getElementById("feedbackForm");

const formArea =
  document.getElementById("formArea");

const completionArea =
  document.getElementById("completionArea");

const statusMessage =
  document.getElementById("statusMessage");

const typeInput =
  document.getElementById("typeInput");

const pageInput =
  document.getElementById("pageInput");

const titleInput =
  document.getElementById("titleInput");

const contentInput =
  document.getElementById("contentInput");

const nameInput =
  document.getElementById("nameInput");

const emailInput =
  document.getElementById("emailInput");

const characterCount =
  document.getElementById("characterCount");

const submitButton =
  document.getElementById("submitButton");


function showStatus(
  message,
  type = ""
) {
  statusMessage.hidden =
    false;

  statusMessage.textContent =
    message;

  statusMessage.className =
    "status-message";

  if (type) {
    statusMessage.classList.add(type);
  }
}


function hideStatus() {
  statusMessage.hidden =
    true;
}


function getDeviceType() {
  const userAgent =
    navigator.userAgent || "";

  if (/iPad/i.test(userAgent)) {
    return "iPad";
  }

  if (/iPhone/i.test(userAgent)) {
    return "iPhone";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (
    /Macintosh/i.test(userAgent) &&
    navigator.maxTouchPoints > 1
  ) {
    return "iPad";
  }

  if (/Windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/Macintosh/i.test(userAgent)) {
    return "Mac";
  }

  return "その他";
}


function getBrowserName() {
  const userAgent =
    navigator.userAgent || "";

  if (
    /CriOS/i.test(userAgent) ||
    /Chrome/i.test(userAgent)
  ) {
    return "Chrome";
  }

  if (
    /FxiOS/i.test(userAgent) ||
    /Firefox/i.test(userAgent)
  ) {
    return "Firefox";
  }

  if (
    /EdgiOS/i.test(userAgent) ||
    /Edg/i.test(userAgent)
  ) {
    return "Edge";
  }

  if (/Safari/i.test(userAgent)) {
    return "Safari";
  }

  return "その他";
}


function getCurrentPageInformation() {
  return {
    pageUrl:
      window.location.href,

    referrer:
      document.referrer || "",

    screenWidth:
      window.screen.width || 0,

    screenHeight:
      window.screen.height || 0,

    viewportWidth:
      window.innerWidth || 0,

    viewportHeight:
      window.innerHeight || 0,

    language:
      navigator.language || "",

    online:
      navigator.onLine,

    userAgent:
      navigator.userAgent || ""
  };
}


function validateEmail() {
  const email =
    emailInput.value.trim();

  if (!email) {
    return true;
  }

  return emailInput.checkValidity();
}


function updateCharacterCount() {
  const count =
    contentInput.value.length;

  characterCount.textContent =
    `${count} / 1500文字`;
}


async function submitFeedback(event) {
  event.preventDefault();

  const type =
    typeInput.value;

  const page =
    pageInput.value;

  const title =
    titleInput.value.trim();

  const content =
    contentInput.value.trim();

  const name =
    nameInput.value.trim();

  const email =
    emailInput.value.trim();


  if (!type) {
    alert(
      "種類を選択してください。"
    );

    typeInput.focus();
    return;
  }


  if (!page) {
    alert(
      "発生した画面を選択してください。"
    );

    pageInput.focus();
    return;
  }


  if (!title) {
    alert(
      "件名を入力してください。"
    );

    titleInput.focus();
    return;
  }


  if (!content) {
    alert(
      "詳しい内容を入力してください。"
    );

    contentInput.focus();
    return;
  }


  if (!validateEmail()) {
    alert(
      "メールアドレスの形式を確認してください。"
    );

    emailInput.focus();
    return;
  }


  submitButton.disabled =
    true;

  showStatus(
    "内容を送信しています..."
  );


  const pageInformation =
    getCurrentPageInformation();


  try {
    await addDoc(
      collection(
        db,
        "feedback"
      ),
      {
        type,
        page,
        title,
        content,
        name,
        email,

        status:
          "未対応",

        device:
          getDeviceType(),

        browser:
          getBrowserName(),

        appVersion:
          "1.3.0",

        pageUrl:
          pageInformation.pageUrl,

        referrer:
          pageInformation.referrer,

        screenWidth:
          pageInformation.screenWidth,

        screenHeight:
          pageInformation.screenHeight,

        viewportWidth:
          pageInformation.viewportWidth,

        viewportHeight:
          pageInformation.viewportHeight,

        language:
          pageInformation.language,

        online:
          pageInformation.online,

        userAgent:
          pageInformation.userAgent,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );


    hideStatus();

    formArea.hidden =
      true;

    completionArea.hidden =
      false;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {
    console.error(
      "お問い合わせ送信エラー:",
      error
    );

    showStatus(
      `送信に失敗しました。
エラーコード：${error.code || "不明"}
通信状態を確認して、もう一度お試しください。`,
      "error-message"
    );

    submitButton.disabled =
      false;
  }
}


contentInput.addEventListener(
  "input",
  updateCharacterCount
);


feedbackForm.addEventListener(
  "submit",
  submitFeedback
);


updateCharacterCount();
