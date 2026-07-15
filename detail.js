import {
  db,
  auth
} from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  deleteField
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


const detail =
  document.getElementById("detail");

const helpfulArea =
  document.getElementById("helpfulArea");

const helpfulCount =
  document.getElementById("helpfulCount");

const helpfulButton =
  document.getElementById("helpfulButton");

const helpfulMessage =
  document.getElementById("helpfulMessage");

const adminActions =
  document.getElementById("adminActions");

const featuredButton =
  document.getElementById("featuredButton");

const editButton =
  document.getElementById("editButton");

const deleteButton =
  document.getElementById("deleteButton");

const adminMessage =
  document.getElementById("adminMessage");


let currentHelpfulCount = 0;
let currentUserIsAdmin = false;
let currentAdminUser = null;
let currentFeatured = false;


// HTMLへ安全に表示
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// 改行を保って表示
function safeMultiline(value) {
  return escapeHtml(
    value || "未入力"
  );
}


// 参考になったの端末保存キー
function getHelpfulStorageKey() {
  return `fireNearHelpful_${reportId}`;
}


// 送信済みか確認
function hasAlreadyPressedHelpful() {
  return localStorage.getItem(
    getHelpfulStorageKey()
  ) === "true";
}


// 参考になった表示
function updateHelpfulDisplay() {
  helpfulCount.textContent =
    `参考になった：${currentHelpfulCount}件`;
}


// 参考になったボタン
function updateHelpfulButtonState() {
  if (hasAlreadyPressedHelpful()) {
    helpfulButton.disabled = true;

    helpfulButton.textContent =
      "✅ 参考になったを送信済み";
  } else {
    helpfulButton.disabled = false;

    helpfulButton.textContent =
      "👍 参考になった";
  }
}


// 重要事例ボタン
function updateFeaturedButton() {
  if (currentFeatured) {
    featuredButton.textContent =
      "📌 重要事例の設定を解除する";

    featuredButton.classList.add(
      "active"
    );
  } else {
    featuredButton.textContent =
      "📌 重要事例に設定する";

    featuredButton.classList.remove(
      "active"
    );
  }
}


// 管理者確認
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


// 管理者ログイン状態
onAuthStateChanged(
  auth,
  async (user) => {
    adminActions.hidden = true;

    currentUserIsAdmin = false;
    currentAdminUser = null;

    if (
      !user ||
      !reportId
    ) {
      return;
    }

    try {
      const isAdmin =
        await checkAdmin(user);

      if (!isAdmin) {
        return;
      }

      currentUserIsAdmin = true;
      currentAdminUser = user;

      editButton.href =
        `edit.html?id=${encodeURIComponent(reportId)}`;

      updateFeaturedButton();

      adminActions.hidden = false;

    } catch (error) {
      console.error(
        "管理者確認エラー:",
        error
      );
    }
  }
);


// 詳細読み込み
async function loadDetail() {
  if (!reportId) {
    detail.innerHTML =
      "<p>事例IDが指定されていません。</p>";

    helpfulArea.hidden = true;
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
      detail.innerHTML =
        "<p>指定された事例は存在しません。</p>";

      helpfulArea.hidden = true;
      return;
    }

    const data =
      reportSnapshot.data();

    currentHelpfulCount =
      Number(data.helpful || 0);

    currentFeatured =
      data.featured === true;

    updateFeaturedButton();

    const tags =
      Array.isArray(data.tags)
        ? data.tags.join("、")
        : data.tags || "なし";

    const featuredBadge =
      currentFeatured
        ? `
          <div class="important-badge">
            📌 重要事例
          </div>
        `
        : "";

    detail.innerHTML = `
      ${featuredBadge}

      <h2>
        ${escapeHtml(
          data.title || "タイトル未設定"
        )}
      </h2>

      <p>
        <strong>発生日：</strong>
        ${escapeHtml(data.date || "未設定")}
      </p>

      <p>
        <strong>所属：</strong>
        ${escapeHtml(data.department || "未設定")}
      </p>

      <p>
        <strong>業務区分：</strong>
        ${escapeHtml(data.category || "未設定")}
      </p>

      <p>
        <strong>発生場所：</strong>
        ${escapeHtml(data.place || "未設定")}
      </p>

      <p>
        <strong>レベル：</strong>
        ${escapeHtml(data.level || "未設定")}
      </p>

      <hr>

      <div class="detail-section">
        <h3>発生状況</h3>

        <p class="detail-text">
          ${safeMultiline(data.situation)}
        </p>
      </div>

      <div class="detail-section">
        <h3>原因</h3>

        <p class="detail-text">
          ${safeMultiline(data.cause)}
        </p>
      </div>

      <div class="detail-section">
        <h3>改善策</h3>

        <p class="detail-text">
          ${safeMultiline(data.countermeasure)}
        </p>
      </div>

      <div class="detail-section">
        <h3>この事例から学んだこと</h3>

        <p class="detail-text">
          ${safeMultiline(data.lesson)}
        </p>
      </div>

      <div class="detail-section">
        <h3>タグ</h3>

        <p class="detail-text">
          ${safeMultiline(tags)}
        </p>
      </div>
    `;

    updateHelpfulDisplay();
    updateHelpfulButtonState();

    helpfulArea.hidden = false;

  } catch (error) {
    console.error(
      "詳細読み込みエラー:",
      error
    );

    detail.innerHTML =
      "<p>詳細情報の読み込みに失敗しました。</p>";

    helpfulArea.hidden = true;
  }
}


// 参考になったを送信
async function sendHelpful() {
  if (!reportId) {
    return;
  }

  if (hasAlreadyPressedHelpful()) {
    helpfulMessage.textContent =
      "この事例にはすでに送信済みです。";

    updateHelpfulButtonState();
    return;
  }

  helpfulButton.disabled = true;
  helpfulButton.textContent = "送信中...";

  try {
    const reportReference =
      doc(
        db,
        "reports",
        reportId
      );

    await updateDoc(
      reportReference,
      {
        helpful: increment(1)
      }
    );

    currentHelpfulCount += 1;

    localStorage.setItem(
      getHelpfulStorageKey(),
      "true"
    );

    updateHelpfulDisplay();
    updateHelpfulButtonState();

    helpfulMessage.textContent =
      "ありがとうございます。参考になったを送信しました。";

  } catch (error) {
    console.error(
      "参考になった送信エラー:",
      error
    );

    helpfulButton.disabled = false;
    helpfulButton.textContent = "👍 参考になった";

    helpfulMessage.textContent =
      "送信に失敗しました。もう一度お試しください。";
  }
}


// 重要事例の設定・解除
async function toggleFeatured() {
  if (
    !reportId ||
    !currentUserIsAdmin ||
    !currentAdminUser
  ) {
    adminMessage.textContent =
      "管理者権限を確認できません。";

    return;
  }

  featuredButton.disabled = true;

  adminMessage.textContent =
    currentFeatured
      ? "重要事例の設定を解除しています..."
      : "重要事例に設定しています...";

  try {
    const reportReference =
      doc(
        db,
        "reports",
        reportId
      );

    if (currentFeatured) {
      await updateDoc(
        reportReference,
        {
          featured: false,
          featuredAt: deleteField(),
          featuredByUid: deleteField(),
          featuredByEmail: deleteField()
        }
      );

      currentFeatured = false;

      adminMessage.textContent =
        "重要事例の設定を解除しました。";

    } else {
      await updateDoc(
        reportReference,
        {
          featured: true,
          featuredAt: serverTimestamp(),
          featuredByUid:
            currentAdminUser.uid,
          featuredByEmail:
            currentAdminUser.email || ""
        }
      );

      currentFeatured = true;

      adminMessage.textContent =
        "重要事例に設定しました。";
    }

    updateFeaturedButton();

    await loadDetail();

  } catch (error) {
    console.error(
      "重要事例設定エラー:",
      error
    );

    adminMessage.textContent =
      "重要事例の設定変更に失敗しました。";
  } finally {
    featuredButton.disabled = false;
  }
}


// 削除
async function deleteReport() {
  if (
    !reportId ||
    !currentUserIsAdmin
  ) {
    adminMessage.textContent =
      "管理者権限を確認できません。";

    return;
  }

  const firstConfirm =
    window.confirm(
      "この事例を削除しますか？\nこの操作は取り消せません。"
    );

  if (!firstConfirm) {
    return;
  }

  const secondConfirm =
    window.confirm(
      "本当に削除してよろしいですか？"
    );

  if (!secondConfirm) {
    return;
  }

  deleteButton.disabled = true;
  deleteButton.textContent = "削除中...";

  try {
    const reportReference =
      doc(
        db,
        "reports",
        reportId
      );

    await deleteDoc(
      reportReference
    );

    localStorage.removeItem(
      getHelpfulStorageKey()
    );

    window.alert(
      "事例を削除しました。"
    );

    window.location.href =
      "cases.html";

  } catch (error) {
    console.error(
      "削除エラー:",
      error
    );

    adminMessage.textContent =
      "削除に失敗しました。";

    deleteButton.disabled = false;

    deleteButton.textContent =
      "🗑 この事例を削除する";
  }
}


helpfulButton.addEventListener(
  "click",
  sendHelpful
);

featuredButton.addEventListener(
  "click",
  toggleFeatured
);

deleteButton.addEventListener(
  "click",
  deleteReport
);


loadDetail();
