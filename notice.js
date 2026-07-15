import {
  db,
  auth
} from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const noticeStatus =
  document.getElementById("noticeStatus");

const noticeForm =
  document.getElementById("noticeForm");

const noticeTitle =
  document.getElementById("noticeTitle");

const noticeBody =
  document.getElementById("noticeBody");

const saveButton =
  document.getElementById("saveButton");

const updatedInformation =
  document.getElementById("updatedInformation");

const updatedAt =
  document.getElementById("updatedAt");

const updatedBy =
  document.getElementById("updatedBy");


let currentAdminUser = null;


function showStatus(
  message,
  type = ""
) {
  noticeStatus.textContent =
    message;

  noticeStatus.className =
    "notice-status";

  if (type) {
    noticeStatus.classList.add(type);
  }
}


function formatTimestamp(value) {
  if (
    value &&
    typeof value.toDate === "function"
  ) {
    return value
      .toDate()
      .toLocaleString("ja-JP");
  }

  return "未更新";
}


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


async function loadNotice() {
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
      noticeTitle.value =
        "Fire Nearへようこそ";

      noticeBody.value =
        "気付いたヒヤリハットは積極的に共有しましょう。";

      updatedInformation.hidden =
        true;

      showStatus(
        "まだお知らせは保存されていません。内容を確認して保存してください。"
      );

      noticeForm.hidden =
        false;

      return;
    }


    const data =
      noticeSnapshot.data();


    noticeTitle.value =
      data.title || "";

    noticeBody.value =
      data.body || "";


    updatedAt.textContent =
      formatTimestamp(
        data.updatedAt
      );


    updatedBy.textContent =
      data.updatedByEmail ||
      data.updatedByName ||
      "管理者";


    updatedInformation.hidden =
      false;

    noticeForm.hidden =
      false;


    showStatus(
      "現在のお知らせを読み込みました。"
    );

  } catch (error) {
    console.error(
      "お知らせ読み込みエラー:",
      error
    );

    showStatus(
      "お知らせの読み込みに失敗しました。",
      "error"
    );
  }
}


async function saveNotice(event) {
  event.preventDefault();


  if (!currentAdminUser) {
    showStatus(
      "管理者権限を確認できません。",
      "error"
    );

    return;
  }


  const title =
    noticeTitle.value.trim();

  const body =
    noticeBody.value.trim();


  if (!title || !body) {
    showStatus(
      "タイトルと本文を入力してください。",
      "error"
    );

    return;
  }


  saveButton.disabled =
    true;

  saveButton.textContent =
    "保存中...";

  showStatus(
    "お知らせを保存しています..."
  );


  try {
    const noticeReference =
      doc(
        db,
        "settings",
        "notice"
      );


    await setDoc(
      noticeReference,
      {
        title,
        body,

        updatedAt:
          serverTimestamp(),

        updatedByUid:
          currentAdminUser.uid,

        updatedByEmail:
          currentAdminUser.email || "",

        updatedByName:
          currentAdminUser.displayName || ""
      },
      {
        merge: true
      }
    );


    showStatus(
      "お知らせを保存しました。",
      "success"
    );


    saveButton.textContent =
      "✅ 保存しました";


    await loadNotice();


    window.setTimeout(
      () => {
        saveButton.disabled =
          false;

        saveButton.textContent =
          "💾 お知らせを保存";
      },
      1000
    );

  } catch (error) {
    console.error(
      "お知らせ保存エラー:",
      error
    );

    showStatus(
      "保存に失敗しました。Firestoreルールと管理者権限を確認してください。",
      "error"
    );

    saveButton.disabled =
      false;

    saveButton.textContent =
      "💾 お知らせを保存";
  }
}


onAuthStateChanged(
  auth,
  async (user) => {
    noticeForm.hidden =
      true;

    currentAdminUser =
      null;


    if (!user) {
      showStatus(
        "管理者としてログインしていません。管理ダッシュボードからログインしてください。",
        "error"
      );

      return;
    }


    showStatus(
      "管理者権限を確認しています..."
    );


    try {
      const isAdmin =
        await checkAdmin(user);


      if (!isAdmin) {
        showStatus(
          "このGoogleアカウントには管理者権限がありません。",
          "error"
        );

        return;
      }


      currentAdminUser =
        user;


      await loadNotice();

    } catch (error) {
      console.error(
        "管理者確認エラー:",
        error
      );

      showStatus(
        "管理者権限の確認に失敗しました。",
        "error"
      );
    }
  }
);


noticeForm.addEventListener(
  "submit",
  saveNotice
);
