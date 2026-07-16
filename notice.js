import {
  db,
  auth
} from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const statusMessage =
  document.getElementById("statusMessage");

const noticeForm =
  document.getElementById("noticeForm");

const formTitle =
  document.getElementById("formTitle");

const titleInput =
  document.getElementById("titleInput");

const dateInput =
  document.getElementById("dateInput");

const orderInput =
  document.getElementById("orderInput");

const contentInput =
  document.getElementById("contentInput");

const publishedInput =
  document.getElementById("publishedInput");

const saveButton =
  document.getElementById("saveButton");

const cancelButton =
  document.getElementById("cancelButton");

const noticeList =
  document.getElementById("noticeList");


const noticeReference =
  doc(
    db,
    "settings",
    "notice"
  );


let currentNoticeExists =
  false;


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


function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getTodayString() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


function formatDateTime(value) {
  if (!value) {
    return "未記録";
  }

  let date;

  if (
    typeof value.toDate ===
    "function"
  ) {
    date =
      value.toDate();

  } else {
    date =
      new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "未記録";
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


async function checkAdmin(user) {
  if (!user) {
    return false;
  }

  const adminSnapshot =
    await getDoc(
      doc(
        db,
        "admins",
        user.uid
      )
    );

  return adminSnapshot.exists();
}


function resetForm() {
  titleInput.value =
    "";

  contentInput.value =
    "";

  dateInput.value =
    getTodayString();

  orderInput.value =
    "0";

  publishedInput.checked =
    true;

  formTitle.textContent =
    "➕ お知らせを追加";

  saveButton.textContent =
    "お知らせを保存";

  cancelButton.hidden =
    true;
}


function renderNotice(data) {
  noticeList.innerHTML =
    "";

  if (!data) {
    noticeList.innerHTML = `
      <div class="empty-message">
        現在、登録されているお知らせはありません。
      </div>
    `;

    return;
  }

  const title =
    data.title ||
    "お知らせ";

  const body =
    data.body ||
    data.content ||
    "";

  const published =
    data.published !== false;

  const updatedDate =
    formatDateTime(
      data.updatedAt
    );

  const article =
    document.createElement(
      "article"
    );

  article.className =
    "notice-item";

  if (!published) {
    article.classList.add(
      "private"
    );
  }

  article.innerHTML = `
    <div class="notice-item-header">

      <h3 class="notice-item-title">
        ${escapeHtml(title)}
      </h3>

      <span class="notice-status ${
        published
          ? "published-status"
          : "private-status"
      }">
        ${
          published
            ? "公開中"
            : "非公開"
        }
      </span>

    </div>


    <div class="notice-meta">

      <span class="meta-chip">
        📅 ${
          escapeHtml(
            data.displayDate ||
            "日付未設定"
          )
        }
      </span>

      <span class="meta-chip">
        最終更新：
        ${escapeHtml(updatedDate)}
      </span>

    </div>


    <p class="notice-content">
      ${escapeHtml(body)}
    </p>


    <div class="notice-actions">

      <button
        type="button"
        class="notice-action-button edit-button"
        data-action="edit"
      >
        編集
      </button>


      <button
        type="button"
        class="notice-action-button publish-button"
        data-action="publish"
        data-published="${published}"
      >
        ${
          published
            ? "非公開にする"
            : "公開する"
        }
      </button>


      <button
        type="button"
        class="notice-action-button delete-button"
        data-action="delete"
      >
        削除
      </button>

    </div>
  `;

  noticeList.appendChild(
    article
  );
}


async function loadNotice() {
  showStatus(
    "お知らせを読み込んでいます..."
  );

  try {
    const snapshot =
      await getDoc(
        noticeReference
      );

    if (!snapshot.exists()) {
      currentNoticeExists =
        false;

      resetForm();
      renderNotice(null);
      hideStatus();

      return;
    }

    currentNoticeExists =
      true;

    const data =
      snapshot.data();

    titleInput.value =
      data.title ||
      "";

    contentInput.value =
      data.body ||
      data.content ||
      "";

    dateInput.value =
      data.displayDate ||
      getTodayString();

    orderInput.value =
      Number(data.order) || 0;

    publishedInput.checked =
      data.published !== false;

    formTitle.textContent =
      "✏️ お知らせを編集";

    saveButton.textContent =
      "変更を保存";

    cancelButton.hidden =
      true;

    renderNotice(data);
    hideStatus();

  } catch (error) {
    console.error(
      "お知らせ取得エラー:",
      error
    );

    showStatus(
      `お知らせの取得に失敗しました。
エラーコード：${error.code || "不明"}`,
      "error-message"
    );
  }
}


async function saveNotice(event) {
  event.preventDefault();

  const title =
    titleInput.value.trim();

  const body =
    contentInput.value.trim();

  if (!title) {
    alert(
      "タイトルを入力してください。"
    );

    titleInput.focus();
    return;
  }

  if (!body) {
    alert(
      "内容を入力してください。"
    );

    contentInput.focus();
    return;
  }

  saveButton.disabled =
    true;

  showStatus(
    "お知らせを保存しています..."
  );

  try {
    await setDoc(
      noticeReference,
      {
        title,
        body,

        content:
          body,

        displayDate:
          dateInput.value ||
          getTodayString(),

        order:
          Number(
            orderInput.value
          ) || 0,

        published:
          publishedInput.checked,

        updatedAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    currentNoticeExists =
      true;

    showStatus(
      "お知らせを保存しました。ホーム画面を再読み込みすると反映されます。",
      "success-message"
    );

    await loadNotice();

  } catch (error) {
    console.error(
      "お知らせ保存エラー:",
      error
    );

    showStatus(
      `お知らせの保存に失敗しました。
エラーコード：${error.code || "不明"}`,
      "error-message"
    );

  } finally {
    saveButton.disabled =
      false;
  }
}


async function togglePublished(
  currentPublished,
  button
) {
  button.disabled =
    true;

  try {
    await setDoc(
      noticeReference,
      {
        published:
          !currentPublished,

        updatedAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    await loadNotice();

  } catch (error) {
    console.error(
      "公開状態更新エラー:",
      error
    );

    alert(
      "公開状態の変更に失敗しました。"
    );

    button.disabled =
      false;
  }
}


async function removeNotice(
  button
) {
  const confirmed =
    confirm(
      "現在のお知らせを削除します。\nこの操作は取り消せません。"
    );

  if (!confirmed) {
    return;
  }

  button.disabled =
    true;

  try {
    await deleteDoc(
      noticeReference
    );

    currentNoticeExists =
      false;

    resetForm();
    renderNotice(null);

    showStatus(
      "お知らせを削除しました。",
      "success-message"
    );

  } catch (error) {
    console.error(
      "お知らせ削除エラー:",
      error
    );

    alert(
      "お知らせの削除に失敗しました。"
    );

    button.disabled =
      false;
  }
}


noticeForm.addEventListener(
  "submit",
  saveNotice
);


cancelButton.addEventListener(
  "click",
  async () => {
    if (currentNoticeExists) {
      await loadNotice();

    } else {
      resetForm();
    }
  }
);


noticeList.addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) {
      return;
    }

    const action =
      button.dataset.action;

    if (action === "edit") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      titleInput.focus();
      return;
    }

    if (action === "publish") {
      await togglePublished(
        button.dataset.published ===
          "true",
        button
      );

      return;
    }

    if (action === "delete") {
      await removeNotice(
        button
      );
    }
  }
);


onAuthStateChanged(
  auth,
  async user => {
    try {
      const isAdmin =
        await checkAdmin(user);

      if (!isAdmin) {
        location.replace(
          "admin.html"
        );

        return;
      }

      dateInput.value =
        getTodayString();

      await loadNotice();

    } catch (error) {
      console.error(
        "管理者確認エラー:",
        error
      );

      showStatus(
        "管理者権限を確認できませんでした。",
        "error-message"
      );
    }
  }
);
