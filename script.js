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

function roomSlug(roomName, variant = 0) {
    const slug = SLUG_OVERRIDES[roomName]
        ?? roomName.toLowerCase().replace(/[\s']/g, "");

    // Upgrades live at slug-1, slug-2, ... (e.g. nook-2-e.png)
    return variant > 0 ? `${slug}-${variant}` : slug;
}


function imageCandidates(roomName, dir, variant = 0) {
    const slug = roomSlug(roomName, variant);
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

function resolveRoomImage(roomName, dir, variant = 0) {
    const key = `${roomName}|${variant}|${dir}`;

    if (!resolvedImages.has(key)) {
        const candidates = imageCandidates(roomName, dir, variant);

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

async function setRoomImage(img, roomName, dir, variant = 0) {
    img.src = encodeURI(await resolveRoomImage(roomName, dir, variant));
}

function imageExists(src) {
    return new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve(true);
        probe.onerror = () => resolve(false);
        probe.src = encodeURI(src);
    });
}

// Upgrade variants a room has, found by probing slug-1, slug-2, ...
// until one is missing. Immovable upgrades use the -4 suffix.
const roomVariants = new Map();

function findVariants(roomName) {
    if (!roomVariants.has(roomName)) {
        roomVariants.set(roomName, (async () => {
            const variants = [];

            for (let v = 1; ; v++) {
                const slug = roomSlug(roomName, v);

                const found = await Promise.all(
                    ["n", "e", "4"].map(s => imageExists(`images/${slug}-${s}.png`))
                );

                if (!found.includes(true)) {
                    return variants;
                }

                variants.push(v);
            }
        })());
    }

    return roomVariants.get(roomName);
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

            const variant = Number(
                e.dataTransfer.getData("application/x-room-variant")
            ) || 0;

            placeRoom(cell, roomName, variant);

            closeVariantPicker();
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

function placeRoom(cell, roomName, variant = 0) {

    cell.innerHTML = "";

    const roomTile = document.createElement("div");

    roomTile.classList.add("room-tile");

    roomTile.dataset.room = roomName;
    roomTile.dataset.variant = variant;
    roomTile.dataset.direction = "n";

    roomTile.innerHTML = `
    <div class="room-art">
      <img alt="${roomName}">
    </div>

    <div class="room-label">
      ${roomName}
    </div>
  `;

    setRoomImage(roomTile.querySelector("img"), roomName, "n", variant);

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

            findVariants(roomName).then(variants => {
                if (variants.length === 0) {
                    return;
                }

                const more = document.createElement("button");

                more.classList.add("variant-button");
                more.textContent = "+";
                more.title = "Show upgrades";
                more.draggable = false;

                more.addEventListener("click", (e) => {
                    e.stopPropagation();
                    toggleVariantPicker(room, roomName, variants);
                });

                room.appendChild(more);
            });

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

// Floating popover listing a room's base art and upgrades.
// Fixed-positioned on the body so it never shifts the sidebar.
let variantPicker = null;

// Rooms with many upgrades lay them out in a grid; others are one column
const PICKER_COLUMNS = {
    "Cloister": 2,
    "Spare Room": 3,
};

function closeVariantPicker() {
    variantPicker?.remove();
    variantPicker = null;
}

function toggleVariantPicker(room, roomName, variants) {

    if (variantPicker?.dataset.room === roomName) {
        closeVariantPicker();
        return;
    }

    closeVariantPicker();

    variantPicker = document.createElement("div");

    variantPicker.classList.add("variant-picker");
    variantPicker.dataset.room = roomName;

    variantPicker.style.setProperty(
        "--columns", PICKER_COLUMNS[roomName] ?? 1
    );

    variants.forEach(variant => {

        const option = document.createElement("div");

        option.classList.add("variant-option");
        option.draggable = true;

        option.innerHTML = `<img alt="${roomName} +${variant}">`;

        setRoomImage(option.querySelector("img"), roomName, "n", variant);

        option.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", roomName);
            e.dataTransfer.setData("application/x-room-variant", String(variant));
        });

        variantPicker.appendChild(option);
    });

    document.body.appendChild(variantPicker);

    // Sit just below the room, flipping above it if there's no space
    const rect = room.getBoundingClientRect();
    const pickerRect = variantPicker.getBoundingClientRect();

    const left = Math.min(
        rect.left,
        window.innerWidth - pickerRect.width - 8
    );

    const top = rect.bottom + 6 + pickerRect.height > window.innerHeight
        ? rect.top - 6 - pickerRect.height
        : rect.bottom + 6;

    variantPicker.style.left = `${Math.max(8, left)}px`;
    variantPicker.style.top = `${Math.max(8, top)}px`;
}

document.addEventListener("click", (e) => {
    if (variantPicker && !variantPicker.contains(e.target)) {
        closeVariantPicker();
    }
});

document.querySelector(".sidebar")
    .addEventListener("scroll", closeVariantPicker);

window.addEventListener("resize", closeVariantPicker);

const roomSearch =
    document.getElementById("room-search");

roomSearch.addEventListener("input", () => {

    closeVariantPicker();

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

    const variant = Number(roomTile.dataset.variant) || 0;

    const northSrc = await resolveRoomImage(roomName, "n", variant);

    if (northSrc.endsWith("-4.png")) {
        return;
    }

    const current =
        DIRECTIONS.indexOf(roomTile.dataset.direction);

    const currentSrc =
        await resolveRoomImage(roomName, DIRECTIONS[current], variant);


    let next;
    let nextSrc;

    for (let i = 1; i < 4; i++) {
        const dir = DIRECTIONS[(current + step * i + 4) % 4];
        const src = await resolveRoomImage(roomName, dir, variant);

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

    if (e.key === "Escape") {
        closeVariantPicker();
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
