// ----- 定数・DOM取得 -----
const STORAGE_KEY = "pokeBoxData_v1";
let boxList = [];
let editingIndex = null;
let uniqueItems = new Set();

// モーダル（追加フォーム/詳細/ヘルプ/アイテムリスト）
const formModal = document.getElementById("form-modal");
const formModalClose = document.getElementById("form-modal-close");
const openAddBtn = document.getElementById("open-add-btn");
const helpBtn = document.getElementById("help-btn");
const helpModal = document.getElementById("help-modal");
const helpModalClose = document.getElementById("help-modal-close");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalBody = document.getElementById("modal-body");
const showItemListBtn = document.getElementById("show-itemlist-btn");
const itemlistModal = document.getElementById("itemlist-modal");
const itemlistModalClose = document.getElementById("itemlist-modal-close");
const itemlistBody = document.getElementById("itemlist-body");

// フォーム・部品
const form = document.getElementById("box-form");
const itemListDiv = document.getElementById("item-list");
const addItemBtn = document.getElementById("add-item-btn");
const saleSelect = form.elements["is_sale"];
const saleDetail = document.getElementById("sale-detail");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const todayBtn = document.getElementById("today-btn");

// 一覧表示・入出力
const boxListDiv = document.getElementById("box-list");
const exportBtn = document.getElementById("export-btn");
const importFile = document.getElementById("import-file");

// ----- 通知 -----
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

// ----- アイテム入力管理 -----
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
  // プレビュー画像
  const imgInput = div.querySelector('input[type="url"]');
  const imgPrev = div.querySelector(".item-img-preview");
  imgInput.addEventListener("input", (e) => {
    imgPrev.src = imgInput.value;
    imgPrev.style.display = imgInput.value ? "" : "none";
  });
  // 削除
  div.querySelector(".item-remove-btn").onclick = () => {
    div.remove();
  };
  itemListDiv.appendChild(div);
}
addItemBtn.onclick = () => addItemInput();

// ----- セール詳細UI制御 -----
saleSelect.onchange = () => {
  saleDetail.style.display = saleSelect.value === "yes" ? "" : "none";
};

// ----- フォームリセット -----
function resetForm() {
  form.reset();
  renderItemInputs([]);
  saleDetail.style.display = "none";
  editingIndex = null;
  saveBtn.textContent = "登録";
}
resetBtn.onclick = (e) => {
  e.preventDefault();
  resetForm();
};

// ----- 今日の日付ボタン -----
todayBtn.onclick = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  form.elements["record_date"].value = `${y}-${m}-${d}`;
};

// ----- アイテム名ユニークリスト化 -----
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

// ----- ボックスデータ構築 -----
function getFormData() {
  // アイテム
  const itemRows = itemListDiv.querySelectorAll(".item-entry");
  const items = [];
  for (const row of itemRows) {
    const [nameI, countI, urlI] = row.querySelectorAll("input");
    if (!nameI.value.trim() || !countI.value) return null;
    items.push({
      name: nameI.value.trim(),
      count: Number(countI.value),
      image_url: urlI.value.trim(),
    });
  }
  if (items.length === 0) return null;
  // 値段
  const poke_coins = form.elements["poke_coins"].value
    ? Number(form.elements["poke_coins"].value)
    : null;
  const yen = form.elements["yen"].value
    ? Number(form.elements["yen"].value)
    : null;
  // セール
  let sale = { is_sale: false, percent_off: null, original_price: null };
  if (saleSelect.value === "yes") {
    sale.is_sale = true;
    sale.percent_off = Number(form.elements["percent_off"].value) || null;
    sale.original_price = Number(form.elements["original_price"].value) || null;
  }
  return {
    id:
      editingIndex !== null
        ? boxList[editingIndex].id
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: form.elements["name"].value.trim(),
    price: { poke_coins, yen },
    items,
    record_date: form.elements["record_date"].value,
    event: form.elements["event"].value.trim(),
    sale,
    limit: form.elements["limit"].value,
    place: form.elements["place"].value,
    note: form.elements["note"].value.trim(),
  };
}

// ----- 保存（追加/編集） -----
form.onsubmit = (e) => {
  e.preventDefault();
  const data = getFormData();
  if (!data) {
    notify("全ての必須項目を正しく入力してください。");
    return;
  }
  if (editingIndex !== null) {
    boxList[editingIndex] = data;
    notify("ボックス情報を更新しました！");
  } else {
    boxList.unshift(data);
    notify("ボックスを追加しました！");
  }
  saveLocal();
  updateItemList();
  renderBoxList();
  resetForm();
  formModal.classList.remove("active");
};

// ----- 一覧表示 -----
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
    // ボックス名
    const title = document.createElement("span");
    title.className = "box-title";
    title.textContent = box.name;
    title.tabIndex = 0;
    title.onclick = () => showDetailModal(box);
    card.appendChild(title);
    // ボタン
    const btns = document.createElement("div");
    btns.className = "box-btns";
    // 編集
    const editBtn = document.createElement("button");
    editBtn.className = "box-btn edit";
    editBtn.innerHTML = "編集";
    editBtn.onclick = () => loadToForm(i);
    btns.appendChild(editBtn);
    // 削除
    const delBtn = document.createElement("button");
    delBtn.className = "box-btn delete";
    delBtn.innerHTML = "削除";
    delBtn.onclick = () => {
      if (confirm(`「${box.name}」を削除しますか？`)) {
        boxList.splice(i, 1);
        saveLocal();
        updateItemList();
        renderBoxList();
        notify("削除しました");
      }
    };
    btns.appendChild(delBtn);
    card.appendChild(btns);
    boxListDiv.appendChild(card);
  }
}

// ----- 詳細モーダル -----
function showDetailModal(box) {
  let html = `
    <h3>${box.name}</h3>
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
  `;
  modalBody.innerHTML = html;
  modal.classList.add("active");
}
modalClose.onclick = () => modal.classList.remove("active");
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.remove("active");
};

// ----- 編集フォームにデータ反映 -----
function loadToForm(idx) {
  const box = boxList[idx];
  form.elements["name"].value = box.name;
  form.elements["poke_coins"].value = box.price.poke_coins || "";
  form.elements["yen"].value = box.price.yen || "";
  renderItemInputs(box.items);
  form.elements["record_date"].value = box.record_date;
  form.elements["event"].value = box.event || "";
  form.elements["is_sale"].value = box.sale && box.sale.is_sale ? "yes" : "no";
  saleDetail.style.display =
    form.elements["is_sale"].value === "yes" ? "" : "none";
  form.elements["percent_off"].value = box.sale.percent_off || "";
  form.elements["original_price"].value = box.sale.original_price || "";
  form.elements["limit"].value = box.limit || "制限なし";
  form.elements["place"].value = box.place || "";
  form.elements["note"].value = box.note || "";
  editingIndex = idx;
  saveBtn.textContent = "更新";
  formModal.classList.add("active");
}

// ----- JSONエクスポート -----
exportBtn.onclick = () => {
  if (!boxList.length) {
    notify("データがありません");
    return;
  }
  const data = JSON.stringify(boxList, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "poke_box_data.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

// ----- JSONインポート -----
importFile.onchange = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const arr = JSON.parse(ev.target.result);
      if (!Array.isArray(arr)) throw 1;
      if (!arr.every((obj) => obj && obj.name && obj.items)) throw 2;
      boxList = arr;
      saveLocal();
      updateItemList();
      renderBoxList();
      notify("インポートしました！");
    } catch (e) {
      notify("読込に失敗しました");
    }
    importFile.value = "";
  };
  reader.readAsText(file, "utf-8");
};

// ----- localStorage保存 -----
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

// ----- モーダル（追加フォーム）制御 -----
openAddBtn.onclick = () => {
  resetForm();
  formModal.classList.add("active");
};
formModalClose.onclick = () => {
  formModal.classList.remove("active");
};
formModal.onclick = (e) => {
  if (e.target === formModal) formModal.classList.remove("active");
};

// ----- ヘルプモーダル -----
helpBtn.onclick = () => helpModal.classList.add("active");
helpModalClose.onclick = () => helpModal.classList.remove("active");
helpModal.onclick = (e) => {
  if (e.target === helpModal) helpModal.classList.remove("active");
};

// ----- アイテムリストモーダル -----
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

// ----- 起動時 -----
window.onload = () => {
  loadLocal();
  updateItemList();
  renderBoxList();
  resetForm();
};
