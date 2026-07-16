// Fire Near 業務区分マスタ
// 業務区分を追加・削除・並べ替えする場合は、
// 原則としてこのファイルだけを変更します。

export const CATEGORIES = [
  "予防",
  "火災",
  "救急",
  "救助",
  "警防",
  "訓練",
  "通信指令",
  "総務",
  "その他"
];


/**
 * select要素へ業務区分を設定します。
 *
 * @param {HTMLSelectElement} selectElement
 * @param {Object} options
 * @param {string} options.firstOptionText
 * @param {string} options.selectedValue
 * @param {boolean} options.preserveUnknownValue
 */
export function setCategoryOptions(
  selectElement,
  {
    firstOptionText = "選択してください",
    selectedValue = "",
    preserveUnknownValue = true
  } = {}
) {
  if (!(selectElement instanceof HTMLSelectElement)) {
    console.warn(
      "業務区分を設定するselect要素が見つかりません。"
    );

    return;
  }

  const normalizedSelectedValue =
    String(selectedValue ?? "").trim();

  selectElement.innerHTML = "";

  const firstOption =
    document.createElement("option");

  firstOption.value = "";
  firstOption.textContent =
    firstOptionText;

  selectElement.appendChild(
    firstOption
  );

  CATEGORIES.forEach(
    category => {
      const option =
        document.createElement("option");

      option.value =
        category;

      option.textContent =
        category;

      selectElement.appendChild(
        option
      );
    }
  );

  /*
   * 過去データに現在のマスタにはない業務区分が
   * 保存されている場合、その値も表示できるようにします。
   *
   * 例：
   * 査察、消火、指令など
   */
  if (
    preserveUnknownValue &&
    normalizedSelectedValue &&
    !CATEGORIES.includes(
      normalizedSelectedValue
    )
  ) {
    const legacyOption =
      document.createElement("option");

    legacyOption.value =
      normalizedSelectedValue;

    legacyOption.textContent =
      `${normalizedSelectedValue}（旧区分）`;

    selectElement.appendChild(
      legacyOption
    );
  }

  selectElement.value =
    normalizedSelectedValue;
}


/**
 * 要素IDを指定して業務区分を設定します。
 *
 * @param {string} elementId
 * @param {Object} options
 */
export function setCategoryOptionsById(
  elementId,
  options = {}
) {
  const selectElement =
    document.getElementById(
      elementId
    );

  setCategoryOptions(
    selectElement,
    options
  );
}
