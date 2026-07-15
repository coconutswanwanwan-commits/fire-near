import {
  db,
  auth
} from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const statusMessage =
  document.getElementById("statusMessage");

const detailArea =
  document.getElementById("detailArea");

const detailForm =
  document.getElementById("detailForm");

const titleInput =
  document.getElementById("titleInput");

const departmentInput =
  document.getElementById("departmentInput");

const levelInput =
  document.getElementById("levelInput");

const categoryInput =
  document.getElementById("categoryInput");

const locationInput =
  document.getElementById("locationInput");

const summaryInput =
  document.getElementById("summaryInput");

const descriptionInput =
  document.getElementById("descriptionInput");

const causeInput =
  document.getElementById("causeInput");

const countermeasureInput =
  document.getElementById("countermeasureInput");

const featuredInput =
  document.getElementById("featuredInput");

const saveButton =
  document.getElementById("saveButton");

const featuredButton =
  document.getElementById("featuredButton");

const deleteButton =
  document.getElementById("deleteButton");

const imageArea =
  document.getElementById("imageArea");

const reportIdText =
  document.getElementById("reportIdText");

const authorText =
  document.getElementById("authorText");

const createdAtText =
  document.getElementById("createdAtText");

const updatedAtText =
  document.getElementById("updatedAtText");


const parameters =
  new URLSearchParams(
    location.search
  );

const reportId =
  parameters.get("id");


let currentReport = null;


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


function formatDate(value) {
  if (!value) {
    return "未記録";
  }

  let date;

  if (
    typeof value.toDate ===
    "function"
  ) {
    date = value.toDate();

  } else {
    date = new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "未記録";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  ).format(date);
}


function getLevel(report) {
  const rawLevel =
    report.level ??
    report.riskLevel ??
    report.severity ??
    "";

  const match =
    String(rawLevel).match(/[1-4]/);

  return match
    ? match[0]
    : "";
}


function getTitle(report) {
  return (
    report.title ||
    report.subject ||
    ""
  );
}


function getDepartment(report) {
  return (
    report.department ||
    report.affiliation ||
    report.station ||
    report.section ||
    ""
  );
}


function getSummary(report) {
  return (
    report.summary ||
    ""
  );
}


function getDescription(report) {
  return (
    report.description ||
    report.content ||
    report.detail ||
    ""
  );
}


function getImageUrls(report) {
  const candidates = [
    report.imageUrl,
    report.photoUrl,
    report.attachmentUrl,
    report.imageUrls,
    report.photoUrls,
    report.attachments
  ];

  const urls = [];

  candidates.forEach((candidate) => {
    if (!candidate) {
      return;
    }

    if (typeof candidate === "string") {
      urls.push(candidate);
      return;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (typeof item === "string") {
          urls.push(item);
          return;
        }

        if (
          item &&
          typeof item.url === "string"
        ) {
          urls.push(item.url);
        }
      });
    }
  });

  return [
    ...new Set(
      urls.filter(Boolean)
    )
  ];
}


function renderImages(report) {
  const urls =
    getImageUrls(report);

  imageArea.innerHTML =
    "";

  if (urls.length === 0) {
    imageArea.textContent =
      "添付画像はありません。";

    return;
  }

  urls.forEach((url, index) => {
    const image =
      document.createElement("img");

    image.src =
      url;

    image.alt =
      `添付画像 ${index + 1}`;

    image.loading =
      "lazy";

    image.addEventListener(
      "error",
      () => {
        image.remove();

        const link =
          document.createElement("a");

        link.href =
          url;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        link.className =
          "image-link";

        link.textContent =
          `添付ファイル ${index + 1} を開く`;

        imageArea.appendChild(link);
      }
    );

    imageArea.appendChild(image);
  });
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


function renderReport(report) {
  currentReport =
    report;

  titleInput.value =
    getTitle(report);

  departmentInput.value =
    getDepartment(report);

  levelInput.value =
    getLevel(report);

  categoryInput.value =
    report.category ||
    "";

  locationInput.value =
    report.location ||
    report.place ||
    "";

  summaryInput.value =
    getSummary(report);

  descriptionInput.value =
    getDescription(report);

  causeInput.value =
    report.cause ||
    report.background ||
    "";

  countermeasureInput.value =
    report.countermeasure ||
    report.improvement ||
    report.preventiveAction ||
    "";

  featuredInput.checked =
    report.featured === true;

  featuredButton.textContent =
    report.featured === true
      ? "重要事例を解除"
      : "重要事例に設定";

  reportIdText.textContent =
    reportId;

  authorText.textContent =
    report.authorName ||
    report.userName ||
    report.email ||
    report.authorEmail ||
    "未記録";

  createdAtText.textContent =
    formatDate(
      report.createdAt ||
      report.date ||
      report.reportDate
    );

  updatedAtText.textContent =
    formatDate(
      report.updatedAt
    );

  renderImages(report);

  detailArea.hidden =
    false;

  hideStatus();
}


async function loadReport() {
  if (!reportId) {
    showStatus(
      "投稿IDが指定されていません。",
      "error-message"
    );

    return;
  }

  try {
    const reportSnapshot =
      await getDoc(
        doc(
          db,
          "reports",
          reportId
        )
      );

    if (!reportSnapshot.exists()) {
      showStatus(
        "指定された投稿は存在しません。",
        "error-message"
      );

      return;
    }

    renderReport(
      reportSnapshot.data()
    );

  } catch (error) {
    console.error(
      "投稿読み込みエラー:",
      error
    );

    showStatus(
      "投稿の読み込みに失敗しました。",
      "error-message"
    );
  }
}


async function saveReport(event) {
  event.preventDefault();

  if (!reportId) {
    return;
  }

  const title =
    titleInput.value.trim();

  if (!title) {
    alert(
      "タイトルを入力してください。"
    );

    titleInput.focus();
    return;
  }

  saveButton.disabled =
    true;

  featuredButton.disabled =
    true;

  deleteButton.disabled =
    true;

  showStatus(
    "変更を保存しています..."
  );

  try {
    await updateDoc(
      doc(
        db,
        "reports",
        reportId
      ),
      {
        title,
        department:
          departmentInput.value.trim(),

        level:
          levelInput.value,

        category:
          categoryInput.value.trim(),

        location:
          locationInput.value.trim(),

        summary:
          summaryInput.value.trim(),

        description:
          descriptionInput.value.trim(),

        cause:
          causeInput.value.trim(),

        countermeasure:
          countermeasureInput.value.trim(),

        featured:
          featuredInput.checked,

        updatedAt:
          serverTimestamp()
      }
    );

    currentReport = {
      ...currentReport,
      title,

      department:
        departmentInput.value.trim(),

      level:
        levelInput.value,

      category:
        categoryInput.value.trim(),

      location:
        locationInput.value.trim(),

      summary:
        summaryInput.value.trim(),

      description:
        descriptionInput.value.trim(),

      cause:
        causeInput.value.trim(),

      countermeasure:
        countermeasureInput.value.trim(),

      featured:
        featuredInput.checked
    };

    featuredButton.textContent =
      featuredInput.checked
        ? "重要事例を解除"
        : "重要事例に設定";

    updatedAtText.textContent =
      "保存直後";

    showStatus(
      "変更を保存しました。",
      "success-message"
    );

  } catch (error) {
    console.error(
      "投稿保存エラー:",
      error
    );

    showStatus(
      "変更の保存に失敗しました。",
      "error-message"
    );

  } finally {
    saveButton.disabled =
      false;

    featuredButton.disabled =
      false;

    deleteButton.disabled =
      false;
  }
}


async function toggleFeatured() {
  if (!reportId) {
    return;
  }

  const nextFeatured =
    !featuredInput.checked;

  featuredButton.disabled =
    true;

  try {
    await updateDoc(
      doc(
        db,
        "reports",
        reportId
      ),
      {
        featured:
          nextFeatured,

        updatedAt:
          serverTimestamp()
      }
    );

    featuredInput.checked =
      nextFeatured;

    featuredButton.textContent =
      nextFeatured
        ? "重要事例を解除"
        : "重要事例に設定";

    showStatus(
      nextFeatured
        ? "重要事例に設定しました。"
        : "重要事例を解除しました。",
      "success-message"
    );

  } catch (error) {
    console.error(
      "重要事例更新エラー:",
      error
    );

    showStatus(
      "重要事例の設定変更に失敗しました。",
      "error-message"
    );

  } finally {
    featuredButton.disabled =
      false;
  }
}


async function removeReport() {
  if (!reportId) {
    return;
  }

  const title =
    titleInput.value.trim() ||
    "無題の投稿";

  const confirmed =
    confirm(
      `「${title}」を削除します。\nこの操作は取り消せません。`
    );

  if (!confirmed) {
    return;
  }

  saveButton.disabled =
    true;

  featuredButton.disabled =
    true;

  deleteButton.disabled =
    true;

  try {
    await deleteDoc(
      doc(
        db,
        "reports",
        reportId
      )
    );

    alert(
      "投稿を削除しました。"
    );

    location.replace(
      "cases.html"
    );

  } catch (error) {
    console.error(
      "投稿削除エラー:",
      error
    );

    showStatus(
      "投稿の削除に失敗しました。",
      "error-message"
    );

    saveButton.disabled =
      false;

    featuredButton.disabled =
      false;

    deleteButton.disabled =
      false;
  }
}


detailForm.addEventListener(
  "submit",
  saveReport
);


featuredButton.addEventListener(
  "click",
  toggleFeatured
);


deleteButton.addEventListener(
  "click",
  removeReport
);


onAuthStateChanged(
  auth,
  async (user) => {
    try {
      const isAdmin =
        await checkAdmin(user);

      if (!isAdmin) {
        location.replace(
          "admin.html"
        );

        return;
      }

      await loadReport();

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
