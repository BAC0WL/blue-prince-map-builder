const grid = document.getElementById("grid");

const ROWS = 9;
const COLS = 5;

const ROOM_CATEGORIES = {
    "Rooms 001-012": [
        "The Foundation",
        "Entrance Hall",
        "Spare Room",
        "Rotunda",
        "Parlor",
        "Billiard Room",
        "Gallery",
        "Room 8",
        "Closet",
        "Walk-in Closet",
        "Attic",
        "Storeroom",
    ],

    "Rooms 013-024": [
        "Nook",
        "Garage",
        "Music Room",
        "Locker Room",
        "Den",
        "Wine Cellar",
        "Trophy Room",
        "Ballroom",
        "Pantry",
        "Rumpus Room",
        "Vault",
        "Office",
    ],

    "Rooms 025-036": [
        "Drawing Room",
        "Study",
        "Library",
        "Chamber Of Mirrors",
        "The Pool",
        "Drafting Studio",
        "Utility Closet",
        "Boiler Room",
        "Pump Room",
        "Security",
        "Workshop",
        "Laboratory",
    ],

    "Rooms 037-045": [
        "Sauna",
        "Coat Check",
        "Mail Room",
        "Freezer",
        "Dining Room",
        "Observatory",
        "Conference Room",
        "Aquarium",
        "Antechamber",
    ],

    "Bedrooms": [
        "Bedroom",
        "Boudoir",
        "Guest Bedroom",
        "Nursery",
        "Servant's Quarters",
        "Bunk Room",
        "Her Ladyship's Chamber",
        "Master Bedroom",
    ],

    "Hallways": [
        "Hallway",
        "West Wing Hall",
        "East Wing Hall",
        "Corridor",
        "Passageway",
        "Secret Passage",
        "Foyer",
        "Great Hall",
    ],

    "Green Rooms": [
        "Terrace",
        "Patio",
        "Courtyard",
        "Cloister",
        "Veranda",
        "Greenhouse",
        "Morning Room",
        "Secret Garden",
    ],

    "Shops": [
        "Commissary",
        "Kitchen",
        "Locksmith",
        "Showroom",
        "Laundry Room",
        "Bookshop",
        "The Armory",
        "Mount Holly Gift Shop",
    ],

    "Red Rooms": [
        "Lavatory",
        "Chapel",
        "Maid's Chamber",
        "Archives",
        "Gymnasium",
        "Darkroom",
        "Weight Room",
        "Furnace",
    ],

    "Studio Additions": [
        "Dovecote",
        "The Kennel",
        "Clock Tower",
        "Classroom",
        "Solarium",
        "Dormitory",
        "Vestibule",
        "Casino",
    ],

    "Found Floorplans": [
        "Planetarium",
        "Mechanarium",
        "Treasure Trove",
        "Throne Room",
        "Tunnel",
        "Conservatory",
        "Lost & Found",
        "Closed Exhibit",
        "Throne of the Blue Prince"
    ]
};

const SLUG_OVERRIDES = {
    "Mount Holly Gift Shop": "giftshop",
};

const DIRECTIONS = ["n", "e", "s", "w"];

const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" };

const ROTATE_DURATION = 150;

function roomSlug(roomName) {
    return SLUG_OVERRIDES[roomName]
        ?? roomName.toLowerCase().replace(/[\s']/g, "");
}


function imageCandidates(roomName, dir) {
    const slug = roomSlug(roomName);
    const axis = (dir === "n" || dir === "s") ? "ns" : "ew";

    const suffixes = [
        `-${dir}`,
        `-${axis}`,
        "-4",
        "",
        `-${OPPOSITE[dir]}`,
        ...DIRECTIONS.map(d => `-${d}`),
    ];

    return [
        ...new Set(suffixes.map(s => `images/${slug}${s}.png`)),
        "images/Button Not Found.png",
    ];
}

const resolvedImages = new Map();

function resolveRoomImage(roomName, dir) {
    const key = `${roomName}|${dir}`;

    if (!resolvedImages.has(key)) {
        const candidates = imageCandidates(roomName, dir);

        const tryLoad = (i) => new Promise((resolve) => {
            const probe = new Image();
            probe.onload = () => resolve(candidates[i]);
            probe.onerror = () => resolve(
                i + 1 < candidates.length ? tryLoad(i + 1) : candidates[i]
            );
            probe.src = encodeURI(candidates[i]);
        });

        resolvedImages.set(key, tryLoad(0));
    }

    return resolvedImages.get(key);
}

async function setRoomImage(img, roomName, dir) {
    img.src = encodeURI(await resolveRoomImage(roomName, dir));
}

let hoveredCell = null;

for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {

        const cell = document.createElement("div");

        cell.classList.add("cell");

        cell.style.position = "absolute";
        // Percentages so the grid can scale to fit the window
        cell.style.left = `${col * 100 / COLS}%`;
        cell.style.top = `${row * 100 / ROWS}%`;

        cell.style.width = `${100 / COLS}%`;
        cell.style.height = `${100 / ROWS}%`;

        // Drag handling
        cell.addEventListener("dragover", (e) => {
            e.preventDefault();

            cell.classList.add("drop-target");
        });

        cell.addEventListener("dragleave", () => {
            cell.classList.remove("drop-target");
        });

        cell.addEventListener("drop", (e) => {
            e.preventDefault();

            cell.classList.remove("drop-target");

            const roomName = e.dataTransfer.getData("text/plain");

            placeRoom(cell, roomName);
        });

        // Track which slot the keyboard shortcuts act on
        cell.addEventListener("mouseenter", () => {
            hoveredCell = cell;
        });

        cell.addEventListener("mouseleave", () => {
            if (hoveredCell === cell) {
                hoveredCell = null;
            }
        });

        grid.appendChild(cell);
    }
}

function placeRoom(cell, roomName) {

    cell.innerHTML = "";

    const roomTile = document.createElement("div");

    roomTile.classList.add("room-tile");

    roomTile.dataset.room = roomName;
    roomTile.dataset.direction = "n";

    roomTile.innerHTML = `
    <div class="room-art">
      <img alt="${roomName}">
    </div>

    <div class="room-label">
      ${roomName}
    </div>
  `;

    setRoomImage(roomTile.querySelector("img"), roomName, "n");

    cell.appendChild(roomTile);
}

const cells = document.querySelectorAll(".cell");

// Top middle
placeRoom(cells[0 * COLS + 2], "Antechamber");

// Bottom middle
placeRoom(cells[8 * COLS + 2], "Entrance Hall");


const roomList =
    document.getElementById("room-list");

for (const categoryName in ROOM_CATEGORIES) {

    // Section container
    const section =
        document.createElement("div");

    section.classList.add("room-section");

    // Collapsible header
    const header =
        document.createElement("button");

    header.classList.add("section-header");

    header.textContent = `▼ ${categoryName}`;

    // Content container
    const content =
        document.createElement("div");

    content.classList.add("section-content");

    // Create rooms
    ROOM_CATEGORIES[categoryName]
        .forEach(roomName => {

            const room =
                document.createElement("div");

            room.classList.add("room");

            room.draggable = true;

            room.dataset.room = roomName;

            room.innerHTML = `
                <img alt="${roomName}">
            `;

            setRoomImage(room.querySelector("img"), roomName, "n");

            room.addEventListener(
                "dragstart",
                (e) => {

                    e.dataTransfer.setData(
                        "text/plain",
                        roomName
                    );
                }
            );

            content.appendChild(room);
        });

    // Collapse toggle
    header.addEventListener("click", () => {

        content.classList.toggle("collapsed");

        header.textContent =
            content.classList.contains("collapsed")
                ? `► ${categoryName}`
                : `▼ ${categoryName}`;
    });

    section.appendChild(header);

    section.appendChild(content);

    roomList.appendChild(section);
}

const roomSearch =
    document.getElementById("room-search");

roomSearch.addEventListener("input", () => {

    const query =
        roomSearch.value.trim().toLowerCase();

    roomList.classList.toggle("searching", query !== "");

    roomList.querySelectorAll(".room-section")
        .forEach(section => {

            let matches = 0;

            section.querySelectorAll(".room")
                .forEach(room => {

                    const match = room.dataset.room
                        .toLowerCase()
                        .includes(query);

                    room.hidden = !match;

                    if (match) {
                        matches++;
                    }
                });

            section.hidden = matches === 0;
        });
});


function facing(src, dir) {
    return src.match(/-([nesw])\.png$/)?.[1] ?? dir;
}

async function rotateTile(roomTile, step) {

    const roomName = roomTile.dataset.room;


    const northSrc = await resolveRoomImage(roomName, "n");

    if (northSrc.endsWith("-4.png")) {
        return;
    }

    const current =
        DIRECTIONS.indexOf(roomTile.dataset.direction);

    const currentSrc =
        await resolveRoomImage(roomName, DIRECTIONS[current]);


    let next;
    let nextSrc;

    for (let i = 1; i < 4; i++) {
        const dir = DIRECTIONS[(current + step * i + 4) % 4];
        const src = await resolveRoomImage(roomName, dir);

        if (src !== currentSrc) {
            next = dir;
            nextSrc = src;
            break;
        }
    }

    if (!next) {
        return;
    }

    roomTile.dataset.direction = next;


    const turns = (
        DIRECTIONS.indexOf(facing(nextSrc, next))
        - DIRECTIONS.indexOf(facing(currentSrc, DIRECTIONS[current]))
        + 4
    ) % 4;

    const degrees =
        turns === 1 ? 90
            : turns === 2 ? step * 180
                : turns === 3 ? -90
                    : step * 90;

    const art =
        roomTile.querySelector(".room-art");

    const img = art.querySelector("img");

    clearTimeout(roomTile._rotateTimer);

    art.style.transition = "";
    art.style.transform = `rotate(${degrees}deg)`;

    // Once the turn finishes, swap to the variant and reset
    roomTile._rotateTimer = setTimeout(() => {

        art.style.transition = "none";
        img.src = encodeURI(nextSrc);
        art.style.transform = "";

        // Force reflow so the reset doesn't animate
        void art.offsetWidth;

        art.style.transition = "";
    }, ROTATE_DURATION);
}

window.addEventListener("keydown", (e) => {

    if (e.target instanceof HTMLInputElement) {
        return;
    }

    if (!hoveredCell) {
        return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();

        hoveredCell.innerHTML = "";
        return;
    }

    const roomTile =
        hoveredCell.querySelector(".room-tile");

    if (!roomTile) {
        return;
    }

    // ArrowRight cycles n -> e -> s -> w, ArrowLeft the reverse
    if (e.key === "ArrowRight") {
        e.preventDefault();
        rotateTile(roomTile, 1);
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        rotateTile(roomTile, -1);
    }
});