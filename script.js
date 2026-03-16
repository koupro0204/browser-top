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

// Music widget helpers
function extractVideoId(url) {
  try {
    var u = new URL(url);
    return u.searchParams.get('v') || '';
  } catch { return ''; }
}

function ytThumbnailURL(videoId) {
  return 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
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
      addLink.title = group.type === 'music' ? 'Add track' : 'Add link';
      addLink.addEventListener('click', function() {
        addLinkGroupIndex = gi;
        if (group.type === 'music') {
          document.getElementById('input-music-name').value = '';
          document.getElementById('input-music-url').value = '';
          document.getElementById('music-track-preview').innerHTML = '';
          openModal('modal-music-track');
          document.getElementById('input-music-name').focus();
        } else {
          document.getElementById('input-link-name').value = '';
          document.getElementById('input-link-url').value = '';
          document.getElementById('input-link-icon').value = '';
          openModal('modal-link');
          document.getElementById('input-link-name').focus();
        }
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

      // Music widget group
      if (group.type === 'music') {
        section.classList.add('music-group');

        const musicGrid = document.createElement('div');
        musicGrid.className = 'music-grid';
        musicGrid.dataset.gi = gi;

        group.links.forEach(function(track, li) {
          var videoId = extractVideoId(track.url);
          var art = document.createElement('a');
          art.className = 'music-card';
          art.href = track.url;
          art.target = '_blank';
          art.rel = 'noopener noreferrer';
          art.title = track.name;
          art.draggable = true;
          art.dataset.gi = gi;
          art.dataset.li = li;

          // Drag reorder
          art.addEventListener('dragstart', function(e) {
            dragSrcGi = gi;
            dragSrcLi = li;
            art.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
          });
          art.addEventListener('dragend', function() {
            dragSrcGi = null;
            dragSrcLi = null;
            art.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
          });
          art.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            art.classList.add('drag-over');
          });
          art.addEventListener('dragleave', function() { art.classList.remove('drag-over'); });
          art.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            art.classList.remove('drag-over');
            if (dragSrcGi === null) return;
            var targetGi = gi, targetLi = li;
            if (dragSrcGi === targetGi && dragSrcLi === targetLi) return;
            getData(function(d) {
              var item = d[dragSrcGi].links.splice(dragSrcLi, 1)[0];
              d[targetGi].links.splice(targetLi, 0, item);
              saveData(d, render);
            });
          });

          var img = document.createElement('img');
          img.src = track.icon || (videoId ? ytThumbnailURL(videoId) : '');
          img.alt = track.name;

          var del = document.createElement('button');
          del.className = 'music-card-delete';
          del.textContent = '\u00d7';
          del.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            getData(function(d) {
              d[gi].links.splice(li, 1);
              saveData(d, render);
            });
          });

          var nameEl = document.createElement('div');
          nameEl.className = 'music-card-name';
          nameEl.textContent = track.name;

          art.appendChild(img);
          art.appendChild(del);
          art.appendChild(nameEl);
          musicGrid.appendChild(art);
        });

        section.appendChild(musicGrid);
        container.appendChild(section);
        return; // skip normal grid rendering
      }

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
  // Reset type selection
  document.querySelectorAll('.group-type-option').forEach(function(opt) {
    opt.classList.remove('selected');
    opt.querySelector('input').checked = false;
  });
  var normalOpt = document.querySelector('.group-type-option[data-type="normal"]');
  normalOpt.classList.add('selected');
  normalOpt.querySelector('input').checked = true;
  document.getElementById('input-group-name').placeholder = 'My Service';
  openModal('modal-group');
  document.getElementById('input-group-name').focus();
});

// Group type selection
document.querySelectorAll('.group-type-option').forEach(function(opt) {
  opt.addEventListener('click', function() {
    document.querySelectorAll('.group-type-option').forEach(function(o) { o.classList.remove('selected'); });
    opt.classList.add('selected');
    opt.querySelector('input').checked = true;
    var type = opt.getAttribute('data-type');
    document.getElementById('input-group-name').placeholder = type === 'music' ? 'My Playlist' : 'My Service';
  });
});

document.getElementById('btn-save-group').addEventListener('click', function() {
  const name = document.getElementById('input-group-name').value.trim();
  if (!name) return;
  var selectedType = document.querySelector('.group-type-option.selected').getAttribute('data-type');
  getData(function(d) {
    var group = { name: name, links: [] };
    if (selectedType === 'music') group.type = 'music';
    d.push(group);
    saveData(d, function() {
      closeModal('modal-group');
      render();
    });
  });
});

document.getElementById('input-group-name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-group').click(); }
});

// Music track modal
var addMusicGroupIndex = null;

document.getElementById('input-music-url').addEventListener('input', function() {
  var url = this.value.trim();
  var preview = document.getElementById('music-track-preview');
  var videoId = extractVideoId(url);
  if (videoId) {
    preview.innerHTML = '<img src="' + ytThumbnailURL(videoId) + '" alt="preview">';
  } else {
    preview.innerHTML = '';
  }
});

document.getElementById('btn-save-music-track').addEventListener('click', function() {
  var name = document.getElementById('input-music-name').value.trim();
  var url = document.getElementById('input-music-url').value.trim();
  if (!url) return;
  if (!name) {
    var videoId = extractVideoId(url);
    name = videoId || 'Track';
  }
  getData(function(d) {
    var gi = addLinkGroupIndex;
    if (gi !== null && d[gi]) {
      d[gi].links.push({ name: name, url: url });
      saveData(d, function() {
        closeModal('modal-music-track');
        render();
      });
    }
  });
});

document.getElementById('input-music-url').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-save-music-track').click(); }
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

    var isMusic = false;
    if (/^\[music\]/i.test(groupName)) {
      isMusic = true;
      groupName = groupName.replace(/^\[music\]/i, '').trim();
    }

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

    var group = { name: groupName, links: links };
    if (isMusic) group.type = 'music';
    groups.push(group);
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
      text += (g.type === 'music' ? '[music]' : '') + g.name + '\n';
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

  // GA4 config
  var clientId = document.getElementById('input-ga4-client-id').value.trim();
  var clientSecret = document.getElementById('input-ga4-client-secret').value.trim();
  var autoRefresh = document.getElementById('input-ga4-auto-refresh').checked;
  var propRows = document.getElementById('ga4-property-list').querySelectorAll('.ga4-property-row');
  var properties = [];
  propRows.forEach(function(row) {
    var name = row.querySelector('.ga4-prop-name').value.trim();
    var id = row.querySelector('.ga4-prop-id').value.trim();
    if (name && id) properties.push({ name: name, propertyId: id });
  });

  saveFaviconMap(map, function() {
    saveGA4Config({ clientId: clientId, clientSecret: clientSecret, properties: properties, autoRefresh: autoRefresh }, function() {
      saveGA4Cache({}, function() {
        closeModal('modal-settings');
        render();
        renderGA4Dashboard();
      });
    });
  });
});

render();

// ========================================
// GA4 Analytics
// ========================================

// GA4 Storage
function getGA4Config(callback) {
  var defaultConfig = { clientId: '', clientSecret: '', properties: [], autoRefresh: true };
  function decryptAndReturn(config) {
    if (!config) { callback(defaultConfig); return; }
    if (config.encryptedSecret) {
      ga4DecryptToken(config.encryptedSecret, function(decrypted) {
        config.clientSecret = (decrypted && decrypted.secret) || '';
        delete config.encryptedSecret;
        callback(config);
      });
    } else {
      config.clientSecret = config.clientSecret || '';
      callback(config);
    }
  }
  if (isExtension) {
    chrome.storage.local.get('browser-top-ga4-config', function(result) {
      decryptAndReturn(result['browser-top-ga4-config'] || null);
    });
  } else {
    try {
      decryptAndReturn(JSON.parse(localStorage.getItem('browser-top-ga4-config')) || null);
    } catch { callback(defaultConfig); }
  }
}

function saveGA4Config(config, callback) {
  if (config.clientSecret) {
    ga4EncryptToken({ secret: config.clientSecret }, function(encrypted) {
      var toSave = Object.assign({}, config, { clientSecret: undefined, encryptedSecret: encrypted });
      delete toSave.clientSecret;
      if (isExtension) {
        chrome.storage.local.set({ 'browser-top-ga4-config': toSave }, callback);
      } else {
        localStorage.setItem('browser-top-ga4-config', JSON.stringify(toSave));
        if (callback) callback();
      }
    });
  } else {
    if (isExtension) {
      chrome.storage.local.set({ 'browser-top-ga4-config': config }, callback);
    } else {
      localStorage.setItem('browser-top-ga4-config', JSON.stringify(config));
      if (callback) callback();
    }
  }
}

// Token encryption with AES-GCM (Web Crypto API)
function ga4GetEncryptionKey(callback) {
  var storageKey = 'browser-top-ga4-ek';
  function load(cb) {
    if (isExtension) {
      chrome.storage.local.get(storageKey, function(r) { cb(r[storageKey] || null); });
    } else {
      try { cb(JSON.parse(localStorage.getItem(storageKey)) || null); } catch { cb(null); }
    }
  }
  function save(exported, cb) {
    if (isExtension) {
      var obj = {}; obj[storageKey] = exported;
      chrome.storage.local.set(obj, cb);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(exported));
      if (cb) cb();
    }
  }
  load(function(exported) {
    if (exported) {
      crypto.subtle.importKey('jwk', exported, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
        .then(function(key) { callback(key); })
        .catch(function() {
          // Corrupted key, regenerate
          generateAndSave(callback);
        });
    } else {
      generateAndSave(callback);
    }
  });
  function generateAndSave(cb) {
    crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
      .then(function(key) {
        return crypto.subtle.exportKey('jwk', key).then(function(exported) {
          save(exported, function() { cb(key); });
        });
      });
  }
}

function ga4EncryptToken(tokenData, callback) {
  ga4GetEncryptionKey(function(key) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encoded = new TextEncoder().encode(JSON.stringify(tokenData));
    crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded)
      .then(function(encrypted) {
        var result = {
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encrypted))
        };
        callback(result);
      });
  });
}

function ga4DecryptToken(encryptedData, callback) {
  if (!encryptedData || !encryptedData.iv || !encryptedData.data) {
    callback(null);
    return;
  }
  ga4GetEncryptionKey(function(key) {
    var iv = new Uint8Array(encryptedData.iv);
    var data = new Uint8Array(encryptedData.data);
    crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data)
      .then(function(decrypted) {
        var json = new TextDecoder().decode(decrypted);
        callback(JSON.parse(json));
      })
      .catch(function() {
        callback(null);
      });
  });
}

function getGA4Token(callback) {
  var storageKey = 'browser-top-ga4-token';
  function load(cb) {
    if (isExtension) {
      chrome.storage.local.get(storageKey, function(r) { cb(r[storageKey] || null); });
    } else {
      try { cb(JSON.parse(localStorage.getItem(storageKey)) || null); } catch { cb(null); }
    }
  }
  load(function(encrypted) {
    if (!encrypted) { callback(null); return; }
    ga4DecryptToken(encrypted, callback);
  });
}

function saveGA4Token(token, callback) {
  var storageKey = 'browser-top-ga4-token';
  ga4EncryptToken(token, function(encrypted) {
    if (isExtension) {
      var obj = {}; obj[storageKey] = encrypted;
      chrome.storage.local.set(obj, callback);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(encrypted));
      if (callback) callback();
    }
  });
}

function getGA4Cache(callback) {
  if (isExtension) {
    chrome.storage.local.get('browser-top-ga4-cache', function(result) {
      callback(result['browser-top-ga4-cache'] || {});
    });
  } else {
    try {
      callback(JSON.parse(localStorage.getItem('browser-top-ga4-cache')) || {});
    } catch { callback({}); }
  }
}

function saveGA4Cache(cache, callback) {
  if (isExtension) {
    chrome.storage.local.set({ 'browser-top-ga4-cache': cache }, callback);
  } else {
    localStorage.setItem('browser-top-ga4-cache', JSON.stringify(cache));
    if (callback) callback();
  }
}

// GA4 OAuth2 (Authorization Code Flow + PKCE)
function ga4GenerateCodeVerifier() {
  var array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ga4GenerateCodeChallenge(verifier) {
  var encoded = new TextEncoder().encode(verifier);
  return crypto.subtle.digest('SHA-256', encoded).then(function(hash) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  });
}

function ga4ExchangeCodeForTokens(code, clientId, clientSecret, codeVerifier, redirectURI, callback) {
  var params = {
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
    redirect_uri: redirectURI,
    grant_type: 'authorization_code'
  };
  var body = new URLSearchParams(params);
  fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.access_token) {
      console.log('[GA4 Auth] Token exchange success');
      var tokenData = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000
      };
      callback(tokenData);
    } else {
      console.error('[GA4 Auth] Token exchange failed:', data.error, data.error_description);
      alert('Token exchange error: ' + (data.error_description || data.error || 'Unknown'));
      callback(null);
    }
  })
  .catch(function(err) {
    console.error('[GA4 Auth] Token exchange network error:', err);
    alert('Network error during token exchange');
    callback(null);
  });
}

function ga4RefreshAccessToken(clientId, clientSecret, refreshToken, callback) {
  var body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.access_token) {
      var tokenData = {
        accessToken: data.access_token,
        refreshToken: refreshToken,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000
      };
      callback(tokenData);
    } else {
      callback(null);
    }
  })
  .catch(function() { callback(null); });
}

function ga4Authenticate(clientId, clientSecret, callback) {
  if (!isExtension || !chrome.identity) {
    alert('OAuth authentication requires the Chrome extension environment.');
    callback(null);
    return;
  }
  if (!clientSecret) {
    alert('OAuth2 Client Secret を入力してください');
    callback(null);
    return;
  }
  var codeVerifier = ga4GenerateCodeVerifier();
  ga4GenerateCodeChallenge(codeVerifier).then(function(codeChallenge) {
    var redirectURL = chrome.identity.getRedirectURL();
    var authURL = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + encodeURIComponent(clientId) +
      '&response_type=code' +
      '&redirect_uri=' + encodeURIComponent(redirectURL) +
      '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/analytics.readonly') +
      '&code_challenge=' + encodeURIComponent(codeChallenge) +
      '&code_challenge_method=S256' +
      '&access_type=offline' +
      '&prompt=consent';

    chrome.identity.launchWebAuthFlow({ url: authURL, interactive: true }, function(responseUrl) {
      if (chrome.runtime.lastError) {
        console.error('[GA4 Auth] launchWebAuthFlow error:', chrome.runtime.lastError.message);
        alert('Auth error: ' + chrome.runtime.lastError.message);
        callback(null);
        return;
      }
      if (!responseUrl) {
        console.error('[GA4 Auth] No response URL');
        callback(null);
        return;
      }
      console.log('[GA4 Auth] Response URL received');
      var url = new URL(responseUrl);
      var code = url.searchParams.get('code');
      var error = url.searchParams.get('error');
      if (error) {
        console.error('[GA4 Auth] Auth error:', error);
        alert('Google auth error: ' + error);
        callback(null);
        return;
      }
      if (!code) {
        console.error('[GA4 Auth] No code in response');
        callback(null);
        return;
      }
      console.log('[GA4 Auth] Code received, exchanging for tokens...');
      ga4ExchangeCodeForTokens(code, clientId, clientSecret, codeVerifier, redirectURL, function(tokenData) {
        if (tokenData) {
          saveGA4Token(tokenData, function() {
            callback(tokenData);
          });
        } else {
          callback(null);
        }
      });
    });
  });
}

function ga4GetValidToken(callback) {
  getGA4Token(function(token) {
    if (token && token.expiresAt > Date.now() + 60000) {
      callback(token);
    } else if (token && token.refreshToken) {
      // Use refresh token to get a new access token
      getGA4Config(function(config) {
        if (!config.clientId || !config.clientSecret) { callback(null); return; }
        ga4RefreshAccessToken(config.clientId, config.clientSecret, token.refreshToken, function(newToken) {
          if (newToken) {
            saveGA4Token(newToken, function() {
              callback(newToken);
            });
          } else {
            callback(null);
          }
        });
      });
    } else {
      callback(null);
    }
  });
}

// GA4 Data API
function ga4FetchPropertyData(token, propertyId, callback) {
  var today = new Date();
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  var sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  var fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  var eightDaysAgo = new Date(today);
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var metrics = [
    { name: 'activeUsers' },
    { name: 'eventCount' },
    { name: 'keyEvents' },
    { name: 'newUsers' }
  ];
  var dimensions = [{ name: 'date' }];
  var orderBys = [{ dimension: { dimensionName: 'date' }, desc: false }];

  var currentBody = {
    dateRanges: [{ startDate: fmt(sevenDaysAgo), endDate: fmt(yesterday) }],
    metrics: metrics, dimensions: dimensions, orderBys: orderBys
  };
  var previousBody = {
    dateRanges: [{ startDate: fmt(fourteenDaysAgo), endDate: fmt(eightDaysAgo) }],
    metrics: metrics, dimensions: dimensions, orderBys: orderBys
  };

  var apiUrl = 'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport';
  var headers = {
    'Authorization': 'Bearer ' + token.accessToken,
    'Content-Type': 'application/json'
  };

  Promise.all([
    fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(currentBody) }),
    fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(previousBody) })
  ])
  .then(function(responses) {
    var res = responses[0];
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (res.status === 403) throw new Error('NO_ACCESS');
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error('API_ERROR');
    return Promise.all(responses.map(function(r) { return r.json(); }));
  })
  .then(function(results) {
    var result = parseGA4Response(results[0], results[1]);
    callback(null, result);
  })
  .catch(function(err) {
    callback(err.message || 'UNKNOWN_ERROR', null);
  });
}

function parseGA4Response(currentData, previousData) {
  var metricNames = ['activeUsers', 'eventCount', 'keyEvents', 'newUsers'];
  var current = { daily: {}, totals: {} };
  var previous = { daily: {}, totals: {} };

  metricNames.forEach(function(m) {
    current.daily[m] = [];
    current.totals[m] = 0;
    previous.daily[m] = [];
    previous.totals[m] = 0;
  });

  function parseRows(data) {
    if (!data || !data.rows) return [];
    var rows = [];
    data.rows.forEach(function(row) {
      var dateStr = row.dimensionValues[0].value;
      var metrics = {};
      metricNames.forEach(function(m, i) {
        metrics[m] = parseInt(row.metricValues[i].value, 10) || 0;
      });
      rows.push({ date: dateStr, metrics: metrics });
    });
    rows.sort(function(a, b) { return a.date.localeCompare(b.date); });
    return rows;
  }

  var currentRows = parseRows(currentData);
  var previousRows = parseRows(previousData);

  // Date labels for chart (M/D format)
  var dateLabels = currentRows.map(function(r) {
    var m = parseInt(r.date.substring(4, 6), 10);
    var d = parseInt(r.date.substring(6, 8), 10);
    return m + '/' + d;
  });

  metricNames.forEach(function(m) {
    current.daily[m] = currentRows.map(function(r) { return r.metrics[m]; });
    current.totals[m] = currentRows.reduce(function(sum, r) { return sum + r.metrics[m]; }, 0);
    previous.daily[m] = previousRows.map(function(r) { return r.metrics[m]; });
    previous.totals[m] = previousRows.reduce(function(sum, r) { return sum + r.metrics[m]; }, 0);
  });

  return { current: current, previous: previous, dateLabels: dateLabels };
}

// GA4 Chart Drawing
function ga4DrawChart(canvas, currentData, previousData, dateLabels) {
  var dpr = window.devicePixelRatio || 1;
  var cssW = canvas.clientWidth;
  var cssH = canvas.clientHeight;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  var w = cssW;
  var h = cssH;
  var padTop = 18;
  var padBottom = 20;
  var padLeft = 32;
  var padRight = 8;
  var plotW = w - padLeft - padRight;
  var plotH = h - padTop - padBottom;

  ctx.clearRect(0, 0, w, h);

  if (!currentData || currentData.length === 0) return;

  var allValues = currentData.concat(previousData || []);
  var max = Math.max.apply(null, allValues);
  var min = Math.min.apply(null, allValues);
  if (max === min) { max += 1; min = Math.max(0, min - 1); }
  var range = max - min;

  function yPos(val) {
    return padTop + plotH - ((val - min) / range) * plotH;
  }
  function xPos(i, len) {
    if (len <= 1) return padLeft + plotW / 2;
    return padLeft + (i / (len - 1)) * plotW;
  }

  // Grid lines and Y-axis labels
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  var ySteps = 3;
  for (var s = 0; s <= ySteps; s++) {
    var val = min + (range * s / ySteps);
    var y = yPos(val);
    // Grid line
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
    // Label
    ctx.fillStyle = '#555';
    ctx.setLineDash([]);
    ctx.fillText(Math.round(val), padLeft - 6, y);
  }

  // X-axis date labels
  if (dateLabels && dateLabels.length > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#555';
    ctx.font = '10px system-ui, sans-serif';
    dateLabels.forEach(function(label, i) {
      var px = xPos(i, dateLabels.length);
      ctx.fillText(label, px, h - padBottom + 6);
    });
  }

  // Draw previous period (dashed)
  if (previousData && previousData.length > 0) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(74, 159, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    previousData.forEach(function(v, i) {
      var px = xPos(i, previousData.length);
      var py = yPos(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Draw current period (solid)
  ctx.beginPath();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#4a9fff';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  currentData.forEach(function(v, i) {
    var px = xPos(i, currentData.length);
    var py = yPos(v);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Dots on current
  currentData.forEach(function(v, i) {
    ctx.beginPath();
    ctx.arc(xPos(i, currentData.length), yPos(v), 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4a9fff';
    ctx.fill();
  });
}

// GA4 Dashboard Rendering
var ga4MetricLabels = {
  activeUsers: 'アクティブユーザー',
  eventCount: 'イベント数',
  keyEvents: 'キーイベント',
  newUsers: '新規ユーザー数'
};

function formatNumber(n) {
  return new Intl.NumberFormat('ja-JP').format(n);
}

function formatChange(current, previous) {
  if (previous === 0 && current === 0) return { text: '-', cls: 'flat' };
  if (previous === 0) return { text: '+' + formatNumber(current), cls: 'up' };
  var pct = ((current - previous) / previous) * 100;
  var sign = pct >= 0 ? '+' : '';
  var cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return { text: sign + pct.toFixed(1) + '%', cls: cls };
}

function formatTime(ts) {
  var d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function renderGA4Dashboard(forceRefresh) {
  var dashboard = document.getElementById('ga4-dashboard');

  getGA4Config(function(config) {
    if (!config.properties || config.properties.length === 0) {
      dashboard.innerHTML = '';
      return;
    }

    // Build header
    dashboard.innerHTML = '';
    var header = document.createElement('div');
    header.className = 'ga4-header';

    var title = document.createElement('span');
    title.className = 'ga4-section-title';
    title.textContent = 'Analytics';
    header.appendChild(title);

    var lastUpdated = document.createElement('span');
    lastUpdated.className = 'ga4-last-updated';
    lastUpdated.id = 'ga4-last-updated';
    header.appendChild(lastUpdated);

    var refreshBtn = document.createElement('button');
    refreshBtn.className = 'ga4-refresh-btn';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.addEventListener('click', function() {
      renderGA4Dashboard(true);
    });
    header.appendChild(refreshBtn);

    dashboard.appendChild(header);

    var container = document.createElement('div');
    container.className = 'ga4-properties';
    dashboard.appendChild(container);

    // Create cards for each property
    config.properties.forEach(function(prop) {
      var card = document.createElement('div');
      card.className = 'ga4-property-card';
      card.id = 'ga4-card-' + prop.propertyId;

      var nameEl = document.createElement('div');
      nameEl.className = 'ga4-property-name';
      nameEl.textContent = prop.name;
      card.appendChild(nameEl);

      var loading = document.createElement('div');
      loading.className = 'ga4-card-loading';
      loading.textContent = 'Loading...';
      card.appendChild(loading);

      container.appendChild(card);
    });

    // Check token and fetch data
    ga4GetValidToken(function(token) {
      if (!token) {
        config.properties.forEach(function(prop) {
          var card = document.getElementById('ga4-card-' + prop.propertyId);
          if (card) {
            var loadingEl = card.querySelector('.ga4-card-loading');
            if (loadingEl) {
              loadingEl.textContent = 'Settings から Google アカウントを接続してください';
              loadingEl.className = 'ga4-message';
            }
          }
        });
        return;
      }

      // Load cache first, then fetch if needed
      getGA4Cache(function(cache) {
        var cacheTTL = 5 * 60 * 1000; // 5 minutes
        var needFetch = [];
        var latestFetchedAt = 0;

        config.properties.forEach(function(prop) {
          var cached = cache[prop.propertyId];
          if (!forceRefresh && cached && (Date.now() - cached.fetchedAt) < cacheTTL) {
            renderGA4Card(prop, cached.data);
            if (cached.fetchedAt > latestFetchedAt) latestFetchedAt = cached.fetchedAt;
          } else if (!forceRefresh && !config.autoRefresh && cached) {
            renderGA4Card(prop, cached.data);
            if (cached.fetchedAt > latestFetchedAt) latestFetchedAt = cached.fetchedAt;
          } else if (!forceRefresh && !config.autoRefresh && !cached) {
            var card = document.getElementById('ga4-card-' + prop.propertyId);
            if (card) {
              var loadingEl = card.querySelector('.ga4-card-loading');
              if (loadingEl) {
                loadingEl.textContent = 'Refresh を押してデータを取得';
                loadingEl.className = 'ga4-message';
              }
            }
          } else {
            needFetch.push(prop);
          }
        });

        if (latestFetchedAt > 0) {
          document.getElementById('ga4-last-updated').textContent = 'Last: ' + formatTime(latestFetchedAt);
        }

        if (needFetch.length === 0) return;

        refreshBtn.classList.add('loading');
        refreshBtn.textContent = 'Loading...';
        var done = 0;
        var updatedCache = Object.assign({}, cache);

        needFetch.forEach(function(prop) {
          ga4FetchPropertyData(token, prop.propertyId, function(err, data) {
            done++;
            var card = document.getElementById('ga4-card-' + prop.propertyId);
            if (err) {
              if (card) {
                var msg = 'データ取得エラー';
                if (err === 'TOKEN_EXPIRED') msg = '再認証が必要です（Settings から再接続）';
                else if (err === 'NO_ACCESS') msg = 'アクセス権限がありません: ' + prop.propertyId;
                else if (err === 'RATE_LIMIT') msg = 'API 制限に達しました';
                var stale = cache[prop.propertyId];
                if (stale) {
                  renderGA4Card(prop, stale.data);
                } else {
                  var loadingEl = card.querySelector('.ga4-card-loading');
                  if (loadingEl) {
                    loadingEl.textContent = msg;
                    loadingEl.className = 'ga4-card-error';
                  }
                }
              }
            } else {
              updatedCache[prop.propertyId] = { fetchedAt: Date.now(), data: data };
              renderGA4Card(prop, data);
            }

            if (done === needFetch.length) {
              saveGA4Cache(updatedCache, function() {
                refreshBtn.classList.remove('loading');
                refreshBtn.textContent = 'Refresh';
                var maxTime = 0;
                config.properties.forEach(function(p) {
                  var c = updatedCache[p.propertyId];
                  if (c && c.fetchedAt > maxTime) maxTime = c.fetchedAt;
                });
                if (maxTime > 0) {
                  document.getElementById('ga4-last-updated').textContent = 'Last: ' + formatTime(maxTime);
                }
              });
            }
          });
        });
      });
    });
  });
}

function renderGA4Card(prop, data) {
  var card = document.getElementById('ga4-card-' + prop.propertyId);
  if (!card) return;

  card.innerHTML = '';

  var nameRow = document.createElement('div');
  nameRow.className = 'ga4-property-header';

  var nameEl = document.createElement('div');
  nameEl.className = 'ga4-property-name';
  nameEl.textContent = prop.name;
  nameRow.appendChild(nameEl);

  var reportLink = document.createElement('a');
  reportLink.className = 'ga4-report-link';
  reportLink.href = 'https://analytics.google.com/analytics/web/#/p' + prop.propertyId + '/reports/reportinghub';
  reportLink.target = '_blank';
  reportLink.rel = 'noopener noreferrer';
  reportLink.title = 'GA4 レポートを開く';
  reportLink.textContent = 'Report';
  nameRow.appendChild(reportLink);

  card.appendChild(nameRow);

  var metricsEl = document.createElement('div');
  metricsEl.className = 'ga4-metrics';

  var metricNames = ['activeUsers', 'eventCount', 'keyEvents', 'newUsers'];
  metricNames.forEach(function(m) {
    var cell = document.createElement('div');

    var label = document.createElement('div');
    label.className = 'ga4-metric-label';
    label.textContent = ga4MetricLabels[m];
    cell.appendChild(label);

    var value = document.createElement('div');
    value.className = 'ga4-metric-value';
    value.textContent = formatNumber(data.current.totals[m]);
    cell.appendChild(value);

    var change = formatChange(data.current.totals[m], data.previous.totals[m]);
    var changeEl = document.createElement('div');
    changeEl.className = 'ga4-metric-change ' + change.cls;
    changeEl.textContent = change.text;
    cell.appendChild(changeEl);

    metricsEl.appendChild(cell);
  });
  card.appendChild(metricsEl);

  // Chart - activeUsers line chart
  var canvas = document.createElement('canvas');
  canvas.className = 'ga4-chart';
  card.appendChild(canvas);

  requestAnimationFrame(function() {
    ga4DrawChart(canvas, data.current.daily.activeUsers, data.previous.daily.activeUsers, data.dateLabels);
  });
}

// GA4 Settings UI
function createGA4PropertyRow(name, propertyId) {
  var row = document.createElement('div');
  row.className = 'ga4-property-row';
  var nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Service Name';
  nameInput.value = name || '';
  nameInput.className = 'ga4-prop-name';
  var idInput = document.createElement('input');
  idInput.type = 'text';
  idInput.placeholder = 'Property ID (e.g. 123456789)';
  idInput.value = propertyId || '';
  idInput.className = 'ga4-prop-id';
  var delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'ga4-prop-delete';
  delBtn.textContent = '\u00d7';
  delBtn.addEventListener('click', function() { row.remove(); });
  row.appendChild(nameInput);
  row.appendChild(idInput);
  row.appendChild(delBtn);
  return row;
}

function updateGA4AuthStatus() {
  var statusEl = document.getElementById('ga4-auth-status');
  var authBtn = document.getElementById('btn-ga4-auth');
  var googleIcon = '<svg width="16" height="16" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:6px;">' +
    '<path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.35 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    '</svg>';
  getGA4Token(function(token) {
    if (token && token.refreshToken) {
      statusEl.textContent = 'Connected (auto-refresh enabled)';
      statusEl.className = 'connected';
      authBtn.innerHTML = googleIcon + 'Reconnect Google Account';
      authBtn.classList.add('connected');
    } else if (token && token.expiresAt > Date.now()) {
      statusEl.textContent = 'Connected (expires ' + formatTime(token.expiresAt) + ')';
      statusEl.className = 'connected';
      authBtn.innerHTML = googleIcon + 'Reconnect Google Account';
      authBtn.classList.add('connected');
    } else {
      statusEl.textContent = 'Not connected';
      statusEl.className = 'disconnected';
      authBtn.innerHTML = googleIcon + 'Connect Google Account';
      authBtn.classList.remove('connected');
    }
  });
}

// Load GA4 config when settings modal opens
document.getElementById('btn-settings').addEventListener('click', function() {
  getGA4Config(function(config) {
    document.getElementById('input-ga4-client-id').value = config.clientId || '';
    document.getElementById('input-ga4-client-secret').value = config.clientSecret || '';
    document.getElementById('input-ga4-auto-refresh').checked = config.autoRefresh !== false;
    var list = document.getElementById('ga4-property-list');
    list.innerHTML = '';
    if (config.properties && config.properties.length > 0) {
      config.properties.forEach(function(prop) {
        list.appendChild(createGA4PropertyRow(prop.name, prop.propertyId));
      });
    } else {
      list.appendChild(createGA4PropertyRow('', ''));
    }
    updateGA4AuthStatus();
  });
});

document.getElementById('btn-add-ga4-property').addEventListener('click', function() {
  document.getElementById('ga4-property-list').appendChild(createGA4PropertyRow('', ''));
});

document.getElementById('btn-ga4-auth').addEventListener('click', function() {
  var clientId = document.getElementById('input-ga4-client-id').value.trim();
  var clientSecret = document.getElementById('input-ga4-client-secret').value.trim();
  if (!clientId) {
    alert('OAuth2 Client ID を先に入力してください');
    return;
  }
  if (!clientSecret) {
    alert('OAuth2 Client Secret を先に入力してください');
    return;
  }
  ga4Authenticate(clientId, clientSecret, function(token) {
    if (token) {
      updateGA4AuthStatus();
    } else {
      alert('認証に失敗しました');
    }
  });
});

// Initial GA4 render
renderGA4Dashboard();
