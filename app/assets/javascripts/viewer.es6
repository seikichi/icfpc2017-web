function loadMapList(showFirst) {
  fetch("maps.json", {mode: "no-cors"})
  .then(function(res) {
    return res.json() })
  .then(function(json) {
    const select_elem = $("#maps-select");
    const maps = window.maps = json.maps;

    for (let i = 0; i < maps.length; i++) {
      const map = maps[i];
      const opt = new Option(map.name + " (" + map.num_nodes + " sites and " + map.num_edges + " rivers )", map.filename);
      select_elem.append(opt);
    }

    select_elem.change(function(evt) {
      const item = select_elem.find(":selected");
      //alert("selected " + item.text() + ", val: " + item.val());
      selectMap(item.val());
    } );

    if (showFirst) {
      selectMap(maps[0].filename);
    }
  });

}

function selectMap(url) {
  fetch(url, {mode: "no-cors"})
  .then(function(res) {
    return res.json()
  }).then(function(json) {
    window.currentMap = json;

    if (cy.elements !== undefined) {
      cy.destroy();
    }
    initCy(json, function () {
      cy.autolock(true)
      cy.edges().on("select", function(evt) { cy.edges().unselect() } );
    } );
  });

  $("#download-link").attr("href", url);
}


$(function(){
  const matches = /map=([^&#=]*)/.exec(window.location.search);
  if (matches !== null && matches !== undefined) {
    const param1 = matches[1];
    loadMapList(false);
    selectMap(param1);
  } else {
    loadMapList(true);
  }
})

$(function () {
  const dropzone = $('#drop-zone');
  dropzone.on('dragover', function (jqEvent) {
    var event = jqEvent.originalEvent;
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  dropzone.on('drop', function (jqEvent) {
    const event = jqEvent.originalEvent;
    event.stopPropagation();
    event.preventDefault();
    const files = event.dataTransfer.files
    if (files.length === 0) { return; }
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (function (theFile) {
      return function (e) {
        loadReplayFile(e.target.result);
        renderReplayUI();
      };
    })(file);
    reader.readAsArrayBuffer(file);
  });
});

$(() => {
  $(document).on('keydown', (e) => {
    if (e.keyCode === 39) {
      nextTurn();
      renderReplayUI();
    } else if (e.keyCode === 37) {
      prevTurn();
      renderReplayUI();
    }
  });
});
