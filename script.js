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

// Storage: chrome.storage.local (extension) or localStorage (fallback)
const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

function getData(callback) {
  if (isExtension) {
    chrome.storage.local.get('browser-top-data', function(result) {
      callback(result['browser-top-data'] || []);
    });
  } else {
    try {
      callback(JSON.parse(localStorage.getItem('browser-top-data')) || []);
    } catch { callback([]); }
  }
}

function saveData(data, callback) {
  if (isExtension) {
    chrome.storage.local.set({ 'browser-top-data': data }, callback);
  } else {
    localStorage.setItem('browser-top-data', JSON.stringify(data));
    if (callback) callback();
  }
}

function getFaviconMap(callback) {
  if (isExtension) {
    chrome.storage.local.get('browser-top-favicon-map', function(result) {
      callback(result['browser-top-favicon-map'] || {});
    });
  } else {
    try {
      callback(JSON.parse(localStorage.getItem('browser-top-favicon-map')) || {});
    } catch { callback({}); }
  }
}

function saveFaviconMap(map, callback) {
  if (isExtension) {
    chrome.storage.local.set({ 'browser-top-favicon-map': map }, callback);
  } else {
    localStorage.setItem('browser-top-favicon-map', JSON.stringify(map));
    if (callback) callback();
  }
}

function faviconURL(url) {
  try {
    const origin = new URL(url).origin;
    return 'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=' + encodeURIComponent(origin) + '&size=64';
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

// Drag state for reordering
let dragSrcGi = null;
let dragSrcLi = null;
let dragSrcGroupIdx = null;

function render() {
  getData(function(data) {
    getFaviconMap(function(faviconMap) {
    const container = document.getElementById('content');
    container.innerHTML = '';

    data.forEach(function(group, gi) {
      const section = document.createElement('div');
      section.className = 'group';

      const header = document.createElement('div');
      header.className = 'group-header';

      const title = document.createElement('div');
      title.className = 'group-name';
      title.textContent = group.name;

      // #5: Add link button in header
      const addLink = document.createElement('button');
      addLink.className = 'group-add';
      addLink.textContent = '+';
      addLink.title = 'Add link';
      addLink.addEventListener('click', function() {
        addLinkGroupIndex = gi;
        document.getElementById('input-link-name').value = '';
        document.getElementById('input-link-url').value = '';
        document.getElementById('input-link-icon').value = '';
        openModal('modal-link');
        document.getElementById('input-link-name').focus();
      });

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
      delGroup.textContent = '\u00d7';
      delGroup.title = 'Delete group';
      delGroup.addEventListener('click', function() {
        if (!confirm('Delete group "' + group.name + '" and all its links?')) return;
        getData(function(d) {
          d.splice(gi, 1);
          saveData(d, render);
        });
      });

      // Group drag handle
      title.draggable = true;
      title.style.cursor = 'grab';
      title.addEventListener('dragstart', function(e) {
        dragSrcGroupIdx = gi;
        section.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      });
      title.addEventListener('dragend', function() {
        dragSrcGroupIdx = null;
        section.classList.remove('dragging');
        document.querySelectorAll('.group.drag-over-group-reorder').forEach(function(el) {
          el.classList.remove('drag-over-group-reorder');
        });
      });

      section.addEventListener('dragover', function(e) {
        if (dragSrcGroupIdx === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        section.classList.add('drag-over-group-reorder');
      });
      section.addEventListener('dragleave', function(e) {
        if (!section.contains(e.relatedTarget)) {
          section.classList.remove('drag-over-group-reorder');
        }
      });
      section.addEventListener('drop', function(e) {
        if (dragSrcGroupIdx === null) return;
        e.preventDefault();
        e.stopPropagation();
        section.classList.remove('drag-over-group-reorder');
        if (dragSrcGroupIdx === gi) return;
        getData(function(d) {
          var item = d.splice(dragSrcGroupIdx, 1)[0];
          d.splice(gi, 0, item);
          saveData(d, render);
        });
      });

      const actions = document.createElement('div');
      actions.className = 'group-actions';
      actions.appendChild(addLink);
      actions.appendChild(editGroup);
      actions.appendChild(delGroup);
      header.appendChild(actions);
      header.appendChild(title);
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'group-grid';
      grid.dataset.gi = gi;

      // #4: Drop zone for external links (per group)
      grid.addEventListener('dragover', function(e) {
        // Only handle external drops (not internal reorder)
        if (dragSrcGi !== null) return;
        e.preventDefault();
        grid.classList.add('drag-over-group');
      });
      grid.addEventListener('dragleave', function(e) {
        if (!grid.contains(e.relatedTarget)) {
          grid.classList.remove('drag-over-group');
        }
      });
      grid.addEventListener('drop', function(e) {
        grid.classList.remove('drag-over-group');
        if (dragSrcGi !== null) return; // internal reorder handled by card
        e.preventDefault();
        var url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
        url = url.trim().split('\n')[0].trim();
        if (!/^https?:\/\//i.test(url)) return;
        getData(function(d) {
          d[gi].links.push({ name: hostFromURL(url), url: url });
          saveData(d, render);
        });
      });

      group.links.forEach(function(link, li) {
        const card = document.createElement('a');
        card.className = 'card';
        card.href = link.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.draggable = true;
        card.dataset.gi = gi;
        card.dataset.li = li;

        // #2: Drag and drop reorder
        card.addEventListener('dragstart', function(e) {
          dragSrcGi = gi;
          dragSrcLi = li;
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', '');
        });
        card.addEventListener('dragend', function() {
          dragSrcGi = null;
          dragSrcLi = null;
          card.classList.remove('dragging');
          document.querySelectorAll('.drag-over').forEach(function(el) {
            el.classList.remove('drag-over');
          });
        });
        card.addEventListener('dragover', function(e) {
          e.preventDefault();
          if (dragSrcGi !== null) {
            e.dataTransfer.dropEffect = 'move';
          } else {
            e.dataTransfer.dropEffect = 'copy';
          }
          card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', function() {
          card.classList.remove('drag-over');
        });
        card.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          card.classList.remove('drag-over');
          // External drop (e.g. from bookmark bar)
          if (dragSrcGi === null) {
            var url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
            url = url.trim().split('\n')[0].trim();
            if (!/^https?:\/\//i.test(url)) return;
            getData(function(d) {
              d[gi].links.push({ name: hostFromURL(url), url: url });
              saveData(d, render);
            });
            return;
          }
          // Internal reorder
          var targetGi = gi;
          var targetLi = li;
          if (dragSrcGi === targetGi && dragSrcLi === targetLi) return;
          getData(function(d) {
            var item = d[dragSrcGi].links.splice(dragSrcLi, 1)[0];
            d[targetGi].links.splice(targetLi, 0, item);
            saveData(d, render);
          });
        });

        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.textContent = '\u00d7';
        del.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          getData(function(d) {
            d[gi].links.splice(li, 1);
            saveData(d, render);
          });
        });

        const img = document.createElement('img');
        var hostname = hostFromURL(link.url);
        img.src = link.icon || faviconMap[hostname] || faviconURL(link.url);
        img.alt = '';

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = link.name;

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
          document.getElementById('input-edit-link-icon').value = link.icon || '';
          openModal('modal-edit-link');
          document.getElementById('input-edit-link-name').focus();
          document.getElementById('input-edit-link-name').select();
        });

        card.appendChild(del);
        card.appendChild(editBtn);
        card.appendChild(img);
        card.appendChild(name);
        grid.appendChild(card);
      });

      // #4: Drop zone message when group is empty
      if (group.links.length === 0) {
        var dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.textContent = 'Drop link here';
        dropZone.addEventListener('dragover', function(e) {
          e.preventDefault();
          dropZone.classList.add('drag-hover');
        });
        dropZone.addEventListener('dragleave', function() {
          dropZone.classList.remove('drag-hover');
        });
        dropZone.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('drag-hover');
          var url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
          url = url.trim().split('\n')[0].trim();
          if (!/^https?:\/\//i.test(url)) return;
          getData(function(d) {
            d[gi].links.push({ name: hostFromURL(url), url: url });
            saveData(d, render);
          });
        });
        grid.appendChild(dropZone);
      }

      section.appendChild(grid);
      container.appendChild(section);
    });
    }); // end getFaviconMap
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
  const icon = document.getElementById('input-link-icon').value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  getData(function(d) {
    if (addLinkGroupIndex !== null && d[addLinkGroupIndex]) {
      var linkObj = { name: name || hostFromURL(url), url: url };
      if (icon) linkObj.icon = icon;
      d[addLinkGroupIndex].links.push(linkObj);
      saveData(d, function() {
        closeModal('modal-link');
        render();
      });
    }
  });
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
  getData(function(d) {
    d.push({ name: name, links: [] });
    saveData(d, function() {
      closeModal('modal-group');
      render();
    });
  });
});

document.getElementById('input-group-name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-group').click(); }
});

// Save edit link
document.getElementById('btn-save-edit-link').addEventListener('click', function() {
  const name = document.getElementById('input-edit-link-name').value.trim();
  let url = document.getElementById('input-edit-link-url').value.trim();
  const icon = document.getElementById('input-edit-link-icon').value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  getData(function(d) {
    if (editLinkGroupIndex !== null && editLinkIndex !== null && d[editLinkGroupIndex] && d[editLinkGroupIndex].links[editLinkIndex]) {
      d[editLinkGroupIndex].links[editLinkIndex].name = name;
      d[editLinkGroupIndex].links[editLinkIndex].url = url;
      if (icon) d[editLinkGroupIndex].links[editLinkIndex].icon = icon;
      else delete d[editLinkGroupIndex].links[editLinkIndex].icon;
      saveData(d, function() {
        closeModal('modal-edit-link');
        render();
      });
    }
  });
});

document.getElementById('input-edit-link-url').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-edit-link').click(); }
});

// Save edit group
document.getElementById('btn-save-edit-group').addEventListener('click', function() {
  const name = document.getElementById('input-edit-group-name').value.trim();
  if (!name) return;
  getData(function(d) {
    if (editGroupIndex !== null && d[editGroupIndex]) {
      d[editGroupIndex].name = name;
      saveData(d, function() {
        closeModal('modal-edit-group');
        render();
      });
    }
  });
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

// #3: Merge imported groups with existing ones by name
document.getElementById('btn-do-import').addEventListener('click', function() {
  const text = document.getElementById('input-import').value.trim();
  if (!text) return;
  const imported = parseImportText(text);
  if (imported.length === 0) return;
  getData(function(d) {
    imported.forEach(function(g) {
      var existing = null;
      for (var i = 0; i < d.length; i++) {
        if (d[i].name === g.name) { existing = d[i]; break; }
      }
      if (existing) {
        g.links.forEach(function(l) { existing.links.push(l); });
      } else {
        d.push(g);
      }
    });
    saveData(d, function() {
      closeModal('modal-import');
      render();
    });
  });
});

// Export
document.getElementById('btn-export').addEventListener('click', function() {
  getData(function(d) {
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
});

// Settings (Favicon Map)
function createFaviconRow(host, url) {
  var row = document.createElement('div');
  row.className = 'favicon-row';
  var hostInput = document.createElement('input');
  hostInput.type = 'text';
  hostInput.placeholder = 'ads.google.com';
  hostInput.value = host || '';
  hostInput.className = 'favicon-row-host';
  var urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.placeholder = 'https://example.com/favicon.ico';
  urlInput.value = url || '';
  urlInput.className = 'favicon-row-url';
  var delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'favicon-row-delete';
  delBtn.textContent = '\u00d7';
  delBtn.addEventListener('click', function() { row.remove(); });
  row.appendChild(hostInput);
  row.appendChild(urlInput);
  row.appendChild(delBtn);
  return row;
}

document.getElementById('btn-settings').addEventListener('click', function() {
  var list = document.getElementById('favicon-map-list');
  list.innerHTML = '';
  getFaviconMap(function(map) {
    var keys = Object.keys(map);
    if (keys.length === 0) {
      list.appendChild(createFaviconRow('', ''));
    } else {
      keys.forEach(function(host) {
        list.appendChild(createFaviconRow(host, map[host]));
      });
    }
    openModal('modal-settings');
  });
});

document.getElementById('btn-add-favicon-row').addEventListener('click', function() {
  document.getElementById('favicon-map-list').appendChild(createFaviconRow('', ''));
});

document.getElementById('btn-save-settings').addEventListener('click', function() {
  var rows = document.getElementById('favicon-map-list').querySelectorAll('.favicon-row');
  var map = {};
  rows.forEach(function(row) {
    var host = row.querySelector('.favicon-row-host').value.trim();
    var url = row.querySelector('.favicon-row-url').value.trim();
    if (host && url) map[host] = url;
  });
  saveFaviconMap(map, function() {
    closeModal('modal-settings');
    render();
  });
});

render();
