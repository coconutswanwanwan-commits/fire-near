import {
  db
} from "./firebase.js";

import {
  setCategoryOptions
} from "./master-data.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const form =
  document.getElementById("reportForm");

const formArea =
  document.getElementById("formArea");

const confirmationArea =
  document.getElementById("confirmationArea");

const completionArea =
  document.getElementById("completionArea");

const statusMessage =
  document.getElementById("statusMessage");

const editButton =
  document.getElementById("editButton");

const finalSubmitButton =
  document.getElementById("finalSubmitButton");

const newPostButton =
  document.getElementById("newPostButton");


const dateInput =
  document.getElementById("date");

const departmentInput =
  document.getElementById("department");

const categoryInput =
  document.getElementById("category");

const placeInput =
  document.getElementById("place");

const levelInput =
  document.getElementById("level");

const titleInput =
  document.getElementById("title");

const situationInput =
  document.getElementById("situation");

const causeInput =
  document.getElementById("cause");

const countermeasureInput =
  document.getElementById("countermeasure");

const lessonInput =
  document.getElementById("lesson");

const tagsInput =
  document.getElementById("tags");


const confirmDate =
  document.getElementById("confirmDate");

const confirmDepartment =
  document.getElementById("confirmDepartment");

const confirmCategory =
  document.getElementById("confirmCategory");

const confirmPlace =
  document.getElementById("confirmPlace");

const confirmLevel =
  document.getElementById("confirmLevel");

const confirmTitle =
  document.getElementById("confirmTitle");

const confirmSituation =
  document.getElementById("confirmSituation");

const confirmCause =
  document.getElementById("confirmCause");

const confirmCountermeasure =
  document.getElementById("confirmCountermeasure");

const confirmLesson =
  document.getElementById("confirmLesson");

const confirmTags =
  document.getElementById("confirmTags");


let pendingReportData =
  null;


/*
 * 業務区分をmaster-data.jsから設定
 */
function initializeCategoryOptions() {
  setCategoryOptions(
    categoryInput,
    {
      firstOptionText:
        "選択してください",

      preserveUnknownValue:
        false
    }
  );
}


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


function formatDate(value) {
  if (!value) {
    return "未入力";
  }

  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return (
    `${parts[0]}年` +
    `${parts[1]}月` +
    `${parts[2]}日`
  );
}


function displayValue(value) {
  const text =
    String(
      value ?? ""
    ).trim();

  return text ||
    "未入力";
}


function collectFormData() {
  return {
    date:
      dateInput.value,

    department:
      departmentInput.value,

    category:
      categoryInput.value,

    place:
      placeInput.value.trim(),

    level:
      levelInput.value,

    title:
      titleInput.value.trim(),

    situation:
      situationInput.value.trim(),

    cause:
      causeInput.value.trim(),

    countermeasure:
      countermeasureInput.value.trim(),

    lesson:
      lessonInput.value.trim(),

    tags:
      tagsInput.value.trim()
  };
}


function validateFormData(data) {
  if (!data.date) {
    alert(
      "発生日を入力してください。"
    );

    dateInput.focus();
    return false;
  }

  if (!data.department) {
    alert(
      "所属を選択してください。"
    );

    departmentInput.focus();
    return false;
  }

  if (!data.category) {
    alert(
      "業務区分を選択してください。"
    );

    categoryInput.focus();
    return false;
  }

  if (!data.title) {
    alert(
      "タイトルを入力してください。"
    );

    titleInput.focus();
    return false;
  }

  return true;
}


function renderConfirmation(data) {
  confirmDate.textContent =
    formatDate(
      data.date
    );

  confirmDepartment.textContent =
    displayValue(
      data.department
    );

  confirmCategory.textContent =
    displayValue(
      data.category
    );

  confirmPlace.textContent =
    displayValue(
      data.place
    );

  confirmLevel.textContent =
    displayValue(
      data.level
    );

  confirmTitle.textContent =
    displayValue(
      data.title
    );

  confirmSituation.textContent =
    displayValue(
      data.situation
    );

  confirmCause.textContent =
    displayValue(
      data.cause
    );

  confirmCountermeasure.textContent =
    displayValue(
      data.countermeasure
    );

  confirmLesson.textContent =
    displayValue(
      data.lesson
    );

  confirmTags.textContent =
    displayValue(
      data.tags
    );
}


function showConfirmation() {
  const data =
    collectFormData();

  if (!validateFormData(data)) {
    return;
  }

  pendingReportData =
    data;

  renderConfirmation(data);

  hideStatus();

  formArea.hidden =
    true;

  confirmationArea.hidden =
    false;

  completionArea.hidden =
    true;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function returnToForm() {
  confirmationArea.hidden =
    true;

  completionArea.hidden =
    true;

  formArea.hidden =
    false;

  hideStatus();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  titleInput.focus();
}


async function submitReport() {
  if (!pendingReportData) {
    showStatus(
      "投稿内容を確認できませんでした。入力画面へ戻ってください。",
      "error-message"
    );

    return;
  }

  finalSubmitButton.disabled =
    true;

  editButton.disabled =
    true;

  showStatus(
    "投稿を保存しています..."
  );

  try {
    await addDoc(
      collection(
        db,
        "reports"
      ),
      {
        ...pendingReportData,

        helpful:
          0,

        featured:
          false,

        createdAt:
          serverTimestamp()
      }
    );

    form.reset();

    initializeCategoryOptions();

    dateInput.value =
      getTodayString();

    pendingReportData =
      null;

    hideStatus();

    formArea.hidden =
      true;

    confirmationArea.hidden =
      true;

    completionArea.hidden =
      false;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {
    console.error(
      "投稿保存エラー:",
      error
    );

    showStatus(
      `投稿の保存に失敗しました。
エラーコード：${error.code || "不明"}
詳細：${error.message || "不明"}`,
      "error-message"
    );

  } finally {
    finalSubmitButton.disabled =
      false;

    editButton.disabled =
      false;
  }
}


function startNewPost() {
  form.reset();

  initializeCategoryOptions();

  dateInput.value =
    getTodayString();

  pendingReportData =
    null;

  formArea.hidden =
    false;

  confirmationArea.hidden =
    true;

  completionArea.hidden =
    true;

  hideStatus();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  dateInput.focus();
}


form.addEventListener(
  "submit",
  event => {
    event.preventDefault();

    showConfirmation();
  }
);


editButton.addEventListener(
  "click",
  returnToForm
);


finalSubmitButton.addEventListener(
  "click",
  submitReport
);


newPostButton.addEventListener(
  "click",
  startNewPost
);



/*
 * 初期表示
 */
initializeCategoryOptions();

dateInput.value =
  getTodayString();
