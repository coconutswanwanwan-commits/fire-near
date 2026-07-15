import { db } from "./firebase.js";

import {
  collection,
  query,
  where,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const todayCount =
  document.getElementById("todayCount");

const todayCountMessage =
  document.getElementById("todayCountMessage");


// 日本の端末時刻をYYYY-MM-DD形式に変換
function getLocalDateString() {

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(today.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(today.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

}


// 本日の投稿件数を取得
async function loadTodayCount() {

  if (!todayCount) {
    return;
  }


  todayCount.textContent =
    "読み込み中...";


  try {

    const today =
      getLocalDateString();


    const reportsQuery =
      query(

        collection(db, "reports"),

        where("date", "==", today)

      );


    const snapshot =
      await getCountFromServer(
        reportsQuery
      );


    const count =
      snapshot.data().count;


    todayCount.textContent =
      `${count}件`;


    if (todayCountMessage) {

      if (count === 0) {

        todayCountMessage.textContent =
          "本日の投稿はまだありません。";

      } else {

        todayCountMessage.textContent =
          "本日、新しい事例が共有されています。";

      }

    }


  } catch (error) {

    console.error(
      "本日の投稿件数取得エラー:",
      error
    );


    todayCount.textContent =
      "取得失敗";


    if (todayCountMessage) {

      todayCountMessage.textContent =
        "ページを再読み込みしてください。";

    }

  }

}


loadTodayCount();
