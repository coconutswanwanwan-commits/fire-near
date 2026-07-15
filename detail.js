import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


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


let currentHelpfulCount = 0;


// HTMLに安全に文字を表示
function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// 改行を保ったまま安全に表示
function safeMultiline(value) {

  return escapeHtml(
    value || "未入力"
  );

}


// この端末で押したか確認
function getHelpfulStorageKey() {

  return `fireNearHelpful_${reportId}`;

}


function hasAlreadyPressedHelpful() {

  return localStorage.getItem(
    getHelpfulStorageKey()
  ) === "true";

}


// 参考になった表示を更新
function updateHelpfulDisplay() {

  helpfulCount.textContent =
    `参考になった：${currentHelpfulCount}件`;

}


// ボタン状態を更新
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


// 詳細データを読み込む
async function loadDetail() {

  if (!reportId) {

    detail.innerHTML = `
      <p>
        事例IDが指定されていません。
      </p>
    `;

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

      detail.innerHTML = `
        <p>
          指定された事例は存在しません。
        </p>
      `;

      return;

    }


    const data =
      reportSnapshot.data();


    currentHelpfulCount =
      Number(data.helpful || 0);


    detail.innerHTML = `

      <h2>
        ${escapeHtml(
          data.title || "タイトル未設定"
        )}
      </h2>


      <p>
        <strong>発生日：</strong>
        ${escapeHtml(
          data.date || "未設定"
        )}
      </p>


      <p>
        <strong>所属：</strong>
        ${escapeHtml(
          data.department || "未設定"
        )}
      </p>


      <p>
        <strong>業務区分：</strong>
        ${escapeHtml(
          data.category || "未設定"
        )}
      </p>


      <p>
        <strong>発生場所：</strong>
        ${escapeHtml(
          data.place || "未設定"
        )}
      </p>


      <p>
        <strong>レベル：</strong>
        ${escapeHtml(
          data.level || "未設定"
        )}
      </p>


      <hr>


      <div class="detail-section">

        <h3>
          発生状況
        </h3>

        <p class="detail-text">
          ${safeMultiline(
            data.situation
          )}
        </p>

      </div>


      <div class="detail-section">

        <h3>
          原因
        </h3>

        <p class="detail-text">
          ${safeMultiline(
            data.cause
          )}
        </p>

      </div>


      <div class="detail-section">

        <h3>
          改善策
        </h3>

        <p class="detail-text">
          ${safeMultiline(
            data.countermeasure
          )}
        </p>

      </div>


      <div class="detail-section">

        <h3>
          この事例から学んだこと
        </h3>

        <p class="detail-text">
          ${safeMultiline(
            data.lesson
          )}
        </p>

      </div>


      <div class="detail-section">

        <h3>
          タグ
        </h3>

        <p class="detail-text">
          ${safeMultiline(
            Array.isArray(data.tags)
              ? data.tags.join("、")
              : data.tags || "なし"
          )}
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


    detail.innerHTML = `
      <p>
        詳細情報の読み込みに失敗しました。
      </p>
    `;

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

  helpfulButton.textContent =
    "送信中...";

  helpfulMessage.textContent =
    "";


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

    helpfulButton.textContent =
      "👍 参考になった";


    helpfulMessage.textContent =
      "送信に失敗しました。もう一度お試しください。";

  }

}


helpfulButton.addEventListener(
  "click",
  sendHelpful
);


loadDetail();
