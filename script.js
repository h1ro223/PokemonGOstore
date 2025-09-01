const STORAGE_KEY = "pokeBoxData_v4";
let boxList = [];
let uniqueItems = new Set();
let selectedIndex = null;
let modalType = null;
let editingIdx = null;

const boxListDiv = document.getElementById('box-list');
const contentInner = document.getElementById('content-inner');
const fabAdd = document.getElementById('fab-add');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalWindow = document.getElementById('modal-window');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const helpModalClose = document.getElementById('help-modal-close');
const showItemListBtn = document.getElementById('show-itemlist-btn');
const itemlistModal = document.getElementById('itemlist-modal');
const itemlistModalClose = document.getElementById('itemlist-modal-close');
const itemlistBody = document.getElementById('itemlist-body');
const notifyDiv = document.getElementById('notify');
const jsonExport = document.getElementById('json-export');
const jsonImport = document.getElementById('json-import');
const jsonImportBtn = document.getElementById('json-import-btn');

function notify(msg) {
  notifyDiv.textContent = msg;
  notifyDiv.classList.add('show');
  setTimeout(() => notifyDiv.classList.remove('show'), 2100);
}

function renderBoxList() {
  boxListDiv.innerHTML = '';
  if (boxList.length === 0) {
    boxListDiv.innerHTML = '<div style="color:#aaa;font-size:1em;padding:1em 0.2em;">まだ記録はありません</div>';
    return;
  }
  for (let i = 0; i < boxList.length; ++i) {
    const box = boxList[i];
    const card = document.createElement('div');
    card.className = 'box-card' + (selectedIndex === i ? ' selected' : '');
    const title = document.createElement('span');
    title.className = 'box-title';
    title.textContent = box.name;
    title.tabIndex = 0;
    title.onclick = () => { openDetailModal(i); };
    card.appendChild(title);

    const btns = document.createElement('div');
    btns.className = 'box-btns';
    const editBtn = document.createElement('button');
    editBtn.className = 'box-btn edit';
    editBtn.innerHTML = '編集';
    editBtn.onclick = (e) => { e.stopPropagation(); openFormModal(i); };
    btns.appendChild(editBtn);
    const delBtn = document.createElement('button');
    delBtn.className = 'box-btn delete';
    delBtn.innerHTML = '削除';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`「${box.name}」を削除しますか？`)) {
        boxList.splice(i, 1);
        saveLocal();
        updateItemList();
        renderBoxList();
        selectedIndex = null;
        notify("削除しました");
        closeModal();
        renderDefaultContent();
      }
    };
    btns.appendChild(delBtn);
    card.appendChild(btns);
    boxListDiv.appendChild(card);
  }
}

function renderDefaultContent() {
  contentInner.innerHTML = `
    <div class="card" style="text-align:center; margin-top:2.7em;">
      <h2>Pokémon GO<br>ボックス記録サイト</h2>
      <p>左のリストからBOXを選ぶか<br>右下の<b>＋</b>ボタンで新規追加！</p>
      <p style="font-size:1.1em; color:#ab8cf2; margin-top:2em;">
        <span style="font-size:1.3em;">🎁</span>
      </p>
    </div>`;
}

function openDetailModal(idx) {
  selectedIndex = idx;
  modalType = "detail";
  editingIdx = null;
  const box = boxList[idx];
  let html = `
    <div class="modal-card">
      <h2 style="margin-bottom:0.6em;">${box.name}</h2>
      <div style="font-size:1.11em; margin-bottom:0.5em;">
        <b>値段：</b>
        <span style="color:#06d6a0;">${box.price.poke_coins ? box.price.poke_coins + "コイン" : ""}
        ${box.price.yen ? (box.price.poke_coins ? " / " : "") + box.price.yen + "円" : ""}</span>
      </div>
      <div style="margin-bottom:0.4em;">
        <b>内容：</b>
        <div class="items-grid">
          ${box.items.map(it => `
            <div class="item-detail-card">
              ${it.image_url ? `<img src="${it.image_url}" alt="item">` : `<img src="https://raw.githubusercontent.com/h1ro223/pokebox-assets/main/ball.png" style="opacity:0.3;">`}
              <div class="item-detail-meta">
                <span class="item-detail-name">${it.name}</span>
                <span class="item-detail-count">×${it.count}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="margin-top:0.6em; font-size:1em;">
        <b>記録日：</b>${box.record_date || '-'}<br>
        <b>イベント名：</b>${box.event || '-'}<br>
        <b>セール：</b>${box.sale && box.sale.is_sale ? `はい <span style="color:#f72585;">(${box.sale.percent_off || "-"}%OFF/元値: ${box.sale.original_price || "-"})</span>` : 'いいえ'}<br>
        <b>購入回数制限：</b>${box.limit || '-'}<br>
        <b>販売場所：</b>${box.place || '-'}<br>
        <b>メモ：</b>${box.note || '-'}
      </div>
      <div style="text-align:right; margin-top:1.7em;">
        <button class="box-btn edit" id="modal-edit-btn">編集</button>
        <button class="box-btn delete" id="modal-close-btn">閉じる</button>
      </div>
    </div>
  `;
  showModal(html);

  document.getElementById('modal-edit-btn').onclick = () => { closeModal(); setTimeout(()=>openFormModal(idx), 240);}
  document.getElementById('modal-close-btn').onclick = () => closeModal();
}
function closeModal() {
  modalBackdrop.classList.remove('active');
  modalWindow.classList.remove('active');
  modalWindow.innerHTML = '';
  modalType = null;
  editingIdx = null;
}
function showModal(html) {
  modalWindow.innerHTML = html;
  modalBackdrop.classList.add('active');
  setTimeout(()=>{ modalWindow.classList.add('active'); }, 25);
}
modalBackdrop.onclick = closeModal;

fabAdd.onclick = () => { openFormModal(); };
function openFormModal(idx = null) {
  modalType = "form";
  editingIdx = idx;
  let box = {
    name: "", price: { poke_coins: "", yen: "" }, items: [],
    record_date: "", event: "", sale: { is_sale:false }, limit: "制限なし", place: "ゲーム内", note:""
  };
  let isEdit = false;
  if (typeof idx === "number" && boxList[idx]) {
    box = JSON.parse(JSON.stringify(boxList[idx]));
    isEdit = true;
  }
  let formHtml = `
    <form id="box-form" autocomplete="off" class="modal-card">
      <h2 style="margin-bottom:0.85em;">${isEdit ? "ボックス編集" : "ボックス追加"}</h2>
      <div class="form-row">
        <label>★ボックス名
          <input type="text" name="name" required maxlength="30" value="${box.name}">
        </label>
      </div>
      <div class="form-row">
        <label>★値段
          <input type="number" name="poke_coins" placeholder="ポケコイン" min="0" value="${box.price.poke_coins||''}" style="width:90px;">
          <span>or</span>
          <input type="number" name="yen" placeholder="円" min="0" value="${box.price.yen||''}" style="width:90px;">
        </label>
      </div>
      <div class="form-row item-list-row">
        <label>★内容</label>
        <button type="button" id="add-item-btn">＋アイテム追加</button>
        <div id="item-list"></div>
      </div>
      <div class="form-row">
        <label>★記録日
          <input type="date" name="record_date" required value="${box.record_date}">
          <button type="button" id="today-btn">今日</button>
        </label>
      </div>
      <div class="form-row">
        <label>イベント名
          <input type="text" name="event" maxlength="30" value="${box.event||''}">
        </label>
      </div>
      <div class="form-row">
        <label>★セール
          <select name="is_sale" required>
            <option value="no"${!box.sale.is_sale?' selected':''}>いいえ</option>
            <option value="yes"${box.sale.is_sale?' selected':''}>はい</option>
          </select>
        </label>
      </div>
      <div class="form-row" id="sale-detail" style="display:${box.sale.is_sale?'':'none'};">
        <label>
          割引率(%)<input type="number" name="percent_off" min="1" max="99" style="width:60px;" value="${box.sale.percent_off||''}">
        </label>
        <label>
          <span>元値</span><input type="number" name="original_price" min="1" style="width:80px;" value="${box.sale.original_price||''}">
        </label>
      </div>
      <div class="form-row">
        <label>★購入回数制限
          <select name="limit" required>
            <option value="制限なし"${box.limit==='制限なし'?' selected':''}>制限なし</option>
            ${[...Array(10)].map((_,i)=>`<option value="${i+1}回限定"${box.limit===`${i+1}回限定`?' selected':''}>${i+1}回限定</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>★販売場所
          <select name="place" required>
            <option value="ゲーム内"${box.place==='ゲーム内'?' selected':''}>ゲーム内</option>
            <option value="Webストア"${box.place==='Webストア'?' selected':''}>Webストア</option>
            <option value="その他"${box.place==='その他'?' selected':''}>その他</option>
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>★自由メモ
          <input type="text" name="note" maxlength="100" placeholder="自由メモ" value="${box.note||''}">
        </label>
      </div>
      <div class="form-row" style="margin-top:1.1em;gap:1.3em;">
        <button type="submit" id="save-btn">${isEdit?"更新":"登録"}</button>
        <button type="button" id="reset-btn">リセット</button>
        <button type="button" id="cancel-btn">キャンセル</button>
      </div>
    </form>
  `;
  showModal(formHtml);

  const itemListDiv = document.getElementById('item-list');
  function renderItemInputs(items = []) {
    itemListDiv.innerHTML = '';
    items.forEach((it, idx) => addItemInput(it));
  }
  function addItemInput(item = { name: '', count: '', image_url: '' }) {
    const div = document.createElement('div');
    div.className = 'item-entry';
    div.innerHTML = `
      <input type="text" placeholder="アイテム名" value="${item.name || ''}" required maxlength="25">
      <input type="number" placeholder="個数" min="1" value="${item.count || ''}" required style="width:58px;">
      <input type="url" placeholder="画像URL" value="${item.image_url || ''}" style="width:210px;">
      <img class="item-img-preview" src="${item.image_url || ''}" onerror="this.src=''" ${item.image_url ? '' : 'style="display:none"'} >
      <button type="button" class="item-remove-btn" title="削除">✕</button>
    `;
    const imgInput = div.querySelector('input[type="url"]');
    const imgPrev = div.querySelector('.item-img-preview');
    imgInput.addEventListener('input', e => {
      imgPrev.src = imgInput.value;
      imgPrev.style.display = imgInput.value ? "" : "none";
    });
    div.querySelector('.item-remove-btn').onclick = () => { div.remove(); };
    itemListDiv.appendChild(div);
  }
  document.getElementById('add-item-btn').onclick = () => addItemInput();
  renderItemInputs(box.items);

  const saleSelect = document.querySelector('select[name="is_sale"]');
  const saleDetail = document.getElementById('sale-detail');
  saleSelect.onchange = () => { saleDetail.style.display = saleSelect.value === 'yes' ? '' : 'none'; };

  document.getElementById('today-btn').onclick = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    document.querySelector('input[name="record_date"]').value = `${y}-${m}-${d}`;
  };

  document.getElementById('reset-btn').onclick = (e) => { e.preventDefault(); openFormModal(isEdit ? idx : null); };
  document.getElementById('cancel-btn').onclick = (e) => { e.preventDefault(); closeModal(); };

  document.getElementById('box-form').onsubmit = function(e) {
    e.preventDefault();
    const itemRows = itemListDiv.querySelectorAll('.item-entry');
    const items = [];
    for (const row of itemRows) {
      const [nameI, countI, urlI] = row.querySelectorAll('input');
      if (!nameI.value.trim() || !countI.value) return notify("アイテム名・個数を全て入力してください");
      items.push({
        name: nameI.value.trim(),
        count: Number(countI.value),
        image_url: urlI.value.trim()
      });
    }
    if (items.length === 0) return notify("アイテムを1つ以上入力してください");
    const poke_coins = this.elements['poke_coins'].value ? Number(this.elements['poke_coins'].value) : null;
    const yen = this.elements['yen'].value ? Number(this.elements['yen'].value) : null;
    let sale = { is_sale: false, percent_off: null, original_price: null };
    if (saleSelect.value === 'yes') {
      sale.is_sale = true;
      sale.percent_off = Number(this.elements['percent_off'].value) || null;
      sale.original_price = Number(this.elements['original_price'].value) || null;
    }
    const data = {
      id: isEdit ? boxList[idx].id : (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
      name: this.elements['name'].value.trim(),
      price: { poke_coins, yen },
      items,
      record_date: this.elements['record_date'].value,
      event: this.elements['event'].value.trim(),
      sale,
      limit: this.elements['limit'].value,
      place: this.elements['place'].value,
      note: this.elements['note'].value.trim()
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
    closeModal();
    renderDefaultContent();
  };
}

function updateItemList() {
  uniqueItems = new Set();
  boxList.forEach(box => {
    if (box.items && Array.isArray(box.items)) {
      box.items.forEach(item => {
        const name = (item.name || "").trim();
        if (name) uniqueItems.add(name);
      });
    }
  });
}

showItemListBtn.onclick = () => {
  updateItemList();
  if (!uniqueItems.size) {
    itemlistBody.innerHTML = '<div style="color:#888; margin:1em 0;">まだアイテムが登録されていません</div>';
  } else {
    let html = '<ul>';
    Array.from(uniqueItems).sort((a, b) => a.localeCompare(b, 'ja')).forEach(name => {
      html += `<li>${name}</li>`;
    });
    html += '</ul>';
    itemlistBody.innerHTML = html;
  }
  itemlistModal.classList.add('active');
};
itemlistModalClose.onclick = () => itemlistModal.classList.remove('active');
itemlistModal.onclick = e => { if (e.target === itemlistModal) itemlistModal.classList.remove('active'); };

helpBtn.onclick = () => helpModal.classList.add('active');
helpModalClose.onclick = () => helpModal.classList.remove('active');
helpModal.onclick = e => { if (e.target === helpModal) helpModal.classList.remove('active'); };

function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(boxList)); }
function loadLocal() {
  const d = localStorage.getItem(STORAGE_KEY);
  if (d) { try { boxList = JSON.parse(d) || []; } catch (e) { boxList = []; } }
}

window.onload = () => {
  loadLocal();
  updateItemList();
  renderBoxList();
  renderDefaultContent();
};

// --- JSON出力 ---
jsonExport.onclick = () => {
  const data = JSON.stringify(boxList, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "pokemongo_boxlist.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 250);
};

// --- JSON読込 ---
jsonImportBtn.onclick = () => jsonImport.click();
jsonImport.onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        boxList = data;
        saveLocal();
        updateItemList();
        renderBoxList();
        renderDefaultContent();
        notify("読込完了！");
      } else {
        alert("フォーマットが違います");
      }
    } catch (err) {
      alert("JSONファイルが不正です");
    }
    jsonImport.value = "";
  };
  reader.readAsText(file);
};