import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const loadingMessage =
  document.getElementById("loadingMessage");

const statisticsContent =
  document.getElementById("statisticsContent");

const totalCount =
  document.getElementById("totalCount");

const monthlyCount =
  document.getElementById("monthlyCount");

const departmentStatistics =
  document.getElementById("departmentStatistics");

const categoryStatistics =
  document.getElementById("categoryStatistics");


const levelElements = {

  "レベル1（軽微）":
    document.getElementById("level1Count"),

  "レベル2（注意）":
    document.getElementById("level2Count"),

  "レベル3（重大）":
    document.getElementById("level3Count"),

  "レベル4（事故寸前）":
    document.getElementById("level4Count")

};


const departments = [

  "消防本部",

  "消防署",

  "北分署",

  "南分署"

];


const categories = [

  "予防",

  "査察",

  "救急",

  "救助",

  "警防",

  "消火",

  "通信指令",

  "指令",

  "総務",

  "その他"

];


function escapeHtml(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


function countByField(reports, fieldName, options) {

  const result = {};


  options.forEach((option) => {

    result[option] = 0;

  });


  reports.forEach((report) => {

    const value = report[fieldName];


    if (value && Object.hasOwn(result, value)) {

      result[value] += 1;

    }

  });


  return result;

}


function createStatisticsRows(countData) {

  const values =
    Object.values(countData);

  const maximum =
    Math.max(...values, 1);


  return Object.entries(countData)

    .map(([label, count]) => {

      const percentage =
        count === 0
          ? 0
          : Math.max((count / maximum) * 100, 4);


      return `
        <div class="statistics-row">

          <div class="statistics-label">

            <span>
              ${escapeHtml(label)}
            </span>

            <span>
              ${count}件
            </span>

          </div>

          <div class="bar-background">

            <div
              class="bar"
              style="width:${percentage}%"
            >
            </div>

          </div>

        </div>
      `;

    })

    .join("");

}


function getCurrentMonthCount(reports) {

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(today.getMonth() + 1)
      .padStart(2, "0");

  const currentMonth =
    `${year}-${month}`;


  return reports.filter((report) => {

    return String(report.date || "")
      .startsWith(currentMonth);

  }).length;

}


function updateLevelStatistics(reports) {

  const levelCounts = {

    "レベル1（軽微）": 0,

    "レベル2（注意）": 0,

    "レベル3（重大）": 0,

    "レベル4（事故寸前）": 0

  };


  reports.forEach((report) => {

    if (
      report.level &&
      Object.hasOwn(levelCounts, report.level)
    ) {

      levelCounts[report.level] += 1;

    }

  });


  Object.entries(levelCounts)
    .forEach(([level, count]) => {

      const element =
        levelElements[level];


      if (element) {

        element.textContent =
          `${count}件`;

      }

    });

}


async function loadStatistics() {

  try {

    const snapshot =
      await getDocs(
        collection(db, "reports")
      );


    const reports =
      snapshot.docs.map((document) => ({

        id: document.id,

        ...document.data()

      }));


    totalCount.textContent =
      reports.length;


    monthlyCount.textContent =
      getCurrentMonthCount(reports);


    updateLevelStatistics(reports);


    const departmentCounts =
      countByField(
        reports,
        "department",
        departments
      );


    const categoryCounts =
      countByField(
        reports,
        "category",
        categories
      );


    departmentStatistics.innerHTML =
      createStatisticsRows(
        departmentCounts
      );


    categoryStatistics.innerHTML =
      createStatisticsRows(
        categoryCounts
      );


    loadingMessage.hidden = true;

    statisticsContent.hidden = false;


  } catch (error) {

    console.error(
      "統計読み込みエラー:",
      error
    );


    loadingMessage.className =
      "error-message";


    loadingMessage.innerHTML = `
      統計情報の読み込みに失敗しました。<br>
      ページを再読み込みしてください。
    `;

  }

}


loadStatistics();
