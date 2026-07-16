import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
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


let editingNoticeId = null;
let allNotices = [];
let unsubscribeNotices = null;


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
  return String(value ?? "")
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
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function formatDate(value) {
  if (!value) {
    return "日付未設定";
  }

  if (
    typeof value === "string"
  ) {
    const parts =
      value.split("-");

    if (parts.length === 3) {
      return `${parts[0]}年${parts[1]}月${parts[2]}日`;
    }
  }

  let date;

  if (
    typeof value.toDate === "function"
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
    return "日付未設定";
  }

  return date.toLocaleDateString(
    "ja-JP"
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
  editingNoticeId =
    null;

  noticeForm.reset();

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


function startEdit(noticeId) {
  const notice =
    allNotices.find(
      item =>
        item.id === noticeId
    );

  if (!notice) {
    return;
  }

  editingNoticeId =
    noticeId;

  titleInput.value =
    notice.title || "";

  dateInput.value =
    notice.displayDate ||
    notice.date ||
    getTodayString();

  orderInput.value =
    Number(notice.order) || 0;

  contentInput.value =
    notice.content ||
    notice.body ||
    notice.message ||
    "";

  publishedInput.checked =
    notice.published !== false;

  formTitle.textContent =
    "✏️ お知らせを編集";

  saveButton.textContent =
    "変更を保存";

  cancelButton.hidden =
    false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  titleInput.focus();
}


function createNoticeElement(notice) {
  const article =
    document.createElement(
      "article"
    );

  article.className =
    "notice-item";

  const published =
    notice.published !== false;

  if (!published) {
    article.classList.add(
      "private"
    );
  }

  article.innerHTML = `
    <div class="notice-item-header">

      <h3 class="notice-item-title">
        ${escapeHtml(
          notice.title ||
          "無題のお知らせ"
        )}
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
        📅 ${escapeHtml(
          formatDate(
            notice.displayDate ||
            notice.date
          )
        )}
      </span>

      <span class="meta-chip">
        表示順：
        ${escapeHtml(
          notice.order ?? 0
        )}
      </span>

    </div>

    <p class="notice-content">
      ${escapeHtml(
        notice.content ||
        notice.body ||
        notice.message ||
        ""
      )}
    </p>

    <div class="notice-actions">

      <button
        type="button"
        class="notice-action-button edit-button"
        data-action="edit"
        data-id="${escapeHtml(notice.id)}"
      >
        編集
      </button>

      <button
        type="button"
        class="notice-action-button publish-button"
        data-action="publish"
        data-id="${escapeHtml(notice.id)}"
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
        class="notice-action-button order-button"
        data-action="top"
        data-id="${escapeHtml(notice.id)}"
      >
        最上部へ
      </button>

      <button
        type="button"
        class="notice-action-button delete-button"
        data-action="delete"
        data-id="${escapeHtml(notice.id)}"
        data-title="${escapeHtml(
          notice.title ||
          "無題のお知らせ"
        )}"
      >
        削除
      </button>

    </div>
  `;

  return article;
}


function sortNotices(notices) {
  return [...notices].sort(
    (first, second) => {
      const firstOrder =
        Number(first.order) || 0;

      const secondOrder =
        Number(second.order) || 0;

      if (
        firstOrder !== secondOrder
      ) {
        return firstOrder - secondOrder;
      }

      const firstDate =
        String(
          first.displayDate ||
          first.date ||
          ""
        );

      const secondDate =
        String(
          second.displayDate ||
          second.date ||
          ""
        );

      return secondDate.localeCompare(
        firstDate
      );
    }
  );
}


function renderNotices() {
  noticeList.innerHTML =
    "";

  if (allNotices.length === 0) {
    noticeList.innerHTML = `
      <div class="empty-message">
        登録されているお知らせはありません。
      </div>
    `;

    return;
  }

  allNotices.forEach(
    notice => {
      noticeList.appendChild(
        createNoticeElement(notice)
      );
    }
  );
}


async function saveNotice(event) {
  event.preventDefault();

  const title =
    titleInput.value.trim();

  const content =
    contentInput.value.trim();

  if (!title) {
    alert(
      "タイトルを入力してください。"
    );

    titleInput.focus();
    return;
  }

  if (!content) {
    alert(
      "内容を入力してください。"
    );

    contentInput.focus();
    return;
  }

  saveButton.disabled =
    true;

  cancelButton.disabled =
    true;

  showStatus(
    editingNoticeId
      ? "変更を保存しています..."
      : "お知らせを登録しています..."
  );

  const noticeData = {
    title,
    content,

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
  };

  try {
    if (editingNoticeId) {
      await updateDoc(
        doc(
          db,
          "notices",
          editingNoticeId
        ),
        noticeData
      );

      showStatus(
        "お知らせを更新しました。",
        "success-message"
      );

    } else {
      await addDoc(
        collection(
          db,
          "notices"
        ),
        {
          ...noticeData,

          createdAt:
            serverTimestamp()
        }
      );

      showStatus(
        "お知らせを登録しました。",
        "success-message"
      );
    }

    resetForm();

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

    cancelButton.disabled =
      false;
  }
}


async function togglePublished(
  noticeId,
  currentPublished,
  button
) {
  button.disabled =
    true;

  try {
    await updateDoc(
      doc(
        db,
        "notices",
        noticeId
      ),
      {
        published:
          !currentPublished,

        updatedAt:
          serverTimestamp()
      }
    );

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


async function moveToTop(
  noticeId,
  button
) {
  button.disabled =
    true;

  const smallestOrder =
    allNotices.reduce(
      (minimum, notice) => {
        const order =
          Number(notice.order) || 0;

        return Math.min(
          minimum,
          order
        );
      },
      0
    );

  try {
    await updateDoc(
      doc(
        db,
        "notices",
        noticeId
      ),
      {
        order:
          smallestOrder - 1,

        updatedAt:
          serverTimestamp()
      }
    );

  } catch (error) {
    console.error(
      "表示順更新エラー:",
      error
    );

    alert(
      "表示順の変更に失敗しました。"
    );

    button.disabled =
      false;
  }
}


async function removeNotice(
  noticeId,
  title,
  button
) {
  const confirmed =
    confirm(
      `「${title}」を削除します。\nこの操作は取り消せません。`
    );

  if (!confirmed) {
    return;
  }

  button.disabled =
    true;

  try {
    await deleteDoc(
      doc(
        db,
        "notices",
        noticeId
      )
    );

    if (
      editingNoticeId === noticeId
    ) {
      resetForm();
    }

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


function startRealtimeNotices() {
  if (unsubscribeNotices) {
    unsubscribeNotices();
  }

  unsubscribeNotices =
    onSnapshot(
      collection(
        db,
        "notices"
      ),
      snapshot => {
        const notices =
          snapshot.docs.map(
            noticeDocument => ({
              id:
                noticeDocument.id,

              ...noticeDocument.data()
            })
          );

        allNotices =
          sortNotices(notices);

        renderNotices();
        hideStatus();
      },
      error => {
        console.error(
          "お知らせ取得エラー:",
          error
        );

        showStatus(
          `お知らせ一覧の取得に失敗しました。
エラーコード：${error.code || "不明"}`,
          "error-message"
        );
      }
    );
}


noticeForm.addEventListener(
  "submit",
  saveNotice
);


cancelButton.addEventListener(
  "click",
  resetForm
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

    const noticeId =
      button.dataset.id;

    const action =
      button.dataset.action;

    if (action === "edit") {
      startEdit(noticeId);
      return;
    }

    if (action === "publish") {
      await togglePublished(
        noticeId,
        button.dataset.published ===
          "true",
        button
      );

      return;
    }

    if (action === "top") {
      await moveToTop(
        noticeId,
        button
      );

      return;
    }

    if (action === "delete") {
      await removeNotice(
        noticeId,
        button.dataset.title ||
          "無題のお知らせ",
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

      resetForm();
      startRealtimeNotices();

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


window.addEventListener(
  "beforeunload",
  () => {
    if (unsubscribeNotices) {
      unsubscribeNotices();
    }
  }
);
