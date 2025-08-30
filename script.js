// ---- ストレージ＆データ ----
const STORAGE_KEY = "pokeBoxData_v2";
let boxList = [];
let uniqueItems = new Set();
let selectedIndex = null;
let editing = false; // trueならフォームは編集、falseなら追加

// ---- DOM ----
const boxListDiv = document.getElementById("box-list");
const contentInner = document.getElementById("content-inner");
const openAddBtn = document.getElementById("open-add-btn");

// モーダル
const helpBtn = document.getElementById("help-btn");
const helpModal = document.getElementById("help-modal");
const helpModalClose = document.getElementById("help-modal-close");
const showItemListBtn = document.getElementById("show-itemlist-btn");
const itemlistModal = document.getElementById("itemlist-modal");
const itemlistModalClose = document.getElementById("itemlist-modal-close");
const itemlistBody = document.getElementById("itemlist-body");

// ---- 通知 ----
function notify(msg) {
  let n = document.getElementById("notify");
  if (!n) {
    n = document.createElement("div");
    n.id = "notify";
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.className = "show";
  setTimeout(() => {
    n.className = "";
  }, 1800);
}

// ---- 一覧表示 ----
function renderBoxList() {
  boxListDiv.innerHTML = "";
  if (boxList.length === 0) {
    boxListDiv.innerHTML =
      '<div style="color:#aaa;font-size:0.99em;padding:1em;">まだ記録はありません</div>';
    return;
  }
  for (let i = 0; i < boxList.length; ++i) {
    const box = boxList[i];
    const card = document.createElement("div");
    card.className = "box-card";
    // タイトル（クリックで詳細）
    const title = document.createElement("span");
    title.className = "box-title";
    title.textContent = box.name;
    title.tabIndex = 0;
    title.onclick = () => {
      selectedIndex = i;
      editing = false;
      renderContentArea();
    };
    card.appendChild(title);

    // ボタン
    const btns = document.createElement("div");
    btns.className = "box-btns";
    // 編集
    const editBtn = document.createElement("button");
    editBtn.className = "box-btn edit";
    editBtn.innerHTML = "編集";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      selectedIndex = i;
      editing = true;
      renderContentArea();
    };
    btns.appendChild(editBtn);
    // 削除
    const delBtn = document.createElement("button");
    delBtn.className = "box-btn delete";
    delBtn.innerHTML = "削除";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`「${box.name}」を削除しますか？`)) {
        boxList.splice(i, 1);
        saveLocal();
        updateItemList();
        renderBoxList();
        // 削除時、右側は何も選択されていない状態に
        selectedIndex = null;
        editing = false;
        renderContentArea();
        notify("削除しました");
      }
    };
    btns.appendChild(delBtn);
    card.appendChild(btns);
    boxListDiv.appendChild(card);
  }
}

// ---- 右側メイン：詳細/編集/追加 ----
function renderContentArea() {
  contentInner.innerHTML = "";
  if (editing) {
    // 編集
    renderBoxForm(selectedIndex);
    return;
  }
  if (selectedIndex === null) {
    // 何も選択なし→ウェルカムカード
    contentInner.innerHTML = `<div class="card" style="text-align:center;">
      <h2>ボックスを選択または追加してください</h2>
      <p>左の一覧から選択 or 「＋追加」ボタンから新規登録できます。</p>
    </div>`;
    return;
  }
  // 詳細カード
  const box = boxList[selectedIndex];
  let html = `<div class="card">
    <h2>${box.name}</h2>
    <div style="margin-bottom:0.8em;">
      <b>値段：</b>${
        box.price.poke_coins ? box.price.poke_coins + "コイン" : ""
      }
      ${
        box.price.yen
          ? (box.price.poke_coins ? " / " : "") + box.price.yen + "円"
          : ""
      }
    </div>
    <div style="margin-bottom:0.7em;">
      <b>内容：</b>
      <ul style="margin:0; padding-left:1.3em;">${box.items
        .map(
          (it) =>
            `<li>
            ${
              it.image_url
                ? `<img src="${it.image_url}" class="item-img-preview" style="vertical-align:middle;">`
                : ""
            }
            ${it.name} ×${it.count}
          </li>`
        )
        .join("")}</ul>
    </div>
    <div><b>記録日：</b>${box.record_date || "-"}</div>
    <div><b>イベント名：</b>${box.event || "-"}</div>
    <div><b>セール：</b>${
      box.sale && box.sale.is_sale
        ? `はい (${box.sale.percent_off || "-"}%OFF / 元値: ${
            box.sale.original_price || "-"
          })`
        : "いいえ"
    }</div>
    <div><b>購入回数制限：</b>${box.limit || "-"}</div>
    <div><b>販売場所：</b>${box.place || "-"}</div>
    <div><b>メモ：</b>${box.note || "-"}</div>
    <div style="color:#aaa; margin-top:0.9em; font-size:0.95em;">ID: ${
      box.id
    }</div>
    <div style="margin-top:1.4em; text-align:right;">
      <button class="box-btn edit" onclick="editSelectedBox()">編集</button>
    </div>
  </div>`;
  contentInner.innerHTML = html;
}
// 編集ボタンから呼び出される用（グローバル）
window.editSelectedBox = function () {
  editing = true;
  renderContentArea();
};

// ---- 追加/編集フォーム ----
function renderBoxForm(idx = null) {
  // 初期値
  let box = {
    name: "",
    price: { poke_coins: "", yen: "" },
    items: [],
    record_date: "",
    event: "",
    sale: { is_sale: false },
    limit: "制限なし",
    place: "ゲーム内",
    note: "",
  };
  let isEdit = false;
  if (typeof idx === "number" && boxList[idx]) {
    box = JSON.parse(JSON.stringify(boxList[idx])); // deep copy
    isEdit = true;
  }
  // フォームHTML
  contentInner.innerHTML = `
  <form id="box-form" class="card" autocomplete="off">
    <h2>${isEdit ? "ボックス編集" : "ボックス追加"}</h2>
    <div class="form-row">
      <label>★ボックス名
        <input type="text" name="name" required maxlength="30" value="${
          box.name
        }">
      </label>
    </div>
    <div class="form-row">
      <label>★値段
        <input type="number" name="poke_coins" placeholder="ポケコイン" min="0" value="${
          box.price.poke_coins || ""
        }" style="width:90px;">
        <span>or</span>
        <input type="number" name="yen" placeholder="円" min="0" value="${
          box.price.yen || ""
        }" style="width:90px;">
      </label>
    </div>
    <div class="form-row item-list-row">
      <label>★内容</label>
      <button type="button" id="add-item-btn">＋アイテム追加</button>
      <div id="item-list"></div>
    </div>
    <div class="form-row">
      <label>★記録日
        <input type="date" name="record_date" required value="${
          box.record_date
        }">
        <button type="button" id="today-btn">今日</button>
      </label>
    </div>
    <div class="form-row">
      <label>イベント名
        <input type="text" name="event" maxlength="30" value="${
          box.event || ""
        }">
      </label>
    </div>
    <div class="form-row">
      <label>★セール
        <select name="is_sale" required>
          <option value="no"${
            !box.sale.is_sale ? " selected" : ""
          }>いいえ</option>
          <option value="yes"${
            box.sale.is_sale ? " selected" : ""
          }>はい</option>
        </select>
      </label>
    </div>
    <div class="form-row" id="sale-detail" style="display:${
      box.sale.is_sale ? "" : "none"
    };">
      <label>
        割引率(%)<input type="number" name="percent_off" min="1" max="99" style="width:60px;" value="${
          box.sale.percent_off || ""
        }">
      </label>
      <label>
        <span>元値</span><input type="number" name="original_price" min="1" style="width:80px;" value="${
          box.sale.original_price || ""
        }">
      </label>
    </div>
    <div class="form-row">
      <label>★購入回数制限
        <select name="limit" required>
          <option value="制限なし"${
            box.limit === "制限なし" ? " selected" : ""
          }>制限なし</option>
          ${[...Array(10)]
            .map(
              (_, i) =>
                `<option value="${i + 1}回限定"${
                  box.limit === `${i + 1}回限定` ? " selected" : ""
                }>${i + 1}回限定</option>`
            )
            .join("")}
        </select>
      </label>
    </div>
    <div class="form-row">
      <label>★販売場所
        <select name="place" required>
          <option value="ゲーム内"${
            box.place === "ゲーム内" ? " selected" : ""
          }>ゲーム内</option>
          <option value="Webストア"${
            box.place === "Webストア" ? " selected" : ""
          }>Webストア</option>
          <option value="その他"${
            box.place === "その他" ? " selected" : ""
          }>その他</option>
        </select>
      </label>
    </div>
    <div class="form-row">
      <label>★自由メモ
        <input type="text" name="note" maxlength="100" placeholder="自由メモ" value="${
          box.note || ""
        }">
      </label>
    </div>
    <div class="form-row">
      <button type="submit" id="save-btn">${isEdit ? "更新" : "登録"}</button>
      <button type="button" id="reset-btn">リセット</button>
      <button type="button" id="cancel-btn">キャンセル</button>
    </div>
  </form>`;
  // アイテム
  const itemListDiv = document.getElementById("item-list");
  function renderItemInputs(items = []) {
    itemListDiv.innerHTML = "";
    items.forEach((it, idx) => addItemInput(it));
  }
  function addItemInput(item = { name: "", count: "", image_url: "" }) {
    const div = document.createElement("div");
    div.className = "item-entry";
    div.innerHTML = `
      <input type="text" placeholder="アイテム名" value="${
        item.name || ""
      }" required maxlength="25">
      <input type="number" placeholder="個数" min="1" value="${
        item.count || ""
      }" required style="width:58px;">
      <input type="url" placeholder="画像URL" value="${
        item.image_url || ""
      }" style="width:210px;">
      <img class="item-img-preview" src="${
        item.image_url || ""
      }" onerror="this.src=''" ${item.image_url ? "" : 'style="display:none"'} >
      <button type="button" class="item-remove-btn" title="削除">✕</button>
    `;
    const imgInput = div.querySelector('input[type="url"]');
    const imgPrev = div.querySelector(".item-img-preview");
    imgInput.addEventListener("input", (e) => {
      imgPrev.src = imgInput.value;
      imgPrev.style.display = imgInput.value ? "" : "none";
    });
    div.querySelector(".item-remove-btn").onclick = () => {
      div.remove();
    };
    itemListDiv.appendChild(div);
  }
  document.getElementById("add-item-btn").onclick = () => addItemInput();
  renderItemInputs(box.items);

  // セール詳細UI制御
  const saleSelect = document.querySelector('select[name="is_sale"]');
  const saleDetail = document.getElementById("sale-detail");
  saleSelect.onchange = () => {
    saleDetail.style.display = saleSelect.value === "yes" ? "" : "none";
  };

  // 今日ボタン
  document.getElementById("today-btn").onclick = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    document.querySelector(
      'input[name="record_date"]'
    ).value = `${y}-${m}-${d}`;
  };
  // リセット・キャンセル
  document.getElementById("reset-btn").onclick = (e) => {
    e.preventDefault();
    renderBoxForm(isEdit ? idx : null);
  };
  document.getElementById("cancel-btn").onclick = (e) => {
    e.preventDefault();
    editing = false;
    renderContentArea();
  };

  // 保存
  document.getElementById("box-form").onsubmit = function (e) {
    e.preventDefault();
    // アイテム
    const itemRows = itemListDiv.querySelectorAll(".item-entry");
    const items = [];
    for (const row of itemRows) {
      const [nameI, countI, urlI] = row.querySelectorAll("input");
      if (!nameI.value.trim() || !countI.value)
        return notify("アイテム名・個数を全て入力してください");
      items.push({
        name: nameI.value.trim(),
        count: Number(countI.value),
        image_url: urlI.value.trim(),
      });
    }
    if (items.length === 0) return notify("アイテムを1つ以上入力してください");
    // 値段
    const poke_coins = this.elements["poke_coins"].value
      ? Number(this.elements["poke_coins"].value)
      : null;
    const yen = this.elements["yen"].value
      ? Number(this.elements["yen"].value)
      : null;
    let sale = { is_sale: false, percent_off: null, original_price: null };
    if (saleSelect.value === "yes") {
      sale.is_sale = true;
      sale.percent_off = Number(this.elements["percent_off"].value) || null;
      sale.original_price =
        Number(this.elements["original_price"].value) || null;
    }
    const data = {
      id: isEdit
        ? boxList[idx].id
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: this.elements["name"].value.trim(),
      price: { poke_coins, yen },
      items,
      record_date: this.elements["record_date"].value,
      event: this.elements["event"].value.trim(),
      sale,
      limit: this.elements["limit"].value,
      place: this.elements["place"].value,
      note: this.elements["note"].value.trim(),
    };
    if (isEdit) {
      boxList[idx] = data;
      notify("ボックス情報を更新しました！");
      selectedIndex = idx;
    } else {
      boxList.unshift(data);
      notify("ボックスを追加しました！");
      selectedIndex = 0;
    }
    saveLocal();
    updateItemList();
    renderBoxList();
    editing = false;
    renderContentArea();
  };
}

// ---- 追加ボタン ----
openAddBtn.onclick = () => {
  editing = true;
  selectedIndex = null;
  renderContentArea();
};

// ---- アイテム名ユニークリスト化 -----
function updateItemList() {
  uniqueItems = new Set();
  boxList.forEach((box) => {
    if (box.items && Array.isArray(box.items)) {
      box.items.forEach((item) => {
        const name = (item.name || "").trim();
        if (name) uniqueItems.add(name);
      });
    }
  });
}

// ---- アイテム一覧モーダル ----
showItemListBtn.onclick = () => {
  updateItemList();
  if (!uniqueItems.size) {
    itemlistBody.innerHTML =
      '<div style="color:#888; margin:1em 0;">まだアイテムが登録されていません</div>';
  } else {
    let html = "<ul>";
    Array.from(uniqueItems)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .forEach((name) => {
        html += `<li>${name}</li>`;
      });
    html += "</ul>";
    itemlistBody.innerHTML = html;
  }
  itemlistModal.classList.add("active");
};
itemlistModalClose.onclick = () => itemlistModal.classList.remove("active");
itemlistModal.onclick = (e) => {
  if (e.target === itemlistModal) itemlistModal.classList.remove("active");
};

// ---- ヘルプ ----
helpBtn.onclick = () => helpModal.classList.add("active");
helpModalClose.onclick = () => helpModal.classList.remove("active");
helpModal.onclick = (e) => {
  if (e.target === helpModal) helpModal.classList.remove("active");
};

// ---- localStorage保存/読込 ----
function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boxList));
}
function loadLocal() {
  const d = localStorage.getItem(STORAGE_KEY);
  if (d) {
    try {
      boxList = JSON.parse(d) || [];
    } catch (e) {
      boxList = [];
    }
  }
}

// -------- PC/スマホレイアウト切替 --------
const toPC = document.getElementById("to-pc");
const toSP = document.getElementById("to-sp");
function setLayout(mode) {
  document.body.classList.remove("body-pc", "body-sp");
  if (mode === "pc") {
    document.body.classList.add("body-pc");
  }
  if (mode === "sp") {
    document.body.classList.add("body-sp");
  }
  toPC.classList.toggle("active", mode === "pc");
  toSP.classList.toggle("active", mode === "sp");
  localStorage.setItem("pokeBoxLayout", mode);
}
toPC.onclick = () => setLayout("pc");
toSP.onclick = () => setLayout("sp");
window.addEventListener("DOMContentLoaded", () => {
  let mode = localStorage.getItem("pokeBoxLayout");
  if (!mode) {
    mode = window.innerWidth <= 600 ? "sp" : "pc";
  }
  setLayout(mode);
});

// ---- 起動 ----
window.onload = () => {
  loadLocal();
  updateItemList();
  renderBoxList();
  renderContentArea();
};
