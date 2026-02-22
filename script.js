// Clock
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('time').textContent = h + ':' + m;
  const opts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('date').textContent = now.toLocaleDateString('ja-JP', opts);
}
updateClock();
setInterval(updateClock, 1000);

// Data: [{ name: "Group", links: [{ name, url }] }]
function getData() {
  try {
    return JSON.parse(localStorage.getItem('browser-top-data')) || [];
  } catch { return []; }
}

function saveData(data) {
  localStorage.setItem('browser-top-data', JSON.stringify(data));
}

function faviconURL(url) {
  try {
    const host = new URL(url).hostname;
    return 'https://www.google.com/s2/favicons?domain=' + host + '&sz=64';
  } catch { return ''; }
}

function hostFromURL(url) {
  try { return new URL(url).hostname; }
  catch { return url; }
}

// Render
let addLinkGroupIndex = null;
let editLinkGroupIndex = null;
let editLinkIndex = null;
let editGroupIndex = null;

function render() {
  const container = document.getElementById('content');
  container.innerHTML = '';
  const data = getData();

  data.forEach(function(group, gi) {
    const section = document.createElement('div');
    section.className = 'group';

    const header = document.createElement('div');
    header.className = 'group-header';

    const title = document.createElement('div');
    title.className = 'group-name';
    title.textContent = group.name;

    const editGroup = document.createElement('button');
    editGroup.className = 'group-edit';
    editGroup.textContent = '\u270e';
    editGroup.title = 'Rename group';
    editGroup.addEventListener('click', function() {
      editGroupIndex = gi;
      document.getElementById('input-edit-group-name').value = group.name;
      openModal('modal-edit-group');
      document.getElementById('input-edit-group-name').focus();
      document.getElementById('input-edit-group-name').select();
    });

    const delGroup = document.createElement('button');
    delGroup.className = 'group-delete';
    delGroup.textContent = '\u00d7 delete';
    delGroup.addEventListener('click', function() {
      if (!confirm('Delete group "' + group.name + '" and all its links?')) return;
      const d = getData();
      d.splice(gi, 1);
      saveData(d);
      render();
    });

    header.appendChild(title);
    header.appendChild(editGroup);
    header.appendChild(delGroup);
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'group-grid';

    group.links.forEach(function(link, li) {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = link.url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '\u00d7';
      del.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const d = getData();
        d[gi].links.splice(li, 1);
        saveData(d);
        render();
      });

      const img = document.createElement('img');
      img.src = faviconURL(link.url);
      img.alt = '';

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = link.name;

      const urlEl = document.createElement('div');
      urlEl.className = 'url-text';
      urlEl.textContent = hostFromURL(link.url);

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = '\u270e';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        editLinkGroupIndex = gi;
        editLinkIndex = li;
        document.getElementById('input-edit-link-name').value = link.name;
        document.getElementById('input-edit-link-url').value = link.url;
        openModal('modal-edit-link');
        document.getElementById('input-edit-link-name').focus();
        document.getElementById('input-edit-link-name').select();
      });

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(urlEl);
      card.appendChild(editBtn);
      card.appendChild(del);
      grid.appendChild(card);
    });

    // Add link button per group
    const addBtn = document.createElement('div');
    addBtn.className = 'card-add-link';
    addBtn.innerHTML = '<span>+</span>';
    addBtn.addEventListener('click', function() {
      addLinkGroupIndex = gi;
      document.getElementById('input-link-name').value = '';
      document.getElementById('input-link-url').value = '';
      openModal('modal-link');
      document.getElementById('input-link-name').focus();
    });
    grid.appendChild(addBtn);

    section.appendChild(grid);
    container.appendChild(section);
  });
}

// Modals
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

document.querySelectorAll('.btn-cancel').forEach(function(btn) {
  btn.addEventListener('click', function() {
    closeModal(btn.getAttribute('data-close'));
  });
});

document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Save link
document.getElementById('btn-save-link').addEventListener('click', function() {
  const name = document.getElementById('input-link-name').value.trim();
  let url = document.getElementById('input-link-url').value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const d = getData();
  if (addLinkGroupIndex !== null && d[addLinkGroupIndex]) {
    d[addLinkGroupIndex].links.push({ name: name || hostFromURL(url), url: url });
    saveData(d);
    closeModal('modal-link');
    render();
  }
});

document.getElementById('input-link-url').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-link').click(); }
});

// Save group
document.getElementById('btn-add-group').addEventListener('click', function() {
  document.getElementById('input-group-name').value = '';
  openModal('modal-group');
  document.getElementById('input-group-name').focus();
});

document.getElementById('btn-save-group').addEventListener('click', function() {
  const name = document.getElementById('input-group-name').value.trim();
  if (!name) return;
  const d = getData();
  d.push({ name: name, links: [] });
  saveData(d);
  closeModal('modal-group');
  render();
});

document.getElementById('input-group-name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-group').click(); }
});

// Save edit link
document.getElementById('btn-save-edit-link').addEventListener('click', function() {
  const name = document.getElementById('input-edit-link-name').value.trim();
  let url = document.getElementById('input-edit-link-url').value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const d = getData();
  if (editLinkGroupIndex !== null && editLinkIndex !== null && d[editLinkGroupIndex] && d[editLinkGroupIndex].links[editLinkIndex]) {
    d[editLinkGroupIndex].links[editLinkIndex].name = name;
    d[editLinkGroupIndex].links[editLinkIndex].url = url;
    saveData(d);
    closeModal('modal-edit-link');
    render();
  }
});

document.getElementById('input-edit-link-url').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-edit-link').click(); }
});

// Save edit group
document.getElementById('btn-save-edit-group').addEventListener('click', function() {
  const name = document.getElementById('input-edit-group-name').value.trim();
  if (!name) return;
  const d = getData();
  if (editGroupIndex !== null && d[editGroupIndex]) {
    d[editGroupIndex].name = name;
    saveData(d);
    closeModal('modal-edit-group');
    render();
  }
});

document.getElementById('input-edit-group-name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-edit-group').click(); }
});

// Import
document.getElementById('btn-import').addEventListener('click', function() {
  document.getElementById('input-import').value = '';
  openModal('modal-import');
  document.getElementById('input-import').focus();
});

function parseImportText(text) {
  const groups = [];
  const blocks = text.split(/\n\s*\n/);

  blocks.forEach(function(block) {
    const lines = block.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
    if (lines.length === 0) return;

    var groupName = lines[0];
    if (/^https?:\/\//i.test(groupName)) return;

    var links = [];
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i];
      // "表示名,URL" format
      var commaIdx = line.indexOf(',http');
      if (commaIdx !== -1) {
        var n = line.substring(0, commaIdx).trim();
        var u = line.substring(commaIdx + 1).trim();
        links.push({ name: n || hostFromURL(u), url: u });
      } else if (/^https?:\/\//i.test(line)) {
        links.push({ name: hostFromURL(line), url: line });
      }
    }

    groups.push({ name: groupName, links: links });
  });

  return groups;
}

document.getElementById('btn-do-import').addEventListener('click', function() {
  const text = document.getElementById('input-import').value.trim();
  if (!text) return;
  const imported = parseImportText(text);
  if (imported.length === 0) return;
  const d = getData();
  imported.forEach(function(g) { d.push(g); });
  saveData(d);
  closeModal('modal-import');
  render();
});

// Export
document.getElementById('btn-export').addEventListener('click', function() {
  const d = getData();
  let text = '';
  d.forEach(function(g, i) {
    text += g.name + '\n';
    g.links.forEach(function(l) {
      text += l.name + ',' + l.url + '\n';
    });
    if (i < d.length - 1) text += '\n';
  });
  navigator.clipboard.writeText(text).then(function() {
    alert('Copied to clipboard!');
  }).catch(function() {
    prompt('Copy the text below:', text);
  });
});

render();
