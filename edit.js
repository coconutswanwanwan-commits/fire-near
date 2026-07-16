import {
  db,
  auth
} from "./firebase.js";

import {
  setCategoryOptions
} from "./master-data.js";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const params =
  new URLSearchParams(
    window.location.search
  );

const reportId =
  params.get("id");


const editStatus =
  document.getElementById("editStatus");

const editForm =
  document.getElementById("editForm");

const saveButton =
  document.getElementById("saveButton");

const cancelLink =
  document.getElementById("cancelLink");

const categoryInput =
  document.getElementById("category");


let currentAdminUser = null;


// 入力欄を取得
function getInput(id) {
  return document.getElementById(id);
}


// 業務区分を設定
function initializeCategoryOptions(
  selectedValue = ""
) {
  setCategoryOptions(
    categoryInput,
    {
      firstOptionText:
        "選択してください",

      selectedValue,

      preserveUnknownValue:
        true
    }
  );
}


// 状態メッセージ
function showStatus(
  message,
  type = ""
) {
  editStatus.textContent =
    message;

  editStatus.className =
    "edit-status";

  if (type === "error") {
    editStatus.classList.add(
      "edit-error"
    );
  }

  if (type === "success") {
    editStatus.classList.add(
      "edit-success"
    );
  }
}


// 管理者か確認
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


// 編集データをフォームへ表示
function fillForm(data) {
  getInput("date").value =
    data.date || "";

  getInput("department").value =
    data.department || "";

  initializeCategoryOptions(
    data.category || ""
  );

  getInput("place").value =
    data.place || "";

  getInput("level").value =
    data.level || "レベル1（軽微）";

  getInput("title").value =
    data.title || "";

  getInput("situation").value =
    data.situation || "";

  getInput("cause").value =
    data.cause || "";

  getInput("countermeasure").value =
    data.countermeasure || "";

  getInput("lesson").value =
    data.lesson || "";

  getInput("tags").value =
    Array.isArray(data.tags)
      ? data.tags.join(", ")
      : data.tags || "";
}


// 編集対象を読み込む
async function loadReport() {
  if (!reportId) {
    showStatus(
      "事例IDが指定されていません。",
      "error"
    );

    return;
  }

  try {
    const reportReference =
      doc(
        db,
        "reports",
        reportId
      );

    const reportSnapshot =
      await getDoc(
        reportReference
      );

    if (!reportSnapshot.exists()) {
      showStatus(
        "指定された事例は存在しません。",
        "error"
      );

      return;
    }

    fillForm(
      reportSnapshot.data()
    );

    cancelLink.href =
      `detail.html?id=${encodeURIComponent(reportId)}`;

    editForm.hidden =
      false;

    showStatus(
      "内容を修正して「変更を保存」を押してください。"
    );

  } catch (error) {
    console.error(
      "編集データ読み込みエラー:",
      error
    );

    showStatus(
      "事例の読み込みに失敗しました。",
      "error"
    );
  }
}


// 更新するデータを作成
function createUpdateData() {
  return {
    date:
      getInput("date").value,

    department:
      getInput("department").value,

    category:
      categoryInput.value,

    place:
      getInput("place").value.trim(),

    level:
      getInput("level").value,

    title:
      getInput("title").value.trim(),

    situation:
      getInput("situation").value.trim(),

    cause:
      getInput("cause").value.trim(),

    countermeasure:
      getInput("countermeasure").value.trim(),

    lesson:
      getInput("lesson").value.trim(),

    tags:
      getInput("tags").value.trim(),

    updatedAt:
      serverTimestamp(),

    updatedByUid:
      currentAdminUser.uid,

    updatedByEmail:
      currentAdminUser.email || ""
  };
}


// 保存処理
async function saveReport(event) {
  event.preventDefault();

  if (
    !currentAdminUser ||
    !reportId
  ) {
    showStatus(
      "管理者権限を確認できません。",
      "error"
    );

    return;
  }

  if (!editForm.reportValidity()) {
    return;
  }

  saveButton.disabled =
    true;

  saveButton.textContent =
    "保存中...";

  showStatus(
    "変更内容を保存しています..."
  );

  try {
    const reportReference =
      doc(
        db,
        "reports",
        reportId
      );

    await updateDoc(
      reportReference,
      createUpdateData()
    );

    showStatus(
      "変更を保存しました。",
      "success"
    );

    saveButton.textContent =
      "✅ 保存しました";

    window.setTimeout(
      () => {
        window.location.href =
          `detail.html?id=${encodeURIComponent(reportId)}`;
      },
      800
    );

  } catch (error) {
    console.error(
      "編集保存エラー:",
      error
    );

    showStatus(
      "保存に失敗しました。管理者権限とFirestoreルールを確認してください。",
      "error"
    );

    saveButton.disabled =
      false;

    saveButton.textContent =
      "💾 変更を保存";
  }
}


// 初期表示時に業務区分を設定
initializeCategoryOptions();


// ログイン状態を確認
onAuthStateChanged(
  auth,
  async (user) => {
    editForm.hidden =
      true;

    if (!user) {
      showStatus(
        "管理者としてログインしていません。管理者ログイン画面からログインしてください。",
        "error"
      );

      cancelLink.href =
        "admin.html";

      cancelLink.textContent =
        "🔐 管理者ログインへ";

      return;
    }

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

      await loadReport();

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


editForm.addEventListener(
  "submit",
  saveReport
);
