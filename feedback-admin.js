import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
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

const totalCount =
  document.getElementById("totalCount");

const unresolvedCount =
  document.getElementById("unresolvedCount");

const resolvedCount =
  document.getElementById("resolvedCount");

const statusFilter =
  document.getElementById("statusFilter");

const typeFilter =
  document.getElementById("typeFilter");

const keywordInput =
  document.getElementById("keywordInput");

const filterButton =
  document.getElementById("filterButton");

const resetButton =
  document.getElementById("resetButton");

const resultCount =
  document.getElementById("resultCount");

const feedbackList =
  document.getElementById("feedbackList");


let allFeedback = [];
let unsubscribeFeedback = null;


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


function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function convertToDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}


function getDateNumber(value) {
  const date =
    convertToDate(value);

  return date
    ? date.getTime()
    : 0;
}


function formatDate(value) {
  const date =
    convertToDate(value);

  if (!date) {
    return "日時未記録";
  }

  return date.toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function getStatus(item) {
  return item.status === "対応済み"
    ? "対応済み"
    : "未対応";
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


function sortFeedback(items) {
  return [...items].sort(
    (first, second) => {
      const firstStatus =
        getStatus(first);

      const secondStatus =
        getStatus(second);

      if (
        firstStatus !==
        secondStatus
      ) {
        return firstStatus ===
          "未対応"
          ? -1
          : 1;
      }

      return (
        getDateNumber(
          second.createdAt
        ) -
        getDateNumber(
          first.createdAt
        )
      );
    }
  );
}


function renderSummary() {
  totalCount.textContent =
    allFeedback.length;

  unresolvedCount.textContent =
    allFeedback.filter(
      item =>
        getStatus(item) ===
        "未対応"
    ).length;

  resolvedCount.textContent =
    allFeedback.filter(
      item =>
        getStatus(item) ===
        "対応済み"
    ).length;
}


function filterFeedback() {
  const selectedStatus =
    statusFilter.value;

  const selectedType =
    typeFilter.value;

  const keyword =
    normalizeText(
      keywordInput.value
    );

  return allFeedback.filter(
    item => {
      if (
        selectedStatus &&
        getStatus(item) !==
        selectedStatus
      ) {
        return false;
      }

      if (
        selectedType &&
        item.type !==
        selectedType
      ) {
        return false;
      }

      if (keyword) {
        const searchableText =
          normalizeText(
            [
              item.title,
              item.content,
              item.name,
              item.email,
              item.page,
              item.type,
              item.device,
              item.browser
            ].join(" ")
          );

        if (
          !searchableText.includes(
            keyword
          )
        ) {
          return false;
        }
      }

      return true;
    }
  );
}


function createFeedbackElement(item) {
  const article =
    document.createElement(
      "article"
    );

  const status =
    getStatus(item);

  const resolved =
    status === "対応済み";

  article.className =
    `feedback-item ${
      resolved
        ? "resolved"
        : "unresolved"
    }`;

  const email =
    String(
      item.email || ""
    ).trim();

  const mailSubject =
    encodeURIComponent(
      `Fire Nearお問い合わせ：${
        item.title ||
        "お問い合わせ"
      }`
    );

  const mailHref =
    email
      ? `mailto:${encodeURIComponent(
          email
        )}?subject=${mailSubject}`
      : "#";

  article.innerHTML = `
    <div class="feedback-header">

      <h3 class="feedback-title">
        ${escapeHtml(
          item.title ||
          "件名なし"
        )}
      </h3>

      <span class="feedback-status ${
        resolved
          ? "resolved-status"
          : "unresolved-status"
      }">
        ${escapeHtml(status)}
      </span>

    </div>


    <div class="feedback-meta">

      <span class="meta-chip">
        ${escapeHtml(
          item.type ||
          "種類未設定"
        )}
      </span>

      <span class="meta-chip">
        画面：
        ${escapeHtml(
          item.page ||
          "未設定"
        )}
      </span>

      <span class="meta-chip">
        ${escapeHtml(
          formatDate(
            item.createdAt
          )
        )}
      </span>

      <span class="meta-chip">
        ${escapeHtml(
          item.device ||
          "端末不明"
        )}
        ／
        ${escapeHtml(
          item.browser ||
          "ブラウザ不明"
        )}
      </span>

    </div>


    <div class="feedback-content">
      ${escapeHtml(
        item.content ||
        "内容の記載はありません。"
      )}
    </div>


    <div class="contact-information">

      <div class="contact-item">

        <span class="contact-label">
          お名前
        </span>

        ${escapeHtml(
          item.name ||
          "未記入"
        )}

      </div>


      <div class="contact-item">

        <span class="contact-label">
          返信先メールアドレス
        </span>

        ${escapeHtml(
          email ||
          "未記入"
        )}

      </div>

    </div>


    <details class="technical-details">

      <summary>
        端末・技術情報を表示
      </summary>

      <div class="technical-content">

        <strong>
          アプリバージョン：
        </strong>

        ${escapeHtml(
          item.appVersion ||
          "未記録"
        )}

        <br>


        <strong>
          画面サイズ：
        </strong>

        ${escapeHtml(
          item.screenWidth ?? ""
        )}
        ×
        ${escapeHtml(
          item.screenHeight ?? ""
        )}

        <br>


        <strong>
          表示領域：
        </strong>

        ${escapeHtml(
          item.viewportWidth ?? ""
        )}
        ×
        ${escapeHtml(
          item.viewportHeight ?? ""
        )}

        <br>


        <strong>
          言語：
        </strong>

        ${escapeHtml(
          item.language ||
          "未記録"
        )}

        <br>


        <strong>
          送信元ページ：
        </strong>

        ${escapeHtml(
          item.referrer ||
          "直接アクセス"
        )}

        <br>


        <strong>
          フォームURL：
        </strong>

        ${escapeHtml(
          item.pageUrl ||
          "未記録"
        )}

        <br>


        <strong>
          User Agent：
        </strong>

        ${escapeHtml(
          item.userAgent ||
          "未記録"
        )}

      </div>

    </details>


    <div class="feedback-actions">

      <button
        type="button"
        class="feedback-action-button ${
          resolved
            ? "reopen-button"
            : "status-button"
        }"
        data-action="status"
        data-id="${escapeHtml(item.id)}"
        data-status="${escapeHtml(status)}"
      >
        ${
          resolved
            ? "未対応へ戻す"
            : "対応済みにする"
        }
      </button>


      <a
        href="${mailHref}"
        class="feedback-action-button mail-button ${
          email
            ? ""
            : "disabled"
        }"
      >
        メールで返信
      </a>


      <button
        type="button"
        class="feedback-action-button delete-button"
        data-action="delete"
        data-id="${escapeHtml(item.id)}"
        data-title="${escapeHtml(
          item.title ||
          "件名なし"
        )}"
      >
        削除
      </button>

    </div>
  `;

  return article;
}


function renderFeedback() {
  const items =
    filterFeedback();

  resultCount.textContent =
    `${items.length}件`;

  feedbackList.innerHTML =
    "";

  if (items.length === 0) {
    feedbackList.innerHTML = `
      <div class="empty-message">
        条件に一致するお問い合わせはありません。
      </div>
    `;

    return;
  }

  items.forEach(
    item => {
      feedbackList.appendChild(
        createFeedbackElement(item)
      );
    }
  );
}


async function toggleStatus(
  feedbackId,
  currentStatus,
  button
) {
  const nextStatus =
    currentStatus ===
      "対応済み"
      ? "未対応"
      : "対応済み";

  button.disabled =
    true;

  try {
    await updateDoc(
      doc(
        db,
        "feedback",
        feedbackId
      ),
      {
        status:
          nextStatus,

        updatedAt:
          serverTimestamp(),

        resolvedAt:
          nextStatus ===
            "対応済み"
            ? serverTimestamp()
            : null
      }
    );

  } catch (error) {
    console.error(
      "対応状況更新エラー:",
      error
    );

    alert(
      "対応状況の変更に失敗しました。"
    );

    button.disabled =
      false;
  }
}


async function removeFeedback(
  feedbackId,
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
        "feedback",
        feedbackId
      )
    );

  } catch (error) {
    console.error(
      "お問い合わせ削除エラー:",
      error
    );

    alert(
      "お問い合わせの削除に失敗しました。"
    );

    button.disabled =
      false;
  }
}


function startRealtimeFeedback() {
  if (unsubscribeFeedback) {
    unsubscribeFeedback();
  }

  showStatus(
    "お問い合わせを読み込んでいます..."
  );

  unsubscribeFeedback =
    onSnapshot(
      collection(
        db,
        "feedback"
      ),

      snapshot => {
        const items =
          snapshot.docs.map(
            feedbackDocument => ({
              id:
                feedbackDocument.id,

              ...feedbackDocument.data()
            })
          );

        allFeedback =
          sortFeedback(items);

        renderSummary();
        renderFeedback();
        hideStatus();
      },

      error => {
        console.error(
          "お問い合わせ取得エラー:",
          error
        );

        showStatus(
          `お問い合わせの取得に失敗しました。
エラーコード：${error.code || "不明"}
詳細：${error.message || "不明"}`,
          "error-message"
        );
      }
    );
}


filterButton.addEventListener(
  "click",
  renderFeedback
);


resetButton.addEventListener(
  "click",
  () => {
    statusFilter.value =
      "";

    typeFilter.value =
      "";

    keywordInput.value =
      "";

    renderFeedback();
  }
);


keywordInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      renderFeedback();
    }
  }
);


feedbackList.addEventListener(
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

    const feedbackId =
      button.dataset.id;

    if (action === "status") {
      await toggleStatus(
        feedbackId,
        button.dataset.status,
        button
      );

      return;
    }

    if (action === "delete") {
      await removeFeedback(
        feedbackId,
        button.dataset.title ||
          "件名なし",
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

      startRealtimeFeedback();

    } catch (error) {
      console.error(
        "管理者確認エラー:",
        error
      );

      showStatus(
        `管理者権限を確認できませんでした。
エラーコード：${error.code || "不明"}`,
        "error-message"
      );
    }
  }
);


window.addEventListener(
  "beforeunload",
  () => {
    if (unsubscribeFeedback) {
      unsubscribeFeedback();
    }
  }
);
