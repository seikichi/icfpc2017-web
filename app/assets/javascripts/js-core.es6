/* Globals */
/* Graph style */

// https://en.wikipedia.org/wiki/Help:Distinguishable_colors
const originalEdgeColor = '#009';
const selfColor = '#94FFB5';

const punterColors = [
  // '#FFFFFF',
  '#F0A3FF',
  // '#0075DC',
  '#993F00',
  '#4C005C',
  // '#191919',
  '#005C31',
  '#2BCE48',
  '#FFCC99',
  '#808080',
  '#8F7C00',
  '#9DCC00',
  '#C20088',
  // '#003380',
  '#FFA405',
  '#FFA8BB',
  '#426600',
  '#FF0010',
  '#5EF1F2',
  '#00998F',
  '#E0FF66',
  '#740AFF',
  '#990000',
  // '#FFFF80',
  '#FFFF00',
  '#FF5005',
];

const graphStyle = [
  {
    "selector": "node",
    "style": {
      "background-color": "white",
      "border-color": "black",
      "width": 20,
      "height": 20,
      "min-zoomed-font-size": 12,
      "color": "#fff",
      "font-size": 16,
      "z-index": 2
    }
  },

  {
    "selector": ".mine",
    "style": {
      "background-color": "red",
      "border-color": "white",
      "width": 120,
      "height": 120,
      "color": "#000",
      "font-size": 72,
      "font-weight": "bold",
      "z-index": 9999,
      "text-valign": "center",
      "text-halign": "center",
      "content": "λ"
      }
  },

  { "selector": ".plain:selected",
    "style": {
    "height": 40,
    "width": 40,
    "content": "data(id)",
    "font-size": 140,
    "border-color": "#000",
    "border-width": "1px",
    "text-outline-color": "#000",
    "text-outline-width": "1px",
    "z-index": 9999
    }
  },

  { "selector": "edge",
    "style": {
      "min-zoomed-font-size": 1,
      "font-size": 64,
      "color": "#FFF",
      "line-color": "#009",
      "width": 35,
      "z-index" : 1,
      "curve-style": "haystack",
      "haystack-radius": 0
      }
  },

  { "selector": "edge:selected",
    "style": {
      "min-zoomed-font-size": 1,
      "font-size": 4,
      "color": "#fff",
      "line-color": "yellow",
      "width": 35
      }
  },


  {"selector": "core",
    "style": {
    "active-bg-color": "#fff",
    "active-bg-opacity": 0.333
    }
  }
];

// Set of nodes which are mines
const mineSet = new Set();

// edgeToID[source][target] === edgeID
const riverToEdgeID = {};

// ID Sources
let highestNodeID = 0;
let highestEdgeID = 0;

// Key state
let shiftPressed = false;
let altPressed = false;

function getFreshNodeID() {
  highestNodeID++;
  return highestNodeID;
}

function getFreshEdgeID() {
  highestEdgeID++;
  return "e" + highestEdgeID;
}

function initCy( expJson, after ){
  mineSet.clear();
  const loading = document.getElementById('loading');
  const elements = window.elements = importJSON(expJson);

  loading.classList.add('loaded');

  const cy = window.cy = cytoscape({
    container: document.getElementById('cy'),
    layout: { name: 'preset' },
    style: graphStyle,
    elements: elements,
    motionBlur: true,
    selectionType: 'single',
    boxSelectionEnabled: false
  });

  cy.ready(function(evt) { activateMines(); after() });
}

function loadGraph(graphJSON, activateBindings) {
  //cy.remove("");
  const toImport = importJSON(graphJSON);
  cy.add(toImport);
  activateMines();
  activateBindings();
  cy.resize();
}


/* JSON IMPORT */

// Our JSON -> Cyto JSON
function importJSON(ourJSON) {
  highestNodeID = 0;
  highestEdgeID = 0;

  if (ourJSON.sites == undefined || ourJSON.rivers == undefined) {
    return;
  }

  const scale = findScaleFactor(ourJSON) * (Math.log(ourJSON.sites.length) / 1.5 );
  //console.log("Scale factor: " + scale);
  const elements = [];

  // Firstly, mark all "mine" nodes as mines within their data
  if ("mines" in ourJSON && ourJSON.mines != null) {
    for (let i = 0; i < ourJSON.mines.length; i++) {
      const mineID = ourJSON.mines[i];
      //console.log("Adding " + mineID + " to mineSet");
      mineSet.add(mineID.toString());
    }
  }

  // Add all nodes
  for (let i = 0; i < ourJSON.sites.length; i++) {
    const curNode = ourJSON.sites[i];
    if (curNode.id > highestNodeID) {
      highestNodeID = curNode.id;
    }

    const entry = {group: "nodes"};

    if (!mineSet.has(curNode.id.toString())) {
      entry["classes"] = "plain";
    }

    entry["data"] = {
      "id": curNode.id.toString(),
      "x": curNode.x * scale,
      "y" : curNode.y * scale,
      "selected": false,
    };

    const position = { "x": curNode.x * scale, "y": curNode.y * scale};
    entry["position"] = position;
    elements.push(entry);
  }

  for (let i = 0; i < ourJSON.rivers.length; i++) {
    const id = getFreshEdgeID();
    const curEdge = ourJSON.rivers[i];
    const entry = {group: "edges"};
    let source = curEdge["source"];
    let target = curEdge["target"];
    const data = { "id": id, "source": source.toString(), "target": target.toString()};
    entry["data"] = data;
    entry["selected"] = false;
    entry["classes"] = "top-center";
    elements.push(entry);

    if (source > target) {
      const tmp = source;
      source = target;
      target = tmp;
    }

    if (!riverToEdgeID[source]) {
      riverToEdgeID[source] = {}
    }
    riverToEdgeID[source][target] = id;
  }
  return elements;
}



/* DISPLAY FUNCTIONS */
function findScaleFactor(ourJSON) {
  let maxX = -Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let minY = Infinity;

  for (let i = 0; i < ourJSON.sites.length; i++) {
    const node = ourJSON.sites[i];
    if (Math.abs(node["x"]) > maxX) {
      maxX = node["x"];
    }
    if (Math.abs(node["x"]) < minX) {
      minX = node["x"];
    }
    if (Math.abs(node["y"]) > maxY) {
      maxY = node["y"];
    }
    if (Math.abs(node["y"]) < minY) {
      minY = node["y"];
    }
  }
  //console.log("maxX: " + maxX);
  //console.log("maxY: " + maxY);

  const scaleX = window.innerWidth / (maxX - minX);
  const scaleY = window.innerHeight / (maxY - minY);
  return Math.min(Math.abs(scaleX), Math.abs(scaleY));
}

function activateMines() {
  for (let mineID of mineSet) {
    cy.$id(mineID).addClass("mine");
  }
}

let punterID = -1;
let punterNum = 0;
let moves = [];
let currentTurn = 0;
let gameMap = null;

function getPunterColor(id) {
  if (punterID === id) {
    return selfColor;
  }
  return punterColors[id];
}

function nextTurn() {
  if (currentTurn >= moves.length) {
    return;
  }
  const move = moves[currentTurn];
  console.log(`move: ${JSON.stringify(move)}`);
  if (move.claim) {
    let { punter, source, target } = move.claim;
    if (source > target) {
      [source, target] = [target, source];
    }
    const id = riverToEdgeID[source][target];
    const color = getPunterColor(punter);
    cy.$id(id).css({'line-color': color});
  }
  currentTurn++;
}

function prevTurn() {
  if (currentTurn <= 0) {
    return;
  }
  currentTurn--;

  const move = moves[currentTurn];
  console.log(`unmove: ${JSON.stringify(move)}`);
  if (move.claim) {
    let { punter, source, target } = move.claim;
    if (source > target) {
      [source, target] = [target, source];
    }
    const id = riverToEdgeID[source][target];
    cy.$id(id).css({'line-color': originalEdgeColor});
  }
}

function jumpTurn(to) {
  if (to < 0 || to > moves.length) {
    return;
  }

  if (currentTurn > to) {
    while (currentTurn > to) {
      prevTurn();
    }
  } else {
    while (currentTurn < to) {
      nextTurn();
    }
  }
}

function loadReplayFile(buffer) {
  const jsonl = String.fromCharCode.apply(null, new Uint8Array(buffer));
  const objects = jsonl.split('\n').filter(s => s.length > 0).map(JSON.parse)
  currentTurn = 0;
  punterID = objects[0].punter;
  punterNum = objects[0].punters;
  moves = objects.slice(1);
  gameMap = null;

  const { num_edges, num_nodes } = objects[0];
  const matches = maps.filter(m => m.num_nodes === num_nodes && m.num_edges == num_edges);
  if (matches.length !== 1) {
    alert(`can't specify one map from num of nodes and edges: matched mapps = ${JSON.stringify(matches)}`);
    return;
  }

  selectMap(matches[0].filename);
}

function renderReplayUI() {
  let last = '';
  if (0 < currentTurn && currentTurn <= moves.length) {
    last = JSON.stringify(moves[currentTurn - 1]);
  }

  const node = `
<ul>
  <li>Press Left or Right arrow</li>
  <li>PunterID = ${punterID}, punterNum = ${punterNum}</li>
  <li>Last Move: ${last}</li>
  <li>Score: <span id="score"><button id="score-update">Calc</button></span></li>
</ul>
`;
  $('#replay').children().replaceWith(node);
  $('#score-update').on('click', () => {
    if (!gameMap) {
      gameMap = new GameMap(currentMap);
    }
    const scores = getCurrentScores(gameMap, moves.slice(0, currentTurn), punterNum);
    const message = scores.map((s, i) => `<span style="color: ${getPunterColor(i)}">punter ${i}: ${s}</span>`).join(', ');
    $('#score').replaceWith($(message));
  });
}

function dfs(site, mine, punterId, map, state, visited) {
  visited[site] = true;

  let d = map.dist(mine, site);
  let sum = d * d;

  for (let e of map.graph[site]) {
    if (visited[e.dest]) {
      continue;
    }
    if (state.Claimer(e.id) !== punterId) {
      continue;
    }
    sum += dfs(e.dest, mine, punterId, map, state, visited);
  }
  return sum;
}

function getCurrentScores(map, moves, punters) {
  const state = new MapState();
  for (let move of moves) {
    state.applyMove(map, move);
  }
  const ret = []
  for (let i = 0; i < punters; i++) {
    ret.push(scorePunter(i, map, state))
  }
  return ret;
}

function scoreMine(mine, punterId, map, state) {
  const visited = {};
  return dfs(mine, mine, punterId, map, state, visited);
}

function scorePunter(punterId, map, state) {
  let score = 0;
  for (let site of map.sites) {
    if (!site.isMine) {
      continue;
    }
    score += scoreMine(site.id, punterId, map, state);
  }
  return score;
}

class MapState {
  constructor() {
    this.edgeToPunterId = {};
  }

  Claimer(id) {
    return this.edgeToPunterId[id];
  }

  applyMove(map, move) {
    if (!move.claim) { return; }

    const { source, target, punter } = move.claim;
    let src = map.siteID(source);
    let dest = map.siteID(target);

    for (let e of map.graph[src]) {
      if (e.dest == dest) {
        this.edgeToPunterId[e.id] = punter;
      }
    }
  }
}

class GameMap {
  constructor(map) {
    this.map = map;

    this.siteIDMap = {};
    this.sites = [];
    for (let i = 0; i < this.size(); i++) {
      const originalId = this.map.sites[i].id;
      const isMine = map.mines.includes(originalId);
      this.siteIDMap[originalId] = i;
      this.sites.push({ id: i, originalId, isMine });
    }

    this.graph = new Array(this.size());
    for (let i = 0; i < this.size(); i++) {
      this.graph[i] = [];
    }

    let edgeId = 0;
    for (let {source, target} of this.map.rivers) {
      const src = this.siteID(source);
      const dest = this.siteID(target);
      this.graph[src].push({ id: edgeId, src: src, dest: dest });
      this.graph[dest].push({ id: edgeId, src: dest, dest: src });
      edgeId++;
    }

    this.initDists();
  }

  siteID(originalId) {
    return this.siteIDMap[originalId];
  }

  dist(from, to) {
    return this.dists[from][to];
  }

  size() {
    return this.map.sites.length;
  }

  initDists() {
    this.dists = new Array(this.size());
    for (let i = 0; i < this.size(); i++) {
      this.dists[i] = new Array(this.size()).fill(Infinity);
    }

    for (let i = 0; i < this.size(); i++) {
      this.dists[i][i] = 0;
    }
    for (let edges of this.graph) {
      for (let { src, dest } of edges) {
        console.log(src, dest)
        this.dists[src][dest] = 1;
      }
    }
    for (let k = 0; k < this.size(); k++) {
      for (let i = 0; i < this.size(); i++) {
        for (let j = 0; j < this.size(); j++) {
          this.dists[i][j] = Math.min(this.dists[i][j], this.dists[i][k] + this.dists[k][j]);
        }
      }
    }
  }
}
